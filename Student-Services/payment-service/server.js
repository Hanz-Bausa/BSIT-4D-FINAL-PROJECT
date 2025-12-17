const express = require("express");
const app = express();

app.use(express.json());

// Preloaded payments
let payments = [
  {
    studentId: "STU2024001",
    semester: 1,
    amount: 5000,
    status: "paid",
    date: "2024-01-10"
  },
  {
    studentId: "STU2024002",
    semester: 1,
    amount: 4800,
    status: "paid",
    date: "2024-02-05"
  },
  {
    studentId: "STU2024003",
    semester: 1,
    amount: 5200,
    status: "pending",
    date: "2024-01-18"
  }
];

// Get payments for a student
app.get("/payments/:studentId", (req, res) => {
  const result = payments.filter(
    p => p.studentId === req.params.studentId
  );
  res.json(result);
});

app.listen(4004, () => {
  console.log("Payment Service running on port 4004");
});
