const express = require("express");
const app = express();

app.use(express.json());

// Preloaded schedules
let schedules = [
  {
    studentId: "STU2024001",
    semester: 1,
    courses: [
      { code: "CS101", title: "Introduction to Computer Science", day: "Monday", time: "08:00-10:00" },
      { code: "MATH101", title: "Calculus I", day: "Wednesday", time: "10:00-12:00" }
    ]
  },
  {
    studentId: "STU2024002",
    semester: 1,
    courses: [
      { code: "IT101", title: "Information Technology Basics", day: "Tuesday", time: "09:00-11:00" },
      { code: "ENG101", title: "English Composition", day: "Thursday", time: "13:00-15:00" }
    ]
  },
  {
    studentId: "STU2024003",
    semester: 1,
    courses: [
      { code: "SE101", title: "Software Engineering Fundamentals", day: "Monday", time: "13:00-15:00" },
      { code: "CS101", title: "Introduction to Computer Science", day: "Wednesday", time: "08:00-10:00" }
    ]
  }
];

// Get schedules for a student
app.get("/schedules/:studentId", (req, res) => {
  const result = schedules.filter(
    s => s.studentId === req.params.studentId
  );
  res.json(result);
});

app.listen(4002, () => {
  console.log("Schedule Service running on port 4002");
});
