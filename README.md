# QueueHCC

A queue management application with:
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL
- Frontend: React + Vite + TypeScript

This README describes how to deploy the backend to Render, the database to Render, and the frontend to Cloudflare Pages. It also includes local development setup and a recommended CI/CD workflow.

---

## 1. Backend Deployment (Render)

### Recommended Render service
- Service type: Web Service
- Environment: `Node`
- Root directory: `/backend`
- Start command: `npm run start`
- Build command: leave blank or use `npm install`
- HTTP port: `3000`
- Health check path: `/health`

### Required environment variables
Set these in Render service settings:

- `NODE_ENV` — `production`
- `PORT` — `3000`
- `DATABASE_URL` — PostgreSQL connection string for Render-managed DB
- `APP_BASE_URL` — frontend base URL or app public URL
- `SWAGGER_SERVER_URL` — backend public URL for Swagger docs (optional)
- `CORS_ORIGIN` — allowed origin(s), e.g. `https://your-cloudflare-pages-site.pages.dev`

### Backend commands
From the `backend/` folder:

- Install dependencies: `npm install`
- Run locally: `npm run dev`
- Start in production: `npm run start`
- Run Prisma migrations: `npm run migrate`
- Seed the database: `npm run seed`

### Notes
- The backend reads configuration from `backend/config.js` and environment variables.
- `DATABASE_URL` must use the Postgres URL provided by Render or your managed database.

---

## 2. Postgres Database Deployment (Render)

### Option 1: Render Managed Postgres
1. Create a new Postgres database service in Render.
2. Copy the service connection string.
3. Set the backend `DATABASE_URL` to the rendered Postgres connection string.

### Option 2: Local development with Docker Compose
Use the existing `docker-compose.yml` in the repository root.

Create a `.env` file at the repository root with values such as:

```env
POSTGRES_DB=queuehcc
POSTGRES_USER=queuehcc
POSTGRES_PASSWORD=queuehccpass
POSTGRES_PORT=5432
BACKEND_PORT=3000
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=adminpass
```

Run locally:

```bash
docker-compose up --build
```

Then initialize Prisma and seed the database:

```bash
cd backend
npm install
npm run migrate
npm run seed
```

### Database-related env vars
- `POSTGRES_DB` — local database name
- `POSTGRES_USER` — local database user
- `POSTGRES_PASSWORD` — local database password
- `POSTGRES_PORT` — local Postgres port
- `DATABASE_URL` — full connection URL used by backend

Example connection string:

```text
postgres://queuehcc:queuehccpass@localhost:5432/queuehcc
```

### Health and management
- Health check endpoint: `/health`
- Swagger docs: `/api-docs`
- Use PgAdmin at `http://localhost:8080` when running via Docker Compose

---

## 3. Frontend Deployment (Cloudflare Pages)

### Cloudflare Pages setup
- Framework preset: None
- Build command: `npm run build`
- Build output directory: `frontend/dist`
- Root directory: `frontend`

### Environment variables
Use Cloudflare Pages secrets for:

- `VITE_API_URL` — backend API base URL, e.g. `https://api.yourdomain.com`

If the frontend uses relative API routes, this may not be required. Still set it if you want the app to point to a deployed backend.

### Deployment steps
1. Connect the repository to Cloudflare Pages.
2. Set the project root to `frontend`.
3. Set the build command to `npm run build`.
4. Set the build output directory to `dist`.
5. Add `VITE_API_URL` under Environment Variables.
6. Deploy.

---

## 4. CI/CD Pipeline Guide

### GitHub Actions recommended workflow
Use GitHub Actions to build and validate both backend and frontend on push.

Example workflow configuration:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npm install
      - run: npm run migrate
      - run: npm run seed

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
```

### Deployment pipeline ideas
- Render backend service can deploy automatically from the repo branch.
- Cloudflare Pages can build frontend automatically from the same repository.
- The database can be managed separately via Render-managed Postgres.

### Required secrets and parameters
For Render and Cloudflare deployments, store these securely:

#### Backend / Render
- `DATABASE_URL`
- `NODE_ENV` (usually `production`)
- `APP_BASE_URL`
- `SWAGGER_SERVER_URL` (optional)
- `CORS_ORIGIN`
- `RENDER_API_KEY` (if using Render API deploys)
- `RENDER_SERVICE_ID` (optional for automated deploy scripts)

#### Cloudflare Pages
- `CF_API_TOKEN` — Cloudflare Pages deployment token
- `CF_ACCOUNT_ID` — Cloudflare account ID
- `CF_PROJECT_NAME` — Cloudflare Pages project name
- `VITE_API_URL`

#### Database
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` (if using PgAdmin locally)

### Local development secrets
For local development with Docker Compose, use a `.env` file and never commit it.

Example local `.env`:

```env
POSTGRES_DB=queuehcc
POSTGRES_USER=queuehcc
POSTGRES_PASSWORD=queuehccpass
POSTGRES_PORT=5432
BACKEND_PORT=3000
FRONTEND_PORT=5173
DATABASE_URL=postgres://queuehcc:queuehccpass@db:5432/queuehcc
VITE_API_URL=http://localhost:3000
APP_BASE_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=adminpass
```

---

## 5. Local Development

### Backend local startup
```bash
cd backend
npm install
npm run dev
```

### Frontend local startup
```bash
cd frontend
npm install
npm run dev
```

### Local full stack with Docker
```bash
docker-compose up --build
```

### Schema and seeding
```bash
cd backend
npm run migrate
npm run seed
```

---

## 6. Notes

- The backend expects a PostgreSQL database and uses Prisma for ORM.
- The frontend is a Vite app and builds to `frontend/dist`.
- Render and Cloudflare Pages are independent deployments; connect the frontend to the backend via `VITE_API_URL`.
- Use secure secrets storage for database credentials and deployment tokens.
