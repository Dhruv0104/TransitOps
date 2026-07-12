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

| Email | Role | Name |
|-------|------|------|
| dvpatel6048@gmail.com | Admin | Dhruv Patel |
| patelromil.surajnagar@gmail.com | Fleet Manager | Romil Patel |
| nazneenpatel189@gmail.com | Dispatcher | Nazneen Patel |
| nehapatel200512@gmail.com | Safety Officer | Neha Patel |
| echoflex2024@gmail.com | Financial Analyst | Karan Shah |

`npm run seed` loads a full **Gujarat** demo fleet (Ahmedabad / Surat / Vadodara / Rajkot corridors): GJ-plated vehicles, Gujarati drivers, completed + live trips, maintenance, fuel, tolls, and sample documents — ready for screenshots and walkthrough videos.

## Demo Workflow

1. Sign in as Fleet Manager → review vehicles (e.g. **Tata Ace Gold** `GJ-01-AB-4521`)
2. Safety Officer → check license alerts (Hardik expired; Mehul / Priya / Chirag expiring soon)
3. Dispatcher → open live trips (Ahmedabad→Surat, Surat→Mundra) or dispatch a draft
4. Complete a trip with final odometer + fuel, or close maintenance on **Tata 407** (`GJ-18`)
5. Finance → review fuel/expenses and export CSV / PDF reports
6. Admin → Users & Settings (Naroda Central Depot, INR)

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


