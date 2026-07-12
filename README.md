# TransitOps

A comprehensive **Smart Transport Operations Platform** designed to digitize fleet,
driver, dispatch, maintenance, and expense workflows for logistics companies.
TransitOps enforces operational business rules, role-based access control, and
real-time insights across the full trip lifecycle.

---

## Table of Contents

- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [Trip Lifecycle & Workflow](#trip-lifecycle--workflow)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Demo Users](#demo-users)
- [Screenshots](#screenshots)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Features

- **Authentication & Access Control**
  - Secure JWT login with bcrypt password hashing
  - Role-based access control (Admin, Fleet Manager, Dispatcher, Safety Officer, Financial Analyst)
  - Configurable RBAC matrix in Settings (Fleet / Drivers / Trips / Fuel-Exp. / Analytics)
  - Account lockout after repeated failed logins
  - Forgot password / reset password via email

- **Organization Settings**
  - Depot / company profile (name, address, contact, currency, distance unit)
  - Currency-aware money formatting (e.g. ₹ for INR)
  - Light / dark theme support

- **Fleet Registry**
  - Vehicle CRUD with status: Available, On Trip, In Shop, Retired
  - Registration, type, max load, odometer, acquisition cost, region
  - Vehicle document uploads (RC, Insurance, PUC, Fitness, Permit) with expiry tracking

- **Drivers & Safety**
  - Driver profiles with license number, category, expiry, safety score
  - Status: Available, On Trip, Off Duty, Suspended
  - License expiry alerts and scheduled email reminders

- **Trip Dispatcher**
  - Unique trip codes (`TRP001`, `TRP002`, …)
  - Draft → Dispatched → Completed / Cancelled lifecycle
  - ETA estimates, dispatch / complete / cancel timestamps
  - Lifecycle timeline modal for trip history
  - Cargo weight, distance, fuel, odometer, and revenue capture

- **Maintenance**
  - Open / close maintenance logs per vehicle
  - Syncs vehicle status to **In Shop** while work is active
  - Cost tracking for operational analytics

- **Fuel and Expenses**
  - Fuel logs (liters + cost) per vehicle
  - Other expenses (toll, maintenance, misc) optionally mapped to a trip
  - Operational cost breakdown (Fuel + Maintenance + Other)

- **Dashboard & Analytics**
  - Fleet KPIs, vehicle status progress bars, recent trips
  - Reports: utilization, fuel efficiency, ops cost, revenue, **ROI**
  - Monthly revenue bar chart and top costliest vehicles progress chart
  - CSV and PDF export

---

## User Roles & Permissions

| Role                  | Typical access                                          |
| --------------------- | ------------------------------------------------------- |
| **Admin**             | Full access - users, settings, RBAC matrix, all modules |
| **Fleet Manager**     | Fleet (full), Drivers (full), Maintenance, Analytics    |
| **Dispatcher**        | Trips (full), Fleet (view)                              |
| **Safety Officer**    | Drivers (full), Trips (view)                            |
| **Financial Analyst** | Fuel/Expenses (full), Fleet (view), Analytics (full)    |

Access levels per module: **full** · **view** · **none**  
Admin always has full access. The live matrix is editable under **Settings → RBAC**.

---

## Trip Lifecycle & Workflow

### Trip Stages

1. **Draft**
   - Newly created trip; vehicle/driver reserved for planning
   - Editable before dispatch

2. **Dispatched**
   - Live / in-transit trip
   - ETA and dispatch timestamp recorded
   - Vehicle & driver marked **On Trip**

3. **Completed**
   - Final odometer, fuel consumed, actual distance, revenue captured
   - Vehicle odometer updated; assets returned to Available

4. **Cancelled**
   - Trip aborted; assets released
   - Cancel timestamp recorded

### Business Rules (high level)

- Only **Draft** trips can be dispatched
- Only **Dispatched** trips can be completed
- Cargo weight cannot exceed vehicle max load
- Vehicle must be Available (and not In Shop) to start a trip
- Driver must be Available with a valid (non-expired) license
- Unassigned / invalid transitions are rejected by the API

---

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Recharts, React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Neon or local) with Prisma ORM
- **Authentication:** JWT + bcrypt
- **Extras:** PDFKit (PDF export), Nodemailer (password reset / license mail), Multer (docs), node-cron

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (Neon recommended - set both `DATABASE_URL` and `DIRECT_URL`)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/TransitOps.git
cd TransitOps
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Configure `.env` (see `backend/.env.example`):

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="your-secret-key-here"
PORT=4000
# Optional: SMTP for forgot-password & license reminders
# LICENSE_REMINDER_CRON=0 9 * * *
```

### 3. Database Setup

```bash
npx prisma migrate dev
npx prisma generate
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend
cp .env.example .env
npm install
```

```env
VITE_API_URL=http://localhost:4000/api
```

### 5. Run the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

---

## Usage

### First-time / Demo walkthrough

1. Seed the DB (`npm run seed` in `backend`) - loads a **Gujarat** demo fleet
2. Sign in as **Fleet Manager** → review vehicles (e.g. Tata Ace Gold `GJ-01-AB-4521`)
3. **Safety Officer** → check license alerts (expired / expiring soon)
4. **Dispatcher** → open live trips or dispatch a draft; complete with odometer + fuel
5. Close maintenance on shop vehicles (e.g. Tata 407 `GJ-18`)
6. **Financial Analyst** → fuel/expenses (map expense to trip) + export CSV / PDF
7. **Admin** → Users & Settings (Naroda depot, INR, RBAC matrix)

### Daily operations

- **Dispatcher:** Create / dispatch / complete trips from Trip Dispatcher
- **Fleet Manager:** Manage vehicles, maintenance, and fleet health
- **Safety Officer:** Keep driver licenses and safety scores current
- **Financial Analyst:** Log fuel & other expenses; review ROI and reports
- **Admin:** Manage users, unlock accounts, tune org settings & RBAC

---

## Demo Users

Password for all seeded users: **`password123`**

| Email                           | Role              | Name          |
| ------------------------------- | ----------------- | ------------- |
| dvpatel6048@gmail.com           | Admin             | Dhruv Patel   |
| patelromil.surajnagar@gmail.com | Fleet Manager     | Romil Patel   |
| nazneenpatel189@gmail.com       | Dispatcher        | Nazneen Patel |
| nehapatel200512@gmail.com       | Safety Officer    | Neha Patel    |
| echoflex2024@gmail.com          | Financial Analyst | Karan Shah    |

`npm run seed` loads GJ-plated vehicles, Gujarati drivers, completed + live trips, maintenance, fuel, tolls, and sample documents - ready for screenshots and walkthrough videos.

---

## Screenshots

> Place PNG/JPG files under `docs/screenshots/` (or update the paths below).
> Image slots are reserved so you can drop screenshots in without rewriting this section.

### Login & Auth

**Login page** - email, password, role selection; forgot password & lockout

![Login](docs/screenshots/Login.png)

**Forgot / Reset Password**

![ForgotPassword](docs/screenshots/ForgotPassword.png)

---

### Admin

**Users & Access** - create users, activate / unlock accounts

![UsersAccess](docs/screenshots/UsersAccess.png)

**Organization Settings** - depot, currency, distance unit

![OrgSettings](docs/screenshots/OrgSettings.png)

**RBAC Matrix** - role × module permissions

![RbacMatrix](docs/screenshots/RbacMatrix.png)

---

### Dashboard

**Fleet overview** - KPIs and vehicle status progress bars

![Dashboard](docs/screenshots/Dashboard.png)

---

### Fleet Manager

**Fleet Registry** - vehicles list, filters, status badges

![FleetRegistry](docs/screenshots/FleetRegistry.png)

**Vehicle Documents** - RC / insurance / PUC uploads

![VehicleDocs](docs/screenshots/VehicleDocs.png)

**Maintenance** - open / close shop jobs

![Maintenance](docs/screenshots/Maintenance.png)

---

### Dispatcher

**Trip Dispatcher** - trip table with ETA and lifecycle actions

![TripDispatcher](docs/screenshots/TripDispatcher.png)

**Create / Edit Trip**

![CreateTrip](docs/screenshots/CreateTrip.png)

**Trip Lifecycle Timeline**

![TripTimeline](docs/screenshots/TripTimeline.png)

**Complete Trip** - odometer, fuel, revenue

![CompleteTrip](docs/screenshots/CompleteTrip.png)

---

### Safety Officer

**Drivers & Safety** - licenses, expiry alerts, safety scores

![DriversSafety](docs/screenshots/DriversSafety.png)

---

### Financial Analyst

**Fuel and Expenses** - fuel logs, other expenses linked to trips

![FuelExpenses](docs/screenshots/FuelExpenses.png)

**Add Expense** - vehicle + trip mapping

![AddExpense](docs/screenshots/AddExpense.png)

---

### Reports & Analytics

**KPI cards** - utilization, fuel efficiency, ops cost, revenue, ROI

![ReportsKpis](docs/screenshots/ReportsKpis.png)

**Monthly Revenue** (bar chart) & **Top Costliest Vehicles** (progress bars)

![ReportsCharts](docs/screenshots/ReportsCharts.png)

**Vehicle ROI table** + CSV / PDF export

![ReportsTable](docs/screenshots/ReportsTable.png)

---

### CSV / PDF Export Results

Sample exports from **Reports & Analytics** (Financial Analyst) using the seeded Gujarat fleet.

**CSV export** - `transitops-report.csv` opened in Excel (registration, costs, revenue, ROI, …)

![ExportCsv](docs/screenshots/ExportCsv.png)

**PDF export - page 1** - title, summary KPIs, and start of the vehicle performance table

![ExportPdfPage1](docs/screenshots/ExportPdfPage1.png)

**PDF export - page 2** - continued vehicle rows / report body

![ExportPdfPage2](docs/screenshots/ExportPdfPage2.png)

---

## Database Schema

### Main Models

| Model               | Purpose                             |
| ------------------- | ----------------------------------- |
| **User**            | Auth, role, lockout / reset tokens  |
| **Organization**    | Depot profile, currency, RBAC JSON  |
| **Vehicle**         | Fleet unit + status / odometer      |
| **VehicleDocument** | Uploaded compliance docs            |
| **Driver**          | License, safety score, status       |
| **Trip**            | Dispatch lifecycle, ETA, revenue    |
| **MaintenanceLog**  | Shop jobs open/close                |
| **FuelLog**         | Fuel liters & cost                  |
| **Expense**         | Other costs; optional `tripId` link |

### Key Relationships

- Vehicle → Trips, MaintenanceLogs, FuelLogs, Expenses, Documents
- Driver → Trips
- Trip → Expenses (optional mapping for tolls / misc)
- Organization → singleton settings for the depot

### Enums

- **Role:** `ADMIN` · `FLEET_MANAGER` · `DISPATCHER` · `SAFETY_OFFICER` · `FINANCIAL_ANALYST`
- **VehicleStatus:** `AVAILABLE` · `ON_TRIP` · `IN_SHOP` · `RETIRED`
- **DriverStatus:** `AVAILABLE` · `ON_TRIP` · `OFF_DUTY` · `SUSPENDED`
- **TripStatus:** `DRAFT` · `DISPATCHED` · `COMPLETED` · `CANCELLED`

---

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request reset email
- `POST /api/auth/reset-password` - Reset with token

### Core resources

- `GET|POST /api/vehicles` · `GET|PUT|DELETE /api/vehicles/:id`
- `POST /api/vehicles/:id/documents` · document list / delete
- `GET|POST /api/drivers` · `GET|PUT|DELETE /api/drivers/:id`
- `GET|POST /api/trips` · `GET|PUT /api/trips/:id`
- `POST /api/trips/:id/dispatch` · `/complete` · `/cancel`
- `GET|POST /api/maintenance` · close / update endpoints
- `GET|POST /api/fuel`
- `GET|POST /api/expenses` · `GET /api/expenses/operational-costs`

### Insights & admin

- `GET /api/dashboard`
- `GET /api/reports` · `/export.csv` · `/export.pdf`
- `GET|POST|PUT|DELETE /api/users` (Admin)
- `GET|PUT /api/settings` · preferences / RBAC (Admin)
- `POST /api/jobs/license-reminders` - trigger reminders

---

## Project Structure

```
TransitOps/
├── backend/                      # Express API + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js               # Gujarat demo fleet seed
│   ├── scripts/                  # One-off backfills / utilities
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── jobs/                 # License reminder cron
│   │   ├── lib/                  # prisma, mail, rbac helpers
│   │   └── index.js
│   └── package.json
│
├── frontend/                     # React (Vite) SPA
│   ├── src/
│   │   ├── api/                  # API client
│   │   ├── components/           # Layout, Modal, Skeleton, …
│   │   ├── context/              # Auth + Org context
│   │   ├── constants/            # Roles / RBAC defaults
│   │   ├── pages/                # Dashboard, Fleet, Trips, …
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── docs/
│   └── screenshots/              # Drop UI screenshots here
│
└── README.md
```

---

## Key Features Breakdown

### Trip Dispatcher

- Unique trip codes and ETA column
- Role-aware actions (dispatch / complete / cancel)
- Lifecycle timeline from Draft → Dispatched → Completed / Cancelled
- Validation against vehicle load, availability, and driver license

### Fuel and Expenses

- Fuel logs and other expenses in one place
- Optional trip link on each expense (shown in Other Expenses table)
- Operational cost = Fuel + Maintenance (plus Other for visibility)

### Reports & Analytics

- Fleet utilization, fuel efficiency, ops cost, revenue, **ROI**
- Monthly revenue bar chart
- Top costliest vehicles (progress-bar chart)
- CSV + formatted PDF export

### Security

- JWT authentication
- bcrypt password hashing
- Role + RBAC middleware on routes
- Login lockout and admin unlock
- Password reset tokens with expiry

---

**Built for efficient transport operations**
