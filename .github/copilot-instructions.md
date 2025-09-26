# Matemágica Server - AI Coding Instructions

This document provides guidance for AI agents working on the Matemágica server codebase.

## About this Project

This is the backend server for the "Matemágica" educational game. It's a simple Node.js application built with the Express framework, responsible for providing a RESTful API for user management. The data is stored in a PostgreSQL database.

## Core Architecture

The project follows a standard, minimalistic Express application structure:

-   `app.js`: The main application entry point. It initializes the Express app, sets up middleware (logging, JSON parsing, static file serving), and mounts the API routers. It also directly starts the server.
-   `db.js`: Configures and exports the PostgreSQL database connection pool. It provides a single `query(text, params)` function for all database interactions. There is no ORM; all database access is done through raw SQL queries.
-   `routes/`: This directory contains the API route definitions.
    -   `routes/users.js`: Defines all endpoints related to user management (`/users`, `/users/register`, `/users/login`, etc.).
-   `public/`: Contains static assets served directly to the client.

## Development Workflow

### Running the Application

1.  Navigate to the `matemagica` directory.
2.  Run `npm install` to ensure all dependencies are present.
3.  Run `npm start` to start the development server. The server will be available at `http://localhost:3000`.

### Database Interaction Pattern

All database operations use the `pg` library directly. To interact with the database, import the `db` module and use the `query` method.

**Example from `routes/users.js`:**

```javascript
const db = require('../db');

// ... inside an async route handler ...
try {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  // ... process results ...
} catch (err) {
  // ... handle error ...
}
```

When adding or modifying database queries, follow this existing pattern. All SQL logic is located directly within the route handler functions in the `routes/` directory.

### Conventions

-   **Asynchronous Operations:** All route handlers that interact with the database are `async` functions and use `try...catch` blocks for error handling.
-   **Security:** When returning user data in API responses, always delete the `password` field from the user object before sending it.
-   **Dependencies:** Manage all Node.js dependencies in `matemagica/package.json`.

I have created the `.github/copilot-instructions.md` file with the essential information about your project.

Do these instructions seem clear and complete? Is there anything you'd like me to add or clarify?