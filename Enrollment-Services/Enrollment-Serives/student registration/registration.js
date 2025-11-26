// Student Registration Service
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Student Registration Service');
});

app.listen(port, () => {
  console.log(`Student registration service listening at http://localhost:${port}`);
});