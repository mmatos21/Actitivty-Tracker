// Require dependencies
const express = require("express");
const bodyParser = require("body-parser");
const serveStatic = require("serve-static");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
require("dotenv").config();
const { body, validationResult } = require("express-validator");

// Initialize Express.js server
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(serveStatic("public"));

// Configure express-session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecret", // use an environment variable for the secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set to true if using HTTPS
  })
);

// In-memory users storage for demo purposes
const users = []; // Replace with a database in production
let todos = []; // In-memory storage for todos

// Middleware to check if a user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: "Unauthorized access" });
  }
}

// Root endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the Todo app API. Use /todos to manage your todos.");
});

// Register endpoint
app.post(
  "/register",
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = users.find((user) => user.username === username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Hash the password and store the user
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: users.length + 1, username, password: hashedPassword });
    res.status(201).json({ message: "User registered successfully" });
  }
);

// Login endpoint
app.post(
  "/login",
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const user = users.find((user) => user.username === username);
    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Set user session
    req.session.userId = user.id;
    res.json({ message: "Login successful" });
  }
);

// Logout endpoint
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Logout successful" });
  });
});

// Protect the following routes with the isAuthenticated middleware

// GET all todos
app.get("/todos", isAuthenticated, (req, res) => {
  res.json(todos);
});

// POST a new todo with validation
app.post(
  "/todos",
  isAuthenticated,
  body("title").notEmpty().withMessage("Title is required"),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const todo = {
      id: todos.length + 1,
      title: req.body.title,
      completed: req.body.completed || false,
      userId: req.session.userId, // Associate todo with the user
    };
    todos.push(todo);
    res.status(201).json(todo);
  }
);

// PUT to update a todo
app.put("/todos/:id", isAuthenticated, (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((t) => t.id === id && t.userId === req.session.userId);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  todo.title = req.body.title || todo.title;
  todo.completed = req.body.completed || todo.completed;
  res.json(todo);
});

// DELETE a todo
app.delete("/todos/:id", isAuthenticated, (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex((t) => t.id === id && t.userId === req.session.userId);
  if (index === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }
  todos.splice(index, 1);
  res.status(204).send();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "An unexpected error occurred!" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
