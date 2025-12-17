const express = require("express");
const app = express();

app.use(express.json());

// Preloaded students
let students = [
  {
    id: 1,
    studentId: "STU2024001",
    name: "Dexter Balanza",
    email: "dexter@gmail.com",
    program: "Computer Science",
    enrollmentDate: "2024-01-15",
    status: "active",
    semester: 1,
    courses: ["CS101", "MATH101"]
  },
  {
    id: 2,
    studentId: "STU2024002",
    name: "Alexander Llavares",
    email: "Alex@gmail.com",
    program: "Information Technology",
    enrollmentDate: "2024-02-10",
    status: "active",
    semester: 1,
    courses: ["IT101", "ENG101"]
  },
  {
    id: 3,
    studentId: "STU2024003",
    name: "Norly Marco",
    email: "Norly@gmail.com",
    program: "Software Engineering",
    enrollmentDate: "2024-01-20",
    status: "active",
    semester: 1,
    courses: ["SE101", "CS101"]
  }
];

let id = 4; // next ID for newly added students

// Get all students
app.get("/students", (req, res) => {
  res.json(students);
});

// Get student by ID
app.get("/students/:id", (req, res) => {
  const student = students.find(s => s.id === parseInt(req.params.id));
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }
  res.json(student);
});

app.listen(4001, () => {
  console.log("Student Service running on port 4001");
});
