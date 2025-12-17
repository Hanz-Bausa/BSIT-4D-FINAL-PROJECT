const express = require("express");
const app = express();

app.use(express.json());

// Preloaded class offerings
let offerings = [
  {
    code: "CS101",
    title: "Introduction to Computer Science",
    instructor: "Prof. Reyes",
    schedule: "Monday 08:00-10:00",
    semester: 1
  },
  {
    code: "MATH101",
    title: "Calculus I",
    instructor: "Prof. Santos",
    schedule: "Wednesday 10:00-12:00",
    semester: 1
  },
  {
    code: "IT101",
    title: "Information Technology Basics",
    instructor: "Prof. Llavares",
    schedule: "Tuesday 09:00-11:00",
    semester: 1
  },
  {
    code: "ENG101",
    title: "English Composition",
    instructor: "Prof. Cruz",
    schedule: "Thursday 13:00-15:00",
    semester: 1
  },
  {
    code: "SE101",
    title: "Software Engineering Fundamentals",
    instructor: "Prof. Dela Cruz",
    schedule: "Monday 13:00-15:00",
    semester: 1
  }
];

// Get all class offerings
app.get("/offerings", (req, res) => {
  res.json(offerings);
});

app.listen(4003, () => {
  console.log("Class Offering Service running on port 4003");
});
