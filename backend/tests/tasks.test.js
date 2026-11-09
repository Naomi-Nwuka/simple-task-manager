const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { app } = require("../server");
const { pool, setupDatabase } = require("../db");

// Prepare database before testing
before(async () => {
  await setupDatabase();
});

// Close database connection after testing
after(async () => {
  await pool.end();
});

// TEST 1: Retrieve all tasks
test("GET /tasks should return a list of tasks", async () => {
  const response = await request(app).get("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

// TEST 2: Create a new task
test("POST /tasks should create a new task", async () => {
  const response = await request(app)
    .post("/tasks")
    .send({ title: "Automated test task" });

  assert.equal(response.status, 201);
  assert.equal(response.body.title, "Automated test task");
  assert.equal(response.body.completed, false);

  // Clean up
  await request(app).delete(`/tasks/${response.body.id}`);
});

// TEST 3: Reject task creation without a title
test("POST /tasks should reject an empty task title", async () => {
  const response = await request(app)
    .post("/tasks")
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Task title is required");
});

// TEST 4: Update a task
test("PUT /tasks/:id should mark a task as completed", async () => {
  const created = await request(app)
    .post("/tasks")
    .send({ title: "Task to update" });

  const response = await request(app)
    .put(`/tasks/${created.body.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.completed, true);

  // Clean up
  await request(app).delete(`/tasks/${created.body.id}`);
});

// TEST 5: Reject updating a task that does not exist
test("PUT /tasks/:id should return 404 for a missing task", async () => {
  const response = await request(app).put("/tasks/999999");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Task not found");
});

// TEST 6: Delete a task
test("DELETE /tasks/:id should delete a task", async () => {
  const created = await request(app)
    .post("/tasks")
    .send({ title: "Task to delete" });

  const response = await request(app)
    .delete(`/tasks/${created.body.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Task deleted");
});

// TEST 7: Reject deleting a task that does not exist
test("DELETE /tasks/:id should return 404 for a missing task", async () => {
  const response = await request(app).delete("/tasks/999999");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Task not found");
});