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
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL
    )
  `);
}

module.exports = { pool, setupDatabase };
