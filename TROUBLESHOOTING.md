# Task Manager Troubleshooting Guide

This file contains the problems I encountered while building the Dockerized Task Manager.

Each problem is documented as:

1. What I saw
2. What it meant
3. Why it happened
4. How I fixed it
5. What I should remember


## 1. Frontend Dockerfile was wrong

### What I saw

My first frontend Dockerfile had things like:

    WORKDIR home/app
    RUN npm install
    EXPOSE 3000

### What it meant

I was treating the frontend like a Node.js application.

But this frontend was only HTML, CSS and JavaScript.

Nginx was being used to serve the frontend.

### Why it happened

I was still thinking about the frontend like my Node.js backend.

The backend needs Node.js and npm.

The frontend does not need them because Nginx can simply serve the HTML files.

### How I fixed it

I changed the frontend Dockerfile to:

    FROM nginx

    COPY frontend/ /usr/share/nginx/html/

    EXPOSE 80

### What I should remember

For a simple static frontend:

    HTML/CSS/JS
          |
          v
        Nginx
          |
          v
        Port 80

No npm install is needed unless the frontend is actually a Node-based application that needs a build process.


## 2. PostgreSQL volume path caused a problem

### What I saw

PostgreSQL gave an error related to the database data directory.

### What it meant

The volume was mounted using the old PostgreSQL data path.

I was using PostgreSQL 18.

### Why it happened

Different PostgreSQL image versions can use different data directory layouts.

### How I fixed it

I changed:

    - postgres-data:/var/lib/postgresql/data

to:

    - postgres-data:/var/lib/postgresql

### What I should remember

When using a database Docker image, the volume path matters.

If PostgreSQL complains about its data directory, check the volume path for the PostgreSQL version I am using.


## 3. Backend could not connect to PostgreSQL

### Error

I got an error similar to:

    ECONNREFUSED ...:5432

### What it meant

The backend tried to connect to PostgreSQL, but PostgreSQL was not ready yet.

The PostgreSQL container had started, but the database itself was still starting.

### Why it happened

I initially had:

    depends_on:
      - postgres

This only tells Docker:

    Start postgres before backend.

It does NOT mean:

    Wait until postgres is ready.

### How I fixed it

I added a healthcheck to PostgreSQL:

    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

Then I made the backend wait for a healthy PostgreSQL container:

    depends_on:
      postgres:
        condition: service_healthy

### What I should remember

Container started != application ready.

For databases and other services that take time to start, use a healthcheck when another container depends on them.


## 4. PostgreSQL said "role root does not exist"

### Error

I saw:

    FATAL: role "root" does not exist

### What it meant

The PostgreSQL healthcheck was trying to check PostgreSQL without explicitly telling it which database user and database to use.

My actual PostgreSQL user was:

    taskuser

My database was:

    tasks

### How I fixed it

I changed the healthcheck to:

    healthcheck:
      test: ["CMD", "pg_isready", "-U", "taskuser", "-d", "tasks"]
      interval: 10s
      timeout: 5s
      retries: 5

### What I should remember

The "root" message did not mean I needed to create a root PostgreSQL user.

My application was using:

    User: taskuser
    Database: tasks

The healthcheck should check the same database configuration.


## 5. Frontend was requesting /api/tasks and getting 404

### Error

The Nginx logs showed:

    GET /api/tasks HTTP/1.1

and:

    open() "/usr/share/nginx/html/api/tasks" failed

and:

    404

### What it meant

The frontend was asking Nginx for:

    /api/tasks

Nginx thought this was a file or folder inside:

    /usr/share/nginx/html/

There was no such file.

### Why it happened

My frontend had:

    const API_URL = "/api";

I had not configured Nginx to act as a reverse proxy.

So Nginx did not know that /api should be sent to the backend.

### How I fixed it

For this project, I decided to keep the setup simple.

I changed:

    const API_URL = "/api";

to:

    const API_URL = "http://localhost:8082";

I also enabled CORS in the backend.

In server.js:

    const cors = require("cors");

Then:

    app.use(cors());
    app.use(express.json());

I installed CORS with:

    npm install cors

### What I should remember

"/api" does not automatically mean "send this to my backend."

If Nginx is going to forward /api requests to the backend, I need to configure Nginx as a reverse proxy.

For this project, I avoided that extra configuration and had the browser call the backend directly.


## 6. I used the wrong backend port

### What happened

I tried:

    curl http://localhost:8081/tasks

and got:

    Failed to connect to localhost port 8081

### Why it happened

I had changed my backend host port from 8081 to 8082.

My Compose configuration was:

    ports:
      - "8082:3000"

### What this means

The first number is the port on my computer.

The second number is the port inside the container.

So:

    8082:3000

means:

    My computer:8082
          |
          v
    Backend container:3000

Node is still listening on port 3000 inside the container.

### How I fixed it

I changed the frontend API URL to:

    const API_URL = "http://localhost:8082";

Then I tested:

    curl http://localhost:8082/tasks

and got:

    []

### What I should remember

When I see:

    "8082:3000"

I should remember:

    HOST PORT : CONTAINER PORT

The browser uses the HOST port.

The application inside the container uses the CONTAINER port.


## 7. "Cannot GET /" when I opened the backend in Chrome

### What I saw

I opened:

    http://localhost:8082

and Chrome showed:

    Cannot GET /

### What it meant

The backend was running.

It simply did not have a route for "/".

My backend had:

    GET /tasks

It did not have:

    GET /

### How I checked it

I opened:

    http://localhost:8082/tasks

or ran:

    curl http://localhost:8082/tasks

and got:

    []

### What I should remember

"Cannot GET /" does not automatically mean the server is broken.

It can simply mean that I requested a URL that the application does not have.


## 8. I changed the frontend code but Docker was still using the old code

### What happened

I changed index.html, but the running website still behaved as if the old code was being used.

### Why it happened

My Dockerfile contains:

    COPY frontend/ /usr/share/nginx/html/

Docker copies the frontend files into the image when the image is built.

Changing the local index.html does not automatically change the file inside an already-built image.

### How I fixed it

I rebuilt the frontend image:

    docker compose up --build

If the old version still appeared, I could rebuild without cache:

    docker compose build --no-cache frontend

Then:

    docker compose up

### How I checked what was actually inside the container

I used:

    docker compose exec frontend grep -n "API_URL" /usr/share/nginx/html/index.html

This showed me the API URL that the running container was actually using.

### What I should remember

If I change a file that is copied into a Docker image, I need to rebuild the image before the container will use the new version.

Think:

    Local file
        |
        | docker build
        v
    Docker image
        |
        | docker run
        v
    Container

Changing the local file does not change an existing image.


## 9. The Add button did nothing

### What I saw

The Task Manager page loaded.

I entered a task and clicked Add.

Nothing appeared.

### What I did

Instead of immediately changing the frontend again, I tested the backend directly.

I ran:

    curl -X POST http://localhost:8082/tasks \
      -H "Content-Type: application/json" \
      -d '{"title":"devops"}'

The backend returned:

    {"id":1,"title":"devops","completed":false}

Then I checked the tasks:

    curl http://localhost:8082/tasks

It returned:

    [{"id":1,"title":"devops","completed":false}]

### What this proved

The backend was working.

PostgreSQL was working.

The API was working.

The problem was between the browser and the frontend JavaScript/API request.

### What I should remember

When debugging a multi-container application, test each part separately.

For example:

    Frontend
       |
       v
    Backend
       |
       v
    Database

If the backend works with curl, I should stop changing the backend and investigate the frontend/browser.


# Useful Debugging Commands

## Check running containers

    docker compose ps

Use this when I want to know:

- Which containers are running
- Which containers have stopped
- Container status


## Check backend logs

    docker compose logs backend

Use this when the backend is not working.


## Check frontend logs

    docker compose logs frontend

Use this when Nginx or the frontend container is not working.


## Show only recent backend logs

    docker compose logs backend --tail=20


## Test the backend

    curl http://localhost:8082/tasks

If I get:

    []

the backend is reachable and there are currently no tasks.


## Test creating a task

    curl -X POST http://localhost:8082/tasks \
      -H "Content-Type: application/json" \
      -d '{"title":"devops"}'


## Check a file inside a running container

Example:

    docker compose exec frontend grep -n "API_URL" /usr/share/nginx/html/index.html

This is useful when I want to confirm that the running container actually contains my latest code.


## Rebuild after changing application code

    docker compose up --build


## Rebuild without using the cache

    docker compose build --no-cache frontend


# My Main Debugging Lessons

When something does not work, do not immediately change everything.

Check the layers one at a time.

    1. Is the container running?

       docker compose ps

    2. Is the application running?

       docker compose logs backend

    3. Can I reach the backend?

       curl http://localhost:8082/tasks

    4. Can the backend reach PostgreSQL?

       Check backend logs.

    5. Does the frontend contain the latest code?

       docker compose exec frontend grep -n "API_URL" /usr/share/nginx/html/index.html

    6. Is the browser making the correct request?

       Check the browser Developer Tools.


# Final Architecture

The application has three main services:

    Browser
       |
       v
    Frontend (Nginx)
       |
       v
    Backend (Node.js + Express)
       |
       v
    PostgreSQL

Frontend:

    localhost:8083

Backend:

    localhost:8082

Backend container:

    port 3000

PostgreSQL:

    port 5432 inside the Docker network

The frontend communicates with the backend.

The backend communicates with PostgreSQL.

The browser does not communicate directly with PostgreSQL.
