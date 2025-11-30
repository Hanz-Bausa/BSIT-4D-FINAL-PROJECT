const express = require('express');
const { v4: uuidv4 } = require('uuid');

const server = express();
server.use(express.json());

// In-memory storage for students
let students = [
  {
    id: "1",
    studentId: "STU2024001",
    name: "John Doe",
    email: "john.doe@university.edu",
    program: "Computer Science",
    enrollmentDate: "2024-01-15",
    status: "active",
    semester: 1,
    courses: ["CS101", "MATH101"]
  }
];

// Utility functions
const findStudentById = (id) => students.find(s => s.id === id);
const findStudentByStudentId = (studentId) => students.find(s => s.studentId === studentId);
const findStudentIndex = (id) => students.findIndex(s => s.id === id);

// Validation middleware
const validateStudent = (req, res, next) => {
  const { name, email, program, semester } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return res.status(400).json({ error: "Name must be a non-empty string" });
  }

  if (email !== undefined && (typeof email !== 'string' || !isValidEmail(email))) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  if (program !== undefined && (typeof program !== 'string' || program.trim() === '')) {
    return res.status(400).json({ error: "Program must be a non-empty string" });
  }

  if (semester !== undefined && (typeof semester !== 'number' || semester < 1 || semester > 8)) {
    return res.status(400).json({ error: "Semester must be a number between 1 and 8" });
  }

  next();
};

const validateRequiredFields = (req, res, next) => {
  const { name, email, program } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Student name is required" });
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: "Valid student email is required" });
  }

  if (!program || typeof program !== 'string' || program.trim() === '') {
    return res.status(400).json({ error: "Academic program is required" });
  }

  next();
};

// Helper function for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate student ID
const generateStudentId = () => {
  const year = new Date().getFullYear();
  const sequence = students.length + 1;
  return `STU${year}${sequence.toString().padStart(3, '0')}`;
};

// Health check endpoint
server.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Student Registration Service - Enrollment Microservice',
    timestamp: new Date().toISOString(),
    totalStudents: students.length,
    version: '1.0.0'
  });
});

// Get all students with optional filtering
server.get('/students', (req, res) => {
  const { program, status, semester } = req.query;

  let filteredStudents = [...students];

  // Filter by program
  if (program) {
    filteredStudents = filteredStudents.filter(s =>
      s.program?.toLowerCase().includes(program.toLowerCase())
    );
  }

  // Filter by status
  if (status) {
    filteredStudents = filteredStudents.filter(s =>
      s.status?.toLowerCase() === status.toLowerCase()
    );
  }

  // Filter by semester
  if (semester) {
    filteredStudents = filteredStudents.filter(s => s.semester === parseInt(semester));
  }

  res.json({
    message: "Students retrieved successfully",
    count: filteredStudents.length,
    data: filteredStudents
  });
});

// Get student by ID
server.get('/students/:id', (req, res) => {
  const id = req.params.id;
  const student = findStudentById(id);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({
    message: "Student retrieved successfully",
    data: student
  });
});

// Get student by student ID
server.get('/students/student-id/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  const student = findStudentByStudentId(studentId);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({
    message: "Student retrieved successfully",
    data: student
  });
});

// Register new student
server.post('/students/register', validateRequiredFields, (req, res) => {
  const { name, email, program, semester, dateOfBirth, phone } = req.body;

  // Check if email already exists
  const existingStudent = students.find(s => s.email === email);
  if (existingStudent) {
    return res.status(409).json({ error: "Student with this email already exists" });
  }

  const newStudent = {
    id: uuidv4(),
    studentId: generateStudentId(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    program: program.trim(),
    semester: semester || 1,
    dateOfBirth: dateOfBirth || null,
    phone: phone || null,
    status: "active",
    enrollmentDate: new Date().toISOString().split('T')[0],
    courses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  students.push(newStudent);

  res.status(201).json({
    message: "Student registered successfully",
    data: newStudent
  });
});

// Update student information (full update)
server.put('/students/:id', validateStudent, (req, res) => {
  const id = req.params.id;
  const studentIndex = findStudentIndex(id);

  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const { name, email, program, semester, status, phone } = req.body;
  const existing = students[studentIndex];

  const updatedStudent = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    email: email !== undefined ? email.toLowerCase().trim() : existing.email,
    program: program !== undefined ? program.trim() : existing.program,
    semester: semester !== undefined ? semester : existing.semester,
    status: status !== undefined ? status : existing.status,
    phone: phone !== undefined ? phone : existing.phone,
    updatedAt: new Date().toISOString()
  };

  students[studentIndex] = updatedStudent;

  res.json({
    message: "Student information updated successfully",
    data: updatedStudent
  });
});

// Partial update student information
server.patch('/students/:id', validateStudent, (req, res) => {
  const id = req.params.id;
  const studentIndex = findStudentIndex(id);

  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const existing = students[studentIndex];
  const updatedStudent = {
    ...existing,
    ...req.body,
    id: existing.id, // Prevent ID modification
    studentId: existing.studentId, // Prevent student ID modification
    enrollmentDate: existing.enrollmentDate, // Preserve enrollment date
    updatedAt: new Date().toISOString()
  };

  // Trim string fields if they exist in update
  if (req.body.name) updatedStudent.name = req.body.name.trim();
  if (req.body.email) updatedStudent.email = req.body.email.toLowerCase().trim();
  if (req.body.program) updatedStudent.program = req.body.program.trim();

  students[studentIndex] = updatedStudent;

  res.json({
    message: "Student information updated successfully",
    data: updatedStudent
  });
});

// Delete student record
server.delete('/students/:id', (req, res) => {
  const id = req.params.id;
  const studentIndex = findStudentIndex(id);

  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const deletedStudent = students.splice(studentIndex, 1)[0];

  res.json({
    message: "Student record deleted successfully",
    data: deletedStudent
  });
});

// Search students by name, email, or program
server.get('/students/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();

  const matchingStudents = students.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.email.toLowerCase().includes(query) ||
    s.program.toLowerCase().includes(query) ||
    s.studentId.toLowerCase().includes(query)
  );

  res.json({
    message: "Search completed successfully",
    query: query,
    count: matchingStudents.length,
    data: matchingStudents
  });
});

// Get students by program
server.get('/students/program/:program', (req, res) => {
  const program = req.params.program.toLowerCase();

  const programStudents = students.filter(s =>
    s.program.toLowerCase() === program
  );

  res.json({
    message: `Students in program '${program}' retrieved successfully`,
    program: program,
    count: programStudents.length,
    data: programStudents
  });
});

// Get students by status
server.get('/students/status/:status', (req, res) => {
  const status = req.params.status.toLowerCase();

  const statusStudents = students.filter(s =>
    s.status.toLowerCase() === status
  );

  res.json({
    message: `Students with status '${status}' retrieved successfully`,
    status: status,
    count: statusStudents.length,
    data: statusStudents
  });
});

// Update student status
server.patch('/students/:id/status', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const validStatuses = ['active', 'inactive', 'suspended', 'graduated', 'withdrawn'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: "Valid status is required",
      validStatuses: validStatuses
    });
  }

  const studentIndex = findStudentIndex(id);
  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  students[studentIndex].status = status;
  students[studentIndex].updatedAt = new Date().toISOString();

  res.json({
    message: "Student status updated successfully",
    data: students[studentIndex]
  });
});

// Error handling middleware
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong in Student Registration Service!" });
});

// FIXED: 404 handler - use explicit path instead of '*'
server.use((req, res) => {
  res.status(404).json({
    error: "Route not found in Student Registration Service",
    requestedPath: req.originalUrl,
    availableEndpoints: {
      "GET": [
        "/health",
        "/students",
        "/students/:id",
        "/students/student-id/:studentId",
        "/students/search/:query",
        "/students/program/:program",
        "/students/status/:status"
      ],
      "POST": [
        "/students/register"
      ],
      "PUT": [
        "/students/:id"
      ],
      "PATCH": [
        "/students/:id",
        "/students/:id/status"
      ],
      "DELETE": [
        "/students/:id"
      ]
    }
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Student Registration Service (Enrollment Microservice) is running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Students API: http://localhost:${port}/students`);
});

module.exports = server;