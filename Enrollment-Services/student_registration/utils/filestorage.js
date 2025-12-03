const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'students.json');

// Read all students
function readStudents() {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Write students to file
function writeStudents(students) {
  fs.writeFileSync(filePath, JSON.stringify(students, null, 2));
}

module.exports = { readStudents, writeStudents };
