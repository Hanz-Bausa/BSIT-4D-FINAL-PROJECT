const express = require("express");
const app = express();

app.use(express.json());

// Preloaded grades
let grades = [
  {
    studentId: "STU2024001",
    semester: 1,
    courses: [
      { code: "CS101", title: "Introduction to Computer Science", grade: "A" },
      { code: "MATH101", title: "Calculus I", grade: "B+" }
    ]
  },
  {
    studentId: "STU2024002",
    semester: 1,
    courses: [
      { code: "IT101", title: "Information Technology Basics", grade: "A-" },
      { code: "ENG101", title: "English Composition", grade: "B" }
    ]
  },
  {
    studentId: "STU2024003",
    semester: 1,
    courses: [
      { code: "SE101", title: "Software Engineering Fundamentals", grade: "A" },
      { code: "CS101", title: "Introduction to Computer Science", grade: "B+" }
    ]
  }
];

// Get grades for a student
app.get("/grades/:studentId", (req, res) => {
  const result = grades.filter(
    g => g.studentId === req.params.studentId
  );
  res.json(result);
});

app.listen(4005, () => {
  console.log("Grades Service running on port 4005");
});
