const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const server = express();
const port = 4000;

// Middleware
server.use(cors());
server.use(express.json());

// Secret key for JWT
const JWT_SECRET = 'your-secret-key-here';

// ============================================
// IN-MEMORY DATABASE (Replace with MongoDB in production)
// ============================================

// Simulated Enrollment Data (from Enrollment Microservice)
const enrollmentStudents = [
  { student_id: '2024-00001', name: 'Juan Dela Cruz', email: 'juan@student.edu', status: 'active' },
  { student_id: '2024-00002', name: 'Maria Santos', email: 'maria@student.edu', status: 'active' },
  { student_id: '2024-00003', name: 'Pedro Reyes', email: 'pedro@student.edu', status: 'inactive' },
  { student_id: '2024-00004', name: 'Ana Garcia', email: 'ana@student.edu', status: 'active' }
];

// Authentication Database
let passwords = [];        // Stores generated passwords
let sessions = [];         // Stores active sessions
let loginActivity = [];    // Stores login activity logs
let resetTokens = [];      // Stores password reset tokens

// ============================================
// HELPER FUNCTIONS
// ============================================

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
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Check if session exists
  const session = sessions.find(s => s.token === token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  // Check if session expired (30 minutes)
  const now = new Date();
  const sessionAge = (now - new Date(session.created_at)) / 1000 / 60;
  if (sessionAge > 30) {
    sessions = sessions.filter(s => s.token !== token);
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    req.token = token;
    next();
  });
}

// ============================================
// 1. PASSWORD GENERATION SERVICE
// ============================================

// GET /enrollment/students - Get student list from Enrollment API
server.get('/enrollment/students', (req, res) => {
  res.json({
    success: true,
    message: 'Student list retrieved from Enrollment Microservice',
    data: enrollmentStudents
  });
});

// GET /enrollment/students/:student_id - Validate student exists
server.get('/enrollment/students/:student_id', (req, res) => {
  const { student_id } = req.params;
  const student = enrollmentStudents.find(s => s.student_id === student_id);

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

  // Check if student exists in Enrollment
  const student = enrollmentStudents.find(s => s.student_id === student_id);
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
  const existingPassword = passwords.find(p => p.student_id === student_id);
  if (existingPassword) {
    return res.status(400).json({
      success: false,
      error: 'Password already generated for this student'
    });
  }

  // Generate and hash password
  const plainPassword = generateRandomPassword(student_id);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Store in database
  passwords.push({
    student_id: student_id,
    password_hash: hashedPassword,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

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
server.get('/auth/password/status/:student_id', (req, res) => {
  const { student_id } = req.params;

  const passwordRecord = passwords.find(p => p.student_id === student_id);

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

  // Check if student exists in Enrollment
  const student = enrollmentStudents.find(s => s.student_id === student_id);
  if (!student) {
    // Log failed attempt
    loginActivity.push({
      id: uuidv4(),
      student_id: student_id,
      status: 'failed',
      reason: 'Student not found',
      ip_address: req.ip || '127.0.0.1',
      device_type: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if student is active
  if (student.status !== 'active') {
    loginActivity.push({
      id: uuidv4(),
      student_id: student_id,
      status: 'failed',
      reason: 'Account inactive',
      ip_address: req.ip || '127.0.0.1',
      device_type: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({
      success: false,
      error: 'Account is inactive. Please contact administrator.'
    });
  }

  // Get stored password
  const passwordRecord = passwords.find(p => p.student_id === student_id);
  if (!passwordRecord) {
    return res.status(401).json({
      success: false,
      error: 'No password generated for this student. Please contact administrator.'
    });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, passwordRecord.password_hash);
  if (!validPassword) {
    loginActivity.push({
      id: uuidv4(),
      student_id: student_id,
      status: 'failed',
      reason: 'Invalid password',
      ip_address: req.ip || '127.0.0.1',
      device_type: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
    });

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
  sessions.push({
    session_id: sessionId,
    student_id: student_id,
    token: token,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });

  // Log successful login
  loginActivity.push({
    id: uuidv4(),
    student_id: student_id,
    status: 'success',
    reason: 'Login successful',
    ip_address: req.ip || '127.0.0.1',
    device_type: req.headers['user-agent'] || 'Unknown',
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      student_id: student_id,
      name: student.name,
      token: token,
      session_id: sessionId,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
  });
});


// ============================================
// 3. SESSION MANAGEMENT SERVICE (Janice Junio)
// ============================================

// GET /auth/login/status - Check if user is authenticated
server.get('/auth/login/status', authenticateToken, (req, res) => {
  const session = sessions.find(s => s.token === req.token);

  res.json({
    success: true,
    message: 'User is authenticated',
    data: {
      student_id: req.user.student_id,
      name: req.user.name,
      session_id: session ? session.session_id : null,
      authenticated: true,
      session_created: session ? session.created_at : null,
      session_expires: session ? session.expires_at : null
    }
  });
});

// DELETE /auth/logout - Logout user
server.delete('/auth/logout', authenticateToken, (req, res) => {
  // Remove session
  const sessionIndex = sessions.findIndex(s => s.token === req.token);
  
  if (sessionIndex !== -1) {
    sessions.splice(sessionIndex, 1);
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
  const passwordRecord = passwords.find(p => p.student_id === req.user.student_id);
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
  passwordRecord.password_hash = hashedPassword;
  passwordRecord.updated_at = new Date().toISOString();

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      student_id: req.user.student_id,
      updated_at: passwordRecord.updated_at
    }
  });
});

// POST /auth/password/reset-request - Request password reset
server.post('/auth/password/reset-request', (req, res) => {
  const { student_id, email } = req.body;

  if (!student_id || !email) {
    return res.status(400).json({
      success: false,
      error: 'Student ID and email are required'
    });
  }

  // Verify student exists and email matches
  const student = enrollmentStudents.find(s => s.student_id === student_id);
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
  resetTokens = resetTokens.filter(t => t.student_id !== student_id);

  // Store reset token
  resetTokens.push({
    student_id: student_id,
    token: resetToken,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  });

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
  const tokenRecord = resetTokens.find(t => t.token === reset_token);
  if (!tokenRecord) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token'
    });
  }

  // Check if token expired
  if (new Date() > new Date(tokenRecord.expires_at)) {
    resetTokens = resetTokens.filter(t => t.token !== reset_token);
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
  const passwordRecord = passwords.find(p => p.student_id === tokenRecord.student_id);
  if (!passwordRecord) {
    return res.status(404).json({
      success: false,
      error: 'Password record not found'
    });
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  passwordRecord.password_hash = hashedPassword;
  passwordRecord.updated_at = new Date().toISOString();

  // Remove used reset token
  resetTokens = resetTokens.filter(t => t.token !== reset_token);

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      student_id: tokenRecord.student_id,
      updated_at: passwordRecord.updated_at
    }
  });
});


// ============================================
// 5. LOGIN ACTIVITY TRACKING SERVICE (Allen Francia)
// ============================================

// POST /auth/login-activity/log - Log login activity
server.post('/auth/login-activity/log', (req, res) => {
  const { student_id, status, ip_address, device_type } = req.body;

  if (!student_id || !status) {
    return res.status(400).json({
      success: false,
      error: 'Student ID and status are required'
    });
  }

  const activityLog = {
    id: uuidv4(),
    student_id: student_id,
    status: status,
    reason: status === 'success' ? 'Login successful' : 'Login failed',
    ip_address: ip_address || req.ip || '127.0.0.1',
    device_type: device_type || req.headers['user-agent'] || 'Unknown',
    timestamp: new Date().toISOString()
  };

  loginActivity.push(activityLog);

  res.status(201).json({
    success: true,
    message: 'Login activity logged successfully',
    data: activityLog
  });
});

// GET /auth/login-activity/:student_id - Get login activity for specific student
server.get('/auth/login-activity/:student_id', (req, res) => {
  const { student_id } = req.params;

  const studentActivity = loginActivity.filter(a => a.student_id === student_id);

  res.json({
    success: true,
    message: `Login activity for student ${student_id}`,
    data: {
      student_id: student_id,
      total_records: studentActivity.length,
      activity: studentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }
  });
});

// GET /auth/login-activity - Get all login activity (admin)
server.get('/auth/login-activity', (req, res) => {
  res.json({
    success: true,
    message: 'All login activity records',
    data: {
      total_records: loginActivity.length,
      activity: loginActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }
  });
});

// ============================================
// SERVER START
// ============================================

server.listen(port, () => {
  console.log(`Authentication Microservice running on port ${port}`);
  console.log(`API Base URL: http://localhost:${port}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('--------------------');
  console.log('Password Generation:');
  console.log('  GET  /enrollment/students');
  console.log('  GET  /enrollment/students/:student_id');
  console.log('  POST /auth/password/generate');
  console.log('  GET  /auth/password/status/:student_id');
  console.log('');
  console.log('Login Service:');
  console.log('  POST /auth/login');
  console.log('');
  console.log('Session Management:');
  console.log('  GET    /auth/login/status');
  console.log('  DELETE /auth/logout');
  console.log('');
  console.log('Password Management:');
  console.log('  PUT  /auth/password/change');
  console.log('  POST /auth/password/reset-request');
  console.log('  PUT  /auth/password/reset');
  console.log('');
  console.log('Login Activity:');
  console.log('  POST /auth/login-activity/log');
  console.log('  GET  /auth/login-activity/:student_id');
  console.log('  GET  /auth/login-activity');
});
