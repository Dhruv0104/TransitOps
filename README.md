# TransitOps

Smart Transport Operations Platform — digitize vehicle, driver, dispatch, maintenance, and expense management with enforced business rules and operational insights.

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon or local)
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
- PostgreSQL (Neon recommended: set both `DATABASE_URL` and `DIRECT_URL`)

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env   # set Neon pooled + direct URLs
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API: `http://localhost:4000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## Demo Users (after seed)

Password for all: `password123`

| Email | Role |
|-------|------|
| dvpatel6048@gmail.com | Admin (full access, users & settings) |
| patelromil.surajnagar@gmail.com | Fleet Manager |
| nazneenpatel189@gmail.com | Dispatcher |
| nehapatel200512@gmail.com | Safety Officer |
| echoflex2024@gmail.com | Financial Analyst |

## Demo Workflow

1. Fleet Manager → register vehicle **Van-05** (max 500 kg)
2. Safety Officer → register driver **Alex** (valid license)
3. Dispatcher/Fleet → create trip cargo **450 kg** → Dispatch
4. Complete trip with final odometer + fuel
5. Fleet Manager → open maintenance (vehicle goes **In Shop**, hidden from dispatch)
6. Finance → review fuel/expenses and export CSV report

## Features

- Auth + JWT RBAC (including Admin panel)
- Users & verification (Admin)
- Organization settings + RBAC matrix (Admin)
- Vehicles & Drivers CRUD
- Trip lifecycle with business-rule validations
- Maintenance open/close status sync
- Fuel & expenses + operational cost
- Dashboard KPIs + reports/CSV
- **Bonus:** charts (Recharts), PDF export, license email reminders, vehicle documents, search/filter/sort, dark/light theme toggle


