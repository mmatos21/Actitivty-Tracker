// Require dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
const { body, validationResult } = require("express-validator");

// Initialize Express.js server
const app = express();

// Middleware
app.use(
    cors({
        origin: "http://localhost:3000", // Allow this origin
        credentials: true, // Allow cookies and credentials
        methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
        allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    })
);

// Handle CORS preflight requests
app.options("*", cors());

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files (e.g., HTML, JS, CSS)

// Configure express-session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "mysecret",
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production", // Use secure cookies in production
            httpOnly: true, // Helps mitigate XSS attacks
        },
    })
);

app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.url}`);
    next();
});

// In-memory users and todos storage
const users = []; // Temporary storage for users (Replace with a database in production)
const todos = []; // Temporary storage for todos (Replace with a database in production)

// Middleware to check if a user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        return res.status(401).json({ error: "Unauthorized access" });
    }
}

// Serve Login and Register pages
app.get("/login", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/register.html"));
});

// Root endpoint
app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/index.html"));
});

// Register endpoint
app.post(
    "/register",
    body("username").notEmpty().withMessage("Username is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Check for duplicate usernames
        if (users.find((user) => user.username === username)) {
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

        if (!user || !(await bcrypt.compare(password, user.password))) {
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
            return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ message: "Logout successful" });
    });
});

// Get all todos for the authenticated user
app.get("/todos", isAuthenticated, (req, res) => {
    const userTodos = todos.filter((todo) => todo.userId === req.session.userId);
    res.json(userTodos);
});

// Add a new todo
app.post(
    "/todos",
    isAuthenticated,
    body("title").notEmpty().withMessage("Title is required"),
    body("date").isISO8601().withMessage("Date must be in ISO format"),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, date } = req.body;
        const todo = { id: todos.length + 1, title, date, completed: false, userId: req.session.userId };
        todos.push(todo);
        res.status(201).json(todo);
    }
);

// Delete a todo
app.delete("/todos/:id", isAuthenticated, (req, res) => {
    const index = todos.findIndex(
        (todo) => todo.id === parseInt(req.params.id) && todo.userId === req.session.userId
    );

    if (index === -1) {
        return res.status(404).json({ error: "Todo not found" });
    }

    todos.splice(index, 1);
    res.status(204).send();
});

// Search todos
app.get("/todos/search", isAuthenticated, (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : "";
    const userTodos = todos.filter(
        (todo) =>
            todo.userId === req.session.userId &&
            (todo.title.toLowerCase().includes(query) || todo.date.includes(query))
    );
    res.json(userTodos);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

