const express = require("express");
const { pool, setupDatabase } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <h1>Task API</h1>
    <p>API is running.</p>
    <p>Try /tasks to see your tasks.</p>
  `);
});

app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Could not get tasks" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
      [title]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Could not create task" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted", task: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Could not delete task" });
  }
});

async function startServer() {
  try {
    await setupDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Task API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();
