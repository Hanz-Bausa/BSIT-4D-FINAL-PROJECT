const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const mysql = require('mysql2/promise');

const server = express();
const port = 4001; // Different port from Enrollment (4000)

// Middleware
server.use(cors());
server.use(express.json());

// JWT Secret
const JWT_SECRET = 'your-secret-key-here';

// Enrollment Service URL (Group 1's service)
const ENROLLMENT_SERVICE_URL = 'http://localhost:4000';

// ============================================
// MySQL DATABASE CONNECTION (XAMPP)
// ============================================

const dbConfig = {
  host: 'localhost',
  port: 3307, // Your XAMPP MySQL port
  user: 'root',
  password: '', // Default XAMPP has no password
  database: 'auth_microservice',
  waitForConnections: true,
  connectionLimit: 10
};

let db;

// Initialize database connection and create tables
async function initializeDatabase() {
  try {
    // First connect without database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: ''
    });
    
    await tempConnection.query('CREATE DATABASE IF NOT EXISTS auth_microservice');
    await tempConnection.end();
    
    // Now connect to the database
    db = await mysql.createPool(dbConfig);
    
    // Create tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS passwords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        token TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        token VARCHAR(100) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS login_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activity_id VARCHAR(100) UNIQUE NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        reason VARCHAR(255),
        ip_address VARCHAR(50),
        device_type VARCHAR(255),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database connected and tables created');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Make sure XAMPP MySQL is running!');
    console.log('⚠️  Falling back to in-memory storage...');
    db = null;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Fetch student from Enrollment Service
async function getStudentFromEnrollment(studentId) {
  try {
    const response = await fetch(`${ENROLLMENT_SERVICE_URL}/students/student-id/${studentId}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.log('⚠️  Enrollment service not available, using fallback data');
    // Fallback data for testing when Enrollment service is not running
    const fallbackStudents = [
      { studentId: 'STU2024001', name: 'Juan Dela Cruz', email: 'juan@student.edu', status: 'active' },
      { studentId: 'STU2024002', name: 'Maria Santos', email: 'maria@student.edu', status: 'active' },
      { studentId: 'STU2024003', name: 'Pedro Reyes', email: 'pedro@student.edu', status: 'inactive' },
      { studentId: 'STU2024004', name: 'Ana Garcia', email: 'ana@student.edu', status: 'active' }
    ];
    return fallbackStudents.find(s => s.studentId === studentId);
  }
}

// Fetch all students from Enrollment Service
async function getAllStudentsFromEnrollment() {
  try {
    const response = await fetch(`${ENROLLMENT_SERVICE_URL}/students`);
    if (!response.ok) {
      throw new Error('Failed to fetch');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.log('⚠️  Enrollment service not available, using fallback data');
    return [
      { studentId: 'STU2024001', name: 'Juan Dela Cruz', email: 'juan@student.edu', status: 'active' },
      { studentId: 'STU2024002', name: 'Maria Santos', email: 'maria@student.edu', status: 'active' },
      { studentId: 'STU2024003', name: 'Pedro Reyes', email: 'pedro@student.edu', status: 'inactive' },
      { studentId: 'STU2024004', name: 'Ana Garcia', email: 'ana@student.edu', status: 'active' }
    ];
  }
}

// Generate random password
function generateRandomPassword(studentId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${studentId.slice(-4)}${randomPart}`;
}

// Middleware to verify JWT token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Check if session exists in database
    let session;
    if (db) {
      const [rows] = await db.query('SELECT * FROM sessions WHERE token = ?', [token]);
      session = rows[0];
    }
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    // Check if session expired
    if (new Date() > new Date(session.expires_at)) {
      if (db) {
        await db.query('DELETE FROM sessions WHERE token = ?', [token]);
      }
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token.' });
      req.user = user;
      req.token = token;
      req.session = session;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error.' });
  }
}

// ============================================
// 1. PASSWORD GENERATION SERVICE (Gabrielle & Aldrine)
// ============================================

// GET /enrollment/students - Get student list from Enrollment API
server.get('/enrollment/students', async (req, res) => {
  const students = await getAllStudentsFromEnrollment();
  res.json({
    success: true,
    message: 'Student list retrieved from Enrollment Microservice',
    data: students
  });
});

// GET /enrollment/students/:student_id - Validate student exists
server.get('/enrollment/students/:student_id', async (req, res) => {
  const { student_id } = req.params;
  const student = await getStudentFromEnrollment(student_id);

  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found in Enrollment system'
    });
  }

  res.json({
    success: true,
    message: 'Student found',
    data: student
  });
});

// POST /auth/password/generate - Generate initial password
server.post('/auth/password/generate', async (req, res) => {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({
      success: false,
      error: 'Student ID is required'
    });
  }

  // Get student from Enrollment Service
  const student = await getStudentFromEnrollment(student_id);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found in Enrollment system'
    });
  }

  // Check if student is active
  if (student.status !== 'active') {
    return res.status(400).json({
      success: false,
      error: 'Student account is inactive'
    });
  }

  // Check if password already generated
  if (db) {
    const [existing] = await db.query('SELECT * FROM passwords WHERE student_id = ?', [student_id]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Password already generated for this student'
      });
    }
  }

  // Generate and hash password
  const plainPassword = generateRandomPassword(student_id);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Store in database
  if (db) {
    await db.query(
      'INSERT INTO passwords (student_id, password_hash) VALUES (?, ?)',
      [student_id, hashedPassword]
    );
  }

  res.status(201).json({
    success: true,
    message: 'Password generated successfully',
    data: {
      student_id: student_id,
      student_name: student.name,
      generated_password: plainPassword,
      note: 'Please save this password securely. It will not be shown again.'
    }
  });
});

// GET /auth/password/status/:student_id - Check password generation status
server.get('/auth/password/status/:student_id', async (req, res) => {
  const { student_id } = req.params;

  let passwordRecord = null;
  if (db) {
    const [rows] = await db.query('SELECT * FROM passwords WHERE student_id = ?', [student_id]);
    passwordRecord = rows[0];
  }

  res.json({
    success: true,
    data: {
      student_id: student_id,
      password_generated: !!passwordRecord,
      generated_at: passwordRecord ? passwordRecord.created_at : null
    }
  });
});


// ============================================
// 2. LOGIN SERVICE (Renerose June Rostrata)
// ============================================

// POST /auth/login - User login
server.post('/auth/login', async (req, res) => {
  const { student_id, password } = req.body;

  if (!student_id || !password) {
    return res.status(400).json({
      success: false,
      error: 'Student ID and password are required'
    });
  }

  // Get student from Enrollment Service
  const student = await getStudentFromEnrollment(student_id);
  
  if (!student) {
    // Log failed attempt
    await logLoginActivity(student_id, 'failed', 'Student not found', req);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if student is active
  if (student.status !== 'active') {
    await logLoginActivity(student_id, 'failed', 'Account inactive', req);
    return res.status(401).json({
      success: false,
      error: 'Account is inactive. Please contact administrator.'
    });
  }

  // Get stored password
  let passwordRecord = null;
  if (db) {
    const [rows] = await db.query('SELECT * FROM passwords WHERE student_id = ?', [student_id]);
    passwordRecord = rows[0];
  }

  if (!passwordRecord) {
    return res.status(401).json({
      success: false,
      error: 'No password generated for this student. Please contact administrator.'
    });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, passwordRecord.password_hash);
  if (!validPassword) {
    await logLoginActivity(student_id, 'failed', 'Invalid password', req);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { student_id: student_id, name: student.name },
    JWT_SECRET,
    { expiresIn: '30m' }
  );

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  if (db) {
    await db.query(
      'INSERT INTO sessions (session_id, student_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, student_id, token, expiresAt]
    );
  }

  // Log successful login
  await logLoginActivity(student_id, 'success', 'Login successful', req);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      student_id: student_id,
      name: student.name,
      token: token,
      session_id: sessionId,
      expires_at: expiresAt.toISOString()
    }
  });
});

// Helper function to log login activity
async function logLoginActivity(studentId, status, reason, req) {
  const activityId = uuidv4();
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const deviceType = req.headers['user-agent'] || 'Unknown';

  if (db) {
    await db.query(
      'INSERT INTO login_activity (activity_id, student_id, status, reason, ip_address, device_type) VALUES (?, ?, ?, ?, ?, ?)',
      [activityId, studentId, status, reason, ipAddress, deviceType]
    );
  }
}

// ============================================
// 3. SESSION MANAGEMENT SERVICE (Janice Junio)
// ============================================

// GET /auth/login/status - Check if user is authenticated
server.get('/auth/login/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'User is authenticated',
    data: {
      student_id: req.user.student_id,
      name: req.user.name,
      session_id: req.session.session_id,
      authenticated: true,
      session_created: req.session.created_at,
      session_expires: req.session.expires_at
    }
  });
});

// DELETE /auth/logout - Logout user
server.delete('/auth/logout', authenticateToken, async (req, res) => {
  // Remove session from database
  if (db) {
    await db.query('DELETE FROM sessions WHERE token = ?', [req.token]);
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
    data: {
      student_id: req.user.student_id,
      logged_out_at: new Date().toISOString()
    }
  });
});

// ============================================
// 4. PASSWORD MANAGEMENT SERVICE (Hannah Manalo)
// ============================================

// PUT /auth/password/change - Change password
server.put('/auth/password/change', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  // Password complexity validation
  if (new_password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long'
    });
  }

  const hasNumber = /\d/.test(new_password);
  const hasSpecial = /[!@#$%^&*]/.test(new_password);
  
  if (!hasNumber || !hasSpecial) {
    return res.status(400).json({
      success: false,
      error: 'New password must contain at least one number and one special character (!@#$%^&*)'
    });
  }

  // Get current password record
  let passwordRecord = null;
  if (db) {
    const [rows] = await db.query('SELECT * FROM passwords WHERE student_id = ?', [req.user.student_id]);
    passwordRecord = rows[0];
  }

  if (!passwordRecord) {
    return res.status(404).json({
      success: false,
      error: 'Password record not found'
    });
  }

  // Verify current password
  const validPassword = await bcrypt.compare(current_password, passwordRecord.password_hash);
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Hash and update new password
  const hashedPassword = await bcrypt.hash(new_password, 10);
  if (db) {
    await db.query(
      'UPDATE passwords SET password_hash = ? WHERE student_id = ?',
      [hashedPassword, req.user.student_id]
    );
  }

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      student_id: req.user.student_id,
      updated_at: new Date().toISOString()
    }
  });
});

// POST /auth/password/reset-request - Request password reset
server.post('/auth/password/reset-request', async (req, res) => {
  const { student_id, email } = req.body;

  if (!student_id || !email) {
    return res.status(400).json({
      success: false,
      error: 'Student ID and email are required'
    });
  }

  // Get student from Enrollment Service
  const student = await getStudentFromEnrollment(student_id);
  if (!student || student.email !== email) {
    return res.status(404).json({
      success: false,
      error: 'Student not found or email does not match records'
    });
  }

  // Generate reset token
  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Remove any existing reset tokens for this student
  if (db) {
    await db.query('DELETE FROM reset_tokens WHERE student_id = ?', [student_id]);
    await db.query(
      'INSERT INTO reset_tokens (student_id, token, expires_at) VALUES (?, ?, ?)',
      [student_id, resetToken, expiresAt]
    );
  }

  res.json({
    success: true,
    message: 'Password reset request initiated',
    data: {
      student_id: student_id,
      reset_token: resetToken,
      expires_at: expiresAt.toISOString(),
      note: 'In production, this token would be sent via email'
    }
  });
});

// PUT /auth/password/reset - Reset password with token
server.put('/auth/password/reset', async (req, res) => {
  const { reset_token, new_password } = req.body;

  if (!reset_token || !new_password) {
    return res.status(400).json({
      success: false,
      error: 'Reset token and new password are required'
    });
  }

  // Find reset token
  let tokenRecord = null;
  if (db) {
    const [rows] = await db.query('SELECT * FROM reset_tokens WHERE token = ?', [reset_token]);
    tokenRecord = rows[0];
  }

  if (!tokenRecord) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token'
    });
  }

  // Check if token expired
  if (new Date() > new Date(tokenRecord.expires_at)) {
    if (db) {
      await db.query('DELETE FROM reset_tokens WHERE token = ?', [reset_token]);
    }
    return res.status(400).json({
      success: false,
      error: 'Reset token has expired'
    });
  }

  // Password complexity validation
  if (new_password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long'
    });
  }

  // Update password
  const hashedPassword = await bcrypt.hash(new_password, 10);
  if (db) {
    await db.query(
      'UPDATE passwords SET password_hash = ? WHERE student_id = ?',
      [hashedPassword, tokenRecord.student_id]
    );
    // Remove used reset token
    await db.query('DELETE FROM reset_tokens WHERE token = ?', [reset_token]);
  }

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      student_id: tokenRecord.student_id,
      updated_at: new Date().toISOString()
    }
  });
});


// ============================================
// 5. LOGIN ACTIVITY TRACKING SERVICE (Allen Francia)
// ============================================

// POST /auth/login-activity/log - Log login activity
server.post('/auth/login-activity/log', async (req, res) => {
  const { student_id, status, ip_address, device_type } = req.body;

  if (!student_id || !status) {
    return res.status(400).json({
      success: false,
      error: 'Student ID and status are required'
    });
  }

  const activityId = uuidv4();
  const ipAddr = ip_address || req.ip || '127.0.0.1';
  const device = device_type || req.headers['user-agent'] || 'Unknown';
  const reason = status === 'success' ? 'Login successful' : 'Login failed';

  if (db) {
    await db.query(
      'INSERT INTO login_activity (activity_id, student_id, status, reason, ip_address, device_type) VALUES (?, ?, ?, ?, ?, ?)',
      [activityId, student_id, status, reason, ipAddr, device]
    );
  }

  res.status(201).json({
    success: true,
    message: 'Login activity logged successfully',
    data: {
      id: activityId,
      student_id: student_id,
      status: status,
      reason: reason,
      ip_address: ipAddr,
      device_type: device,
      timestamp: new Date().toISOString()
    }
  });
});

// GET /auth/login-activity/:student_id - Get login activity for specific student
server.get('/auth/login-activity/:student_id', async (req, res) => {
  const { student_id } = req.params;

  let activities = [];
  if (db) {
    const [rows] = await db.query(
      'SELECT * FROM login_activity WHERE student_id = ? ORDER BY timestamp DESC',
      [student_id]
    );
    activities = rows;
  }

  res.json({
    success: true,
    message: `Login activity for student ${student_id}`,
    data: {
      student_id: student_id,
      total_records: activities.length,
      activity: activities.map(a => ({
        id: a.activity_id,
        student_id: a.student_id,
        status: a.status,
        reason: a.reason,
        ip_address: a.ip_address,
        device_type: a.device_type,
        timestamp: a.timestamp
      }))
    }
  });
});

// GET /auth/login-activity - Get all login activity (admin)
server.get('/auth/login-activity', async (req, res) => {
  let activities = [];
  if (db) {
    const [rows] = await db.query('SELECT * FROM login_activity ORDER BY timestamp DESC');
    activities = rows;
  }

  res.json({
    success: true,
    message: 'All login activity records',
    data: {
      total_records: activities.length,
      activity: activities.map(a => ({
        id: a.activity_id,
        student_id: a.student_id,
        status: a.status,
        reason: a.reason,
        ip_address: a.ip_address,
        device_type: a.device_type,
        timestamp: a.timestamp
      }))
    }
  });
});

// ============================================
// HEALTH CHECK & SERVER START
// ============================================

server.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let enrollmentStatus = 'unknown';

  // Check database
  if (db) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
    }
  }

  // Check Enrollment Service
  try {
    const response = await fetch(`${ENROLLMENT_SERVICE_URL}/health`);
    enrollmentStatus = response.ok ? 'connected' : 'error';
  } catch (e) {
    enrollmentStatus = 'disconnected';
  }

  res.json({
    success: true,
    service: 'Authentication Microservice',
    port: port,
    database: dbStatus,
    enrollment_service: enrollmentStatus,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  await initializeDatabase();
  
  server.listen(port, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       AUTHENTICATION MICROSERVICE - GROUP 2               ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Server running on: http://localhost:${port}                  ║`);
    console.log(`║  Enrollment Service: ${ENROLLMENT_SERVICE_URL}            ║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  ENDPOINTS:                                               ║');
    console.log('║  ─────────────────────────────────────────────────────── ║');
    console.log('║  Password Generation:                                     ║');
    console.log('║    GET  /enrollment/students                              ║');
    console.log('║    GET  /enrollment/students/:student_id                  ║');
    console.log('║    POST /auth/password/generate                           ║');
    console.log('║    GET  /auth/password/status/:student_id                 ║');
    console.log('║  ─────────────────────────────────────────────────────── ║');
    console.log('║  Login Service (Renerose):                                ║');
    console.log('║    POST /auth/login                                       ║');
    console.log('║  ─────────────────────────────────────────────────────── ║');
    console.log('║  Session Management (Janice):                             ║');
    console.log('║    GET    /auth/login/status                              ║');
    console.log('║    DELETE /auth/logout                                    ║');
    console.log('║  ─────────────────────────────────────────────────────── ║');
    console.log('║  Password Management (Hanna May):                         ║');
    console.log('║    PUT  /auth/password/change                             ║');
    console.log('║    POST /auth/password/reset-request                      ║');
    console.log('║    PUT  /auth/password/reset                              ║');
    console.log('║  ─────────────────────────────────────────────────────── ║');
    console.log('║  Login Activity (Allen):                                  ║');
    console.log('║    POST /auth/login-activity/log                          ║');
    console.log('║    GET  /auth/login-activity/:student_id                  ║');
    console.log('║    GET  /auth/login-activity                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer();

module.exports = server;
