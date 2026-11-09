const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: 5432,
  user: process.env.DB_USER || "taskuser",
  password: process.env.DB_PASSWORD || "taskpass",
  database: process.env.DB_NAME || "tasks"
});

async function setupDatabase() {
  // Create the tasks table if it does not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE
    )
  `);

  // Add priority to existing tasks
  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS priority TEXT
    NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high'))
  `);

  // Add due date to existing tasks
  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS due_date DATE
  `);
}

module.exports = { pool, setupDatabase };