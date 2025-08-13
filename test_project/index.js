const express = require("express");
const _ = require("lodash");

const app = express();
const port = 3000;

app.use(express.json());

// Sample routes
app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.get("/users", (req, res) => {
  const users = [
    { id: 1, name: "John", email: "john@example.com" },
    { id: 2, name: "Jane", email: "jane@example.com" },
  ];
  res.json(users);
});

app.post("/users", (req, res) => {
  const newUser = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
  };
  res.status(201).json(newUser);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
