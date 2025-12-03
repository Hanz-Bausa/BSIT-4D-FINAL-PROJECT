const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readStudents, writeStudents } = require('../utils/fileStorage');

const server = express();
server.use(express.json());

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
  const students = readStudents();
  const year = new Date().getFullYear();
  const sequence = students.length + 1;
  return `STU${year}${sequence.toString().padStart(3, '0')}`;
};

// Health check endpoint
server.get('/health', (req, res) => {
  const students = readStudents();
  res.json({
    status: 'OK',
    service: 'Student Registration Service',
    timestamp: new Date().toISOString(),
    totalStudents: students.length,
    version: '1.0.0'
  });
});

// Utility functions for finding students
const findStudentById = (id, students) => students.find(s => s.id === id);
const findStudentByStudentId = (studentId, students) => students.find(s => s.studentId === studentId);
const findStudentIndex = (id, students) => students.findIndex(s => s.id === id);

// -------------------- ROUTES --------------------

// GET all students with optional filters
server.get('/students', (req, res) => {
  const students = readStudents();
  const { program, status, semester } = req.query;

  let filtered = [...students];

  if (program) filtered = filtered.filter(s => s.program?.toLowerCase().includes(program.toLowerCase()));
  if (status) filtered = filtered.filter(s => s.status?.toLowerCase() === status.toLowerCase());
  if (semester) filtered = filtered.filter(s => s.semester === parseInt(semester));

  res.json({ message: "Students retrieved successfully", count: filtered.length, data: filtered });
});

// GET student by ID
server.get('/students/:id', (req, res) => {
  const students = readStudents();
  const student = findStudentById(req.params.id, students);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Student retrieved successfully", data: student });
});

// GET student by studentId
server.get('/students/student-id/:studentId', (req, res) => {
  const students = readStudents();
  const student = findStudentByStudentId(req.params.studentId, students);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ message: "Student retrieved successfully", data: student });
});

// POST register new student
server.post('/students/register', validateRequiredFields, (req, res) => {
  const students = readStudents();
  const { name, email, program, semester, dateOfBirth, phone } = req.body;

  if (students.find(s => s.email === email)) {
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
  writeStudents(students);

  res.status(201).json({ message: "Student registered successfully", data: newStudent });
});

// PUT update full student
server.put('/students/:id', validateStudent, (req, res) => {
  const students = readStudents();
  const idx = findStudentIndex(req.params.id, students);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  const existing = students[idx];
  const { name, email, program, semester, status, phone } = req.body;

  const updated = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    email: email !== undefined ? email.toLowerCase().trim() : existing.email,
    program: program !== undefined ? program.trim() : existing.program,
    semester: semester !== undefined ? semester : existing.semester,
    status: status !== undefined ? status : existing.status,
    phone: phone !== undefined ? phone : existing.phone,
    updatedAt: new Date().toISOString()
  };

  students[idx] = updated;
  writeStudents(students);

  res.json({ message: "Student information updated successfully", data: updated });
});

// PATCH partial update
server.patch('/students/:id', validateStudent, (req, res) => {
  const students = readStudents();
  const idx = findStudentIndex(req.params.id, students);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  const existing = students[idx];
  const updated = { ...existing, ...req.body, id: existing.id, studentId: existing.studentId, enrollmentDate: existing.enrollmentDate, updatedAt: new Date().toISOString() };

  if (req.body.name) updated.name = req.body.name.trim();
  if (req.body.email) updated.email = req.body.email.toLowerCase().trim();
  if (req.body.program) updated.program = req.body.program.trim();

  students[idx] = updated;
  writeStudents(students);

  res.json({ message: "Student information updated successfully", data: updated });
});

// DELETE student
server.delete('/students/:id', (req, res) => {
  const students = readStudents();
  const idx = findStudentIndex(req.params.id, students);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });

  const deleted = students.splice(idx, 1)[0];
  writeStudents(students);

  res.json({ message: "Student record deleted successfully", data: deleted });
});

// Search students
server.get('/students/search/:query', (req, res) => {
  const students = readStudents();
  const q = req.params.query.toLowerCase();

  const results = students.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.email.toLowerCase().includes(q) ||
    s.program.toLowerCase().includes(q) ||
    s.studentId.toLowerCase().includes(q)
  );

  res.json({ message: "Search completed successfully", query: q, count: results.length, data: results });
});

// -------------------- 404 & Error --------------------
server.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = server;
