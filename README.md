# HairRoot

HairRoot is an appointment system for a hair transplant clinic. Specialists publish available times,
and customers book them. A time can never be given to two customers. It is a CPE 334 group project
(Theme 1: Appointment and Scheduling System).

Sprint 1 covers login with two roles, slot creation, booking, and booking views. All data is synthetic.

The public home page shows anonymous booking totals for the next seven days. Each upcoming booking
adds a strand to the illustration, so visitors can see how busy the clinic is before choosing a time.
It does not show customer names or appointment topics.

## Stack

| Layer | Technology |
|---|---|
| UI | React, TypeScript, Vite, Bootstrap |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL 16, Prisma |
| Tests | Vitest, Supertest, Testing Library, Playwright |

## Prerequisites

- Node.js 20 or later, and npm
- Docker, used to run PostgreSQL locally
- Git

## Setup

```bash
git clone https://github.com/alvin777777/hairroot.git
cd hairroot

# 1. Start PostgreSQL on port 5435
docker run -d --name hairroot-db \
  -e POSTGRES_USER=hairroot -e POSTGRES_PASSWORD=hairroot -e POSTGRES_DB=hairroot \
  -p 5435:5432 -v hairroot-db:/var/lib/postgresql/data postgres:16

# 2. Set up the API and demo data
cd server
cp .env.example .env
npm install
npx prisma generate
npm run db:migrate
npm run db:seed

# 3. Set up the UI
cd ../client
cp .env.example .env
npm install
```

The values in the `.env.example` files are for local development only. Never commit a `.env` file or a
real secret.

## Run

Use two terminals:

```bash
cd server && npm run dev   # API on http://localhost:3001
cd client && npm run dev   # UI on http://localhost:5173
```

## Demo accounts

These synthetic accounts come from the seed script. The password for all of them is `Password123!`.

| Role | Email |
|---|---|
| Specialist | `specialist.somchai@hairroot.test` |
| Specialist | `specialist.nida@hairroot.test` |
| Customer | `customer.anan@hairroot.test` |
| Customer | `customer.mali@hairroot.test` |
| Customer | `customer.krit@hairroot.test` |

`npm run db:seed` resets the database to this known state, including five days of future slots.

## Demo sequence

1. Log in as `specialist.somchai@hairroot.test` and add a time on **My schedule**.
2. Log out, then log in as `customer.anan@hairroot.test`.
3. On **Available times**, choose **Book**, enter a topic, and confirm.
4. Open **My bookings** to retrieve the saved booking.
5. Log in as the specialist again. The booking shows on the schedule with the customer's name and topic.

## Build and test

| Scope | Command | Notes |
|---|---|---|
| API tests | `cd server && npm test` | Needs the Docker database. Creates and uses `hairroot_test`. |
| API typecheck | `cd server && npm run typecheck` | |
| API build | `cd server && npm run build` | |
| UI tests | `cd client && npm test` | |
| UI build | `cd client && npm run build` | |

API tests use a real PostgreSQL database and clear the test database as they run. They never touch the
development database.

## Documents

| Document | Location |
|---|---|
| Requirements | [docs/srs.md](docs/srs.md) |
| Features | [docs/features.md](docs/features.md) |
| Traceability | [docs/traceability.md](docs/traceability.md) |
| System design | [docs/system-sds.md](docs/system-sds.md) |
| Sprint plan | [docs/sprints/plan.md](docs/sprints/plan.md) |
| Sprint 1 contracts and tests | [docs/sprints/sprint-1/](docs/sprints/sprint-1/) |
| Sprint 2 contracts | [docs/sprints/sprint-2/](docs/sprints/sprint-2/) |

## Workflow

1. Create an Issue linked to its feature and contract.
2. Branch from `sprint-1-staging`.
3. Open a PR into `sprint-1-staging`. The teammate reviews it, and authors do not approve their own work.
4. After integration checks pass, open a reviewed release PR from `sprint-1-staging` to `main`, then tag it.

Migrations are applied with `prisma migrate deploy`. Do not use `prisma migrate dev`, because Prisma
cannot express the raw SQL partial unique index and would try to remove it.
