Español: [README.es.md](README.es.md)

# ReservaYa

Booking platform for sports courts (soccer, basketball, tennis, etc.). Users browse courts, see their availability in real time and book a time slot; owners publish their courts, set schedules and manage bookings.

It's an academic project that shows a **hybrid database architecture**: PostgreSQL (SQL) and MongoDB (NoSQL) living in the same backend, each used for the kind of data it fits best.

## Why two database engines?

| PostgreSQL (relational) | MongoDB (documents) |
|---|---|
| `users`: client and owner accounts | `reviews`: court reviews |
| `venues`: published courts | `notifications`: event notifications |
| `schedules`: weekly schedule of each court | |
| `reservations`: time slot bookings | |

**PostgreSQL** holds the data with strict relationships and referential integrity: a reservation belongs to a user and a court, two reservations can't overlap, a schedule belongs to a court. These rules rely on foreign keys, transactions and row locks (to avoid double bookings when reserving).

**MongoDB** holds flexible, write-heavy data that doesn't need a strict relationship: a review can carry different fields depending on the case (tags, owner reply, photos in the future) and notifications have a different shape depending on the event type (`metadata` is schema-free). Neither collection needs multi-table transactions or joins with other tables.

## Stack

- **Backend:** Node.js + Express, Sequelize (PostgreSQL) and Mongoose (MongoDB), JWT authentication.
- **Frontend:** React + Vite + Tailwind CSS, React Router, Axios.
- **Infrastructure:** Docker Compose to run PostgreSQL and MongoDB locally.

## Project structure

```
ReservaYa/
├── backend/         # API REST (Express + Sequelize + Mongoose)
│   └── src/
│       ├── models/sql/     # User, Venue, Schedule, Reservation (PostgreSQL)
│       ├── models/nosql/   # Review, Notification (MongoDB)
│       ├── controllers/
│       ├── routes/
│       └── seed.js         # Datos de ejemplo
├── frontend/         # SPA en React
│   └── src/
│       ├── pages/
│       ├── components/
│       └── context/        # Auth y notificaciones (toasts)
└── docker-compose.yml       # PostgreSQL + MongoDB
```

## Running it locally

### 1. Start the databases

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5433` and MongoDB on `localhost:27017`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed   # crea usuarios, canchas y datos de ejemplo
npm run dev    # http://localhost:4000
```

Test credentials created by the seed:

- Owner: `owner@reservaya.com` / `password123`
- Client: `client@reservaya.com` / `password123`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # http://localhost:5173
```

## Main flow

1. An **owner** signs up, publishes a court and defines its weekly schedule.
2. A **client** browses courts, filters by sport, sees the time slot availability for a specific day and books a free slot.
3. The backend checks, in a PostgreSQL transaction, that the slot doesn't overlap another active reservation before confirming it.
4. When a reservation is created, confirmed or cancelled, a notification is created in MongoDB for the other party.
5. After a confirmed reservation, the client can leave a review (MongoDB) that is added to the court's average rating.

## Automated tests

```bash
# Backend (requiere una base de datos de prueba, ver backend/.env.test)
cd backend
npm test        # 12 unit tests + 35 tests de integración (Vitest + Supertest)

# Frontend
cd frontend
npm test        # 19 tests de componentes (Vitest + React Testing Library)
```

The integration tests run against a real Postgres/Mongo database (no mocks) and are meant to cover mostly the negative cases: invalid credentials, roles without permission, another user's resources, overlapping reservations, etc., not just the happy path.

## Deploying on Render

Live demo: https://reservaya-frontend.onrender.com (the free plan puts the API to sleep; the first load can take up to a minute). Demo accounts are on the login screen.

The repo ships a `render.yaml` (Blueprint) that creates three resources: the API (`reservaya-api`), the managed PostgreSQL database (`reservaya-db`) and the frontend static site (`reservaya-frontend`).

1. In the Render dashboard: **New > Blueprint**, point it at the repo and apply.
2. Render has no managed MongoDB service. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and paste its connection string into the `MONGO_URL` variable of the `reservaya-api` service (it's empty by default, you have to fill it in by hand in the dashboard).
3. Render subdomains are global: if the name is already taken, Render adds a suffix to the service (this repo's API ended up as `reservaya-api-6h48.onrender.com`; `reservaya-api.onrender.com` belongs to someone else). Check the real URL of your services and adjust `VITE_API_URL` and `CORS_ORIGIN` in `render.yaml`.
4. The frontend is an SPA with React Router (routes like `/iniciar-sesion`, `/canchas/:id`). The `render.yaml` includes a rewrite rule (`/* -> /index.html`) so those routes don't return 404 on reload or when entering through a direct link.
5. To have the demo data in production, leave `SEED_DEMO_IF_EMPTY=true` on the API (it's already in `render.yaml`): on startup, it seeds courts and test accounts only if the database is empty. `npm run seed` wipes all the tables, which is why it refuses to run with `NODE_ENV=production`.

## API (summary)

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` / `/api/auth/login` | Sign up and log in |
| GET | `/api/venues` | List courts (filters: `sportType`, `search`) |
| GET | `/api/venues/:id/availability?date=` | Available slots for a day |
| POST | `/api/reservations` | Create a reservation (checks for overlap) |
| GET | `/api/reservations/me` | Authenticated user's reservations |
| PATCH | `/api/reservations/:id/confirm` \| `/cancel` | Confirm/cancel a reservation |
| POST | `/api/reviews` | Leave a review (requires a confirmed reservation) |
| GET | `/api/notifications/me` | User's notifications |

## Privacy

It's an academic project with demo accounts, but it does store real data if someone signs up:

- **What is stored:** name, email, role and password (only the hash, never plain text) in PostgreSQL; reservations, reviews and notifications tied to the account.
- **What for:** only so the app works (logging in, booking, reviewing). There is no advertising or third-party analytics.
- **Who else receives it:** Render hosts the API and the database, MongoDB Atlas stores reviews and notifications, and Sentry receives error reports if `SENTRY_DSN` / `VITE_SENTRY_DSN` are set (on the backend without local variables, so a password doesn't travel in an error).
- **Deleting your data:** write to me at kelvisguerrero03@gmail.com and I'll delete the account and its data. The demo on Render can be reset or wiped at any time, so don't use an email or password you care about.
