# TransitOps

Smart Transport Operations Platform — digitize vehicle, driver, dispatch, maintenance, and expense management with enforced business rules and operational insights.

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ORM:** Prisma

## Project Structure

```
TransitOps/
├── backend/          # Express API + Prisma
├── frontend/         # React SPA
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL running locally or remotely

## Quick Start

### 1. Database

Create a PostgreSQL database (example name: `transitops`), then set `DATABASE_URL` in `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed   # optional demo users
npm run dev
```

API: `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## Roles (RBAC)

| Role | Focus |
|------|--------|
| Fleet Manager | Vehicles, maintenance, fleet KPIs |
| Driver / Dispatcher | Trips create / dispatch / complete |
| Safety Officer | Drivers, license compliance |
| Financial Analyst | Fuel, expenses, reports |

## Team Workflow

Commit often from each member’s own Git identity. Prefer short feature branches and clear messages:

`feat|fix|chore|docs(scope): short description`

## License

Hackathon project — for evaluation use.
