const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app } = require("../server");
const { pool, setupDatabase } = require("../db");

let server;
let token;

const createdTaskIds = [];

const testEmail = `test-${Date.now()}@example.com`;
const testPassword = "TestPassword123!";

// Authenticated request helper
function authRequest(method, path) {
  return request(server)[method](path)
    .set("Authorization", `Bearer ${token}`);
}

function getTasksFromResponse(response) {
  if (Array.isArray(response.body)) {
    return response.body;
  }

  return response.body.tasks || [];
}

before(async () => {
  await setupDatabase();

  server = app.listen(0);

  const registration = await request(server)
    .post("/auth/register")
    .send({
      name: "Test User",
      email: testEmail,
      password: testPassword
    });

  assert.equal(registration.status, 201);
  assert.ok(registration.body.token);

  token = registration.body.token;
});

after(async () => {
  // Delete only tasks created by these tests.
  // Do not delete existing user accounts or existing tasks.
  if (createdTaskIds.length > 0) {
    await pool.query(
      "DELETE FROM tasks WHERE id = ANY($1::int[])",
      [createdTaskIds]
    );
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await pool.end();
});

// 1. Authentication protection
test("Protected task routes reject requests without authentication", async () => {
  const response = await request(server).get("/tasks");

  assert.equal(response.status, 401);
});

// 2. Registration
test("A user can register an account", async () => {
  const response = await request(server)
    .post("/auth/register")
    .send({
      name: "Another User",
      email: `another-${Date.now()}@example.com`,
      password: "AnotherPassword123!"
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.ok(response.body.user);
});

// 3. Login
test("A user can log in", async () => {
  const response = await request(server)
    .post("/auth/login")
    .send({
      email: testEmail,
      password: testPassword
    });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
});

// 4. Incorrect password
test("Login rejects an incorrect password", async () => {
  const response = await request(server)
    .post("/auth/login")
    .send({
      email: testEmail,
      password: "WrongPassword123!"
    });

  assert.equal(response.status, 401);
});

// 5. Retrieve account details
test("A user can retrieve their account details", async () => {
  const response = await authRequest("get", "/auth/me");

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, testEmail);
});

// 6. Create task
test("A user can create a task", async () => {
  const response = await authRequest("post", "/tasks")
    .send({
      title: "Complete project documentation",
      priority: "high",
      category: "work",
      due_date: "2026-12-20"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.title, "Complete project documentation");
  assert.equal(response.body.priority, "high");
  assert.equal(response.body.category, "work");

  assert.ok(response.body.id);

  createdTaskIds.push(response.body.id);
});

// 7. Retrieve tasks
test("A user can retrieve their tasks", async () => {
  const response = await authRequest("get", "/tasks");

  assert.equal(response.status, 200);

  const tasks = getTasksFromResponse(response);

  assert.ok(
    tasks.some((task) => createdTaskIds.includes(task.id))
  );
});

// 8. Edit task
test("A user can edit a task", async () => {
  const taskId = createdTaskIds[0];

  const response = await authRequest("patch", `/tasks/${taskId}`)
    .send({
      title: "Updated project documentation",
      priority: "medium",
      category: "personal",
      due_date: "2026-12-25"
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.title, "Updated project documentation");
  assert.equal(response.body.priority, "medium");
  assert.equal(response.body.category, "personal");
});

// 9. Complete task
test("A user can mark a task as completed", async () => {
  const taskId = createdTaskIds[0];

  const response = await authRequest("put", `/tasks/${taskId}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.completed, true);
});

// 10. Search tasks
test("A user can search for tasks", async () => {
  const response = await authRequest("get", "/tasks")
    .query({ search: "Updated project documentation" });

  assert.equal(response.status, 200);

  const tasks = getTasksFromResponse(response);

  assert.ok(
    tasks.some((task) => task.id === createdTaskIds[0])
  );
});

// 11. Filter by category
test("A user can filter tasks by category", async () => {
  const response = await authRequest("get", "/tasks")
    .query({ category: "personal" });

  assert.equal(response.status, 200);

  const tasks = getTasksFromResponse(response);

  assert.ok(
    tasks.some((task) => task.id === createdTaskIds[0])
  );
});

// 12. Filter by completion status
test("A user can filter tasks by completion status", async () => {
  const response = await authRequest("get", "/tasks")
    .query({ status: "completed" });

  assert.equal(response.status, 200);

  const tasks = getTasksFromResponse(response);

  assert.ok(
    tasks.some((task) => task.id === createdTaskIds[0])
  );
});

// 13. Delete task
test("A user can delete a task", async () => {
  const taskId = createdTaskIds[0];

  const response = await authRequest("delete", `/tasks/${taskId}`);

  assert.equal(response.status, 200);

  const checkResponse = await authRequest("get", "/tasks");

  const tasks = getTasksFromResponse(checkResponse);

  assert.ok(
    !tasks.some((task) => task.id === taskId)
  );

  createdTaskIds.splice(createdTaskIds.indexOf(taskId), 1);
});