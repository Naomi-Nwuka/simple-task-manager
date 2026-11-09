# Task Manager

A full-stack Task Manager application built to practise and demonstrate backend development, containerisation, database management, automated testing, and version control.

The application allows users to manage their tasks through a responsive web interface, with account authentication, task organisation, filtering, and multiple visual themes.

## Features

### Task Management
- Create new tasks.
- Edit existing tasks.
- Mark tasks as completed or pending.
- Delete tasks.
- Assign priority levels: Low, Medium, and High.
- Assign categories: Work, Personal, Shopping, and Other.
- Set task due dates.
- View overdue tasks.

### User Authentication
- User registration.
- User login and logout.
- Password hashing.
- JWT-based authentication.
- User-specific task management.

### Task Organisation
- Search tasks by title.
- Filter tasks by category.
- Filter tasks by priority.
- Filter completed and pending tasks.
- Filter overdue tasks.
- Sort tasks by due date, priority, creation date, and title.

### Dashboard
- View total tasks.
- Track completed tasks.
- Track pending tasks.
- Monitor overdue tasks.

### User Interface
- Light theme.
- Dark theme.
- Pink theme.
- Theme preference saved in local storage.
- Responsive layout.

## Technologies

| Technology | Purpose |
|---|---|
| HTML | Frontend structure |
| CSS | Styling and responsive design |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend API |
| PostgreSQL | Database |
| Docker | Application containerisation |
| Docker Compose | Multi-container management |
| Supertest | API testing |
| Node.js Test Runner | Automated testing |
| Git | Version control |
| GitHub | Source code hosting |

## Project Structure

```text
task-manager/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── backend/
│   ├── tests/
│   │   └── tasks.test.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── db.js
│
├── frontend/
│   ├── Dockerfile
│   └── index.html
│
├── .dockerignore
├── .gitignore
├── compose.yaml
├── README.md
└── TROUBLESHOOTING.md
```

## Running the Project Locally

### Prerequisites

Install the following:

- Docker
- Git

### 1. Clone the repository

```bash
git clone <repository-url>
cd task-manager
```

### 2. Start the application

Build the images and start all containers:

```bash
docker compose up --build -d
```

Docker Compose starts three services:

- Frontend
- Backend
- PostgreSQL database

### 3. Check the containers

```bash
docker compose ps
```

Confirm that the containers are running.

### 4. Open the application

Frontend:

```text
http://localhost:8083
```

Backend API:

```text
http://localhost:8082
```

The backend is an API service. Opening its root URL may display `Cannot GET /`. This is normal.

Register an account through the application before managing tasks.

## Application Architecture

The application uses a three-tier architecture:

1. **Frontend:** HTML, CSS, and JavaScript provide the user interface.
2. **Backend:** Node.js and Express handle authentication, API requests, and application logic.
3. **Database:** PostgreSQL stores user accounts and tasks.

Docker Compose connects the three services through an internal Docker network.

The frontend communicates with the backend through HTTP requests, while the backend communicates with PostgreSQL to retrieve and store application data.

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Retrieve the authenticated user's details |

### Task Management

These task endpoints require a valid authentication token.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/tasks` | Retrieve the user's tasks |
| POST | `/tasks` | Create a new task |
| PATCH | `/tasks/:id` | Edit an existing task |
| PUT | `/tasks/:id` | Toggle task completion |
| DELETE | `/tasks/:id` | Delete a task |

The GET `/tasks` endpoint also supports search, filtering, and sorting through query parameters.

## Testing the Backend

The project includes automated backend tests using Node.js's built-in test runner and Supertest.

The tests cover:

- Authentication protection.
- User registration.
- User login.
- Incorrect password handling.
- Account details retrieval.
- Task creation.
- Task retrieval.
- Task editing.
- Task completion.
- Task searching.
- Category filtering.
- Completion status filtering.
- Task deletion.

### Run the tests

```bash
docker compose exec backend npm test
```

The tests use the running PostgreSQL database.

## Making Changes During Development

### Frontend changes

If you modify `frontend/index.html`, rebuild the frontend image:

```bash
docker compose up --build -d frontend
```

### Backend changes

The backend directory is mounted into the container during development, so most source-code changes are reflected without rebuilding the image.

Restart the backend if necessary:

```bash
docker compose restart backend
```

If you change dependencies or the backend Dockerfile, rebuild the backend:

```bash
docker compose up --build -d backend
```

## Useful Docker Commands

Check running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs
```

View backend logs:

```bash
docker compose logs backend
```

View frontend logs:

```bash
docker compose logs frontend
```

Stop the application:

```bash
docker compose down
```

**Note:** The application uses a named PostgreSQL volume to preserve database records. Avoid using `docker compose down -v` unless you intentionally want to delete the database volume and its data.

## Development Journey

This project was developed incrementally, starting with a basic task management application and gradually introducing more advanced application and DevOps concepts.

The development stages included:

1. Building the initial frontend interface.
2. Developing a Node.js and Express backend.
3. Integrating PostgreSQL for persistent data storage.
4. Creating Dockerfiles for the frontend and backend.
5. Containerising the application with Docker Compose.
6. Connecting application services through Docker networking.
7. Implementing task creation, editing, completion, and deletion.
8. Introducing task priorities and due dates.
9. Implementing light, dark, and pink themes.
10. Adding user registration and authentication.
11. Introducing task categories, search, filtering, and sorting.
12. Writing automated backend tests.
13. Configuring a GitHub Actions CI workflow.

## What I Learned

Through this project, I gained practical experience in:

- Building and managing Docker images.
- Writing Dockerfiles.
- Containerising multi-service applications.
- Managing services using Docker Compose.
- Connecting Node.js applications to PostgreSQL.
- Designing and working with REST APIs.
- Implementing user authentication.
- Managing application data and database migrations.
- Testing backend functionality with automated tests.
- Using Git branches, commits, and GitHub.
- Working with GitHub Actions for continuous integration.
- Troubleshooting application and container issues.

## Future Improvements

Planned enhancements include:

- Visual analytics and productivity charts.
- Calendar view.
- Date and time selection for task deadlines.
- Recurring tasks.
- Task reminders.
- Subtasks and task notes.
- Further UI improvements.

## Author

Naomi Nwuka

GitHub: [Naomi-Nwuka](https://github.com/Naomi-Nwuka)