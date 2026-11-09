const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { promisify } = require("util");
const { pool, setupDatabase } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const scrypt = promisify(crypto.scrypt);

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-development-secret-before-deployment";

const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_CATEGORIES = ["work", "personal", "shopping", "other"];

// Password hashing
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scrypt(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");

  const derivedKey = await scrypt(password, salt, 64);

  const storedKey = Buffer.from(key, "hex");

  return (
    storedKey.length === derivedKey.length &&
    crypto.timingSafeEqual(storedKey, derivedKey)
  );
}

// Token creation
function createToken(user) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    id: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
  };

  const encodedHeader = Buffer
    .from(JSON.stringify(header))
    .toString("base64url");

  const encodedPayload = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Token verification
function verifyToken(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  const [header, payload, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest();

  const receivedSignature = Buffer.from(signature, "base64url");

  if (
    receivedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new Error("Invalid token signature");
  }

  const decodedPayload = JSON.parse(
    Buffer.from(payload, "base64url").toString()
  );

  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return decodedPayload;
}

// Authentication middleware
function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  try {
    const token = authorization.split(" ")[1];

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

// Register
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must contain at least 8 characters."
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    // Assign existing unowned tasks to the first registered account.
    await client.query(
      `UPDATE tasks
       SET user_id = $1
       WHERE user_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM users WHERE id <> $1
       )`,
      [user.id]
    );

    await client.query("COMMIT");

    const token = createToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Could not create account."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    const validPassword = await verifyPassword(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Could not log in."
    });
  }
});

// Get logged-in user
app.get("/auth/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error("User lookup error:", error);

    return res.status(500).json({
      message: "Could not retrieve account."
    });
  }
});

// Get tasks with search, filters and sorting
app.get("/tasks", authenticate, async (req, res) => {
  try {
    const {
      search,
      category,
      priority,
      status,
      overdue,
      sort
    } = req.query;

    const values = [req.user.id];

    let query = `
      SELECT *
      FROM tasks
      WHERE user_id = $1
    `;

    if (search) {
      values.push(`%${search}%`);
      query += ` AND title ILIKE $${values.length}`;
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      values.push(category);
      query += ` AND category = $${values.length}`;
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      values.push(priority);
      query += ` AND priority = $${values.length}`;
    }

    if (status === "completed") {
      query += " AND completed = TRUE";
    }

    if (status === "pending") {
      query += " AND completed = FALSE";
    }

    if (overdue === "true") {
      query += " AND due_date < CURRENT_DATE AND completed = FALSE";
    }

    const sortOptions = {
      created_at: "created_at DESC",
      due_date: "due_date ASC NULLS LAST",
      priority: `
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END ASC
      `,
      title: "title ASC"
    };

    query += ` ORDER BY ${
      sortOptions[sort] || sortOptions.created_at
    }`;

    const result = await pool.query(query, values);

    return res.json(result.rows);
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      message: "Could not retrieve tasks."
    });
  }
});

// Create task
app.post("/tasks", authenticate, async (req, res) => {
  const {
    title,
    priority = "medium",
    due_date = null,
    category = "other"
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      message: "Task title is required."
    });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      message: "Invalid priority."
    });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      message: "Invalid category."
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks
       (title, priority, due_date, category, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        title.trim(),
        priority,
        due_date || null,
        category,
        req.user.id
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Could not create task."
    });
  }
});

// Edit task
app.patch("/tasks/:id", authenticate, async (req, res) => {
  const {
    title,
    priority,
    due_date,
    category
  } = req.body;

  if (title !== undefined && !title.trim()) {
    return res.status(400).json({
      message: "Task title cannot be empty."
    });
  }

  if (
    priority !== undefined &&
    !VALID_PRIORITIES.includes(priority)
  ) {
    return res.status(400).json({
      message: "Invalid priority."
    });
  }

  if (
    category !== undefined &&
    !VALID_CATEGORIES.includes(category)
  ) {
    return res.status(400).json({
      message: "Invalid category."
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET
         title = COALESCE($1, title),
         priority = COALESCE($2, priority),
         due_date = CASE
           WHEN $3::boolean THEN $4::date
           ELSE due_date
         END,
         category = COALESCE($5, category)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        title === undefined ? null : title.trim(),
        priority || null,
        due_date !== undefined,
        due_date || null,
        category || null,
        req.params.id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Edit task error:", error);

    return res.status(500).json({
      message: "Could not update task."
    });
  }
});

// Toggle task completion
app.put("/tasks/:id", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET completed = NOT completed
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Toggle task error:", error);

    return res.status(500).json({
      message: "Could not update task."
    });
  }
});

// Delete task
app.delete("/tasks/:id", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    return res.json({
      message: "Task deleted successfully."
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Could not delete task."
    });
  }
});

// Start server
async function startServer() {
  try {
    await setupDatabase();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };