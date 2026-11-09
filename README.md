# Task Manager

A simple full-stack Task Manager application built with Docker, Node.js, PostgreSQL, and a frontend interface.

## Features

* View, Add tasks
* Mark tasks as completed
* Delete tasks
* Light, Dark, and Pink themes

## Technologies

* HTML, CSS, JavaScript
* Node.js
* PostgreSQL
* Docker
* Docker Compose

## Project Structure

```text
task-manager/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── db.js
│
├── frontend/
│   ├── Dockerfile
│   └── index.html
│
├── compose.yaml
└── README.md
```

## Running the Project Locally

### 1. Clone the repository

```bash
git clone <repository-url>
cd task-manager
```

### 2. Build the frontend image

```bash
docker build -f frontend/Dockerfile -t task-frontend .
```

### 3. Build the backend image

```bash
docker build -f backend/Dockerfile -t task-backend .
```

### 4. Start the containers

```bash
docker compose up -d
```

### 5. Check the containers

```bash
docker compose ps
```

### 6. Open the application

Open the frontend in your browser:

```text
http://localhost:8083
```

The backend API is available at:

```text
http://localhost:8082/tasks
```

The backend URL is an API endpoint, so opening `http://localhost:8082` by itself may show `Cannot GET /`. This is normal.

## API Endpoints

| Method | Endpoint     | Purpose                              |
| ------ | ------------ | ------------------------------------ |
| GET    | `/tasks`     | Get all tasks                        |
| POST   | `/tasks`     | Create a task                        |
| PUT    | `/tasks/:id` | Mark a task as completed/uncompleted |
| DELETE | `/tasks/:id` | Delete a task                        |

## Testing the Backend

Get all tasks:

```bash
curl http://localhost:8082/tasks
```

Create a task:

```bash
curl -X POST http://localhost:8082/tasks \
-H "Content-Type: application/json" \
-d '{"title":"devops"}'
```

## Rebuilding After Frontend Changes

If you make changes to `frontend/index.html`, rebuild the frontend image:

```bash
docker build -f frontend/Dockerfile -t task-frontend .
docker compose up -d
```

Then refresh the browser.

## Stopping the Project

```bash
docker compose down
```

## What I Learned

* Building Docker images using Dockerfiles
* Running multiple containers with Docker Compose
* Connecting a Node.js backend to PostgreSQL
* Connecting a frontend to a backend API
* Using Docker networking
* Testing APIs with `curl`
* Managing Docker containers and images
* Using Git and GitHub for version control

