const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: 5432,
  user: process.env.DB_USER || "taskuser",
  password: process.env.DB_PASSWORD || "taskpass",
  database: process.env.DB_NAME || "tasks"
});

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS priority TEXT
    NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high'))
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS due_date DATE
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS category TEXT
    NOT NULL DEFAULT 'other'
    CHECK (category IN ('work', 'personal', 'shopping', 'other'))
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW()
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS user_id INTEGER
    REFERENCES users(id) ON DELETE CASCADE
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS tasks_user_id_idx
    ON tasks(user_id)
  `);
}

module.exports = { pool, setupDatabase };