# HairRoot — Deployment (Lab 5)

Status: first draft from Lab 5 #2 (Issue #28). GCP names and the release procedure are completed in
Issues #31 to #35.

## Stack and changes from the reference

HairRoot uses the reference stack from the Lab 5 Starter Kit: Node.js, Express, React, Prisma, and
PostgreSQL in one container, with Cloud Run, Cloud SQL for PostgreSQL, Artifact Registry, Secret
Manager, and GitHub Actions. Differences from the kit:

- The release branch flow uses `sprint-1-staging` as the staging branch for Lab 5.
- There is no administrator role. The seed creates synthetic Customer and Specialist accounts.
- Health endpoints are `/api/health` (process up) and `/api/ready` (database reachable, otherwise 503).

## Environment variables

| Variable | Read by | Purpose | Secret | Local value from | GCP value from |
|---|---|---|---|---|---|
| `DATABASE_URL` | Server, migrations, seed | PostgreSQL connection | Yes | `server/.env` | Secret Manager |
| `SEED_DEMO_PASSWORD` | Seed | Password of the synthetic demo accounts | Yes | `server/.env` | Secret Manager |
| `SEED_RESET` | Seed | `true` wipes data before seeding; refused in production | No | `server/.env` (default `false`) | Not set |
| `PORT` | Server | Listening port | No | `server/.env` (`3001`) | Set by Cloud Run |
| `CLIENT_ORIGIN` | Server | The only browser origin allowed for CORS and state-changing requests | No | `server/.env` | Cloud Run service URL |
| `NODE_ENV` | Server, seed | `production` enables secure cookies and refuses seed resets | No | `server/.env` | Image (`production`) |
| `CLIENT_DIST` | Server | Folder of the built UI to serve; defaults to `../client/dist` | No | Not needed | Image default |
| `VITE_API_URL` | Client build | API base URL; empty means same origin | No | `client/.env` | Empty at image build |

Only `.env.example` files are committed. `.env` files are ignored by Git, and real values never
appear in the repository, images, logs, or PDFs.

## Commands

| Task | Command |
|---|---|
| Migrate | `cd server && npm run db:migrate` |
| Seed (safe to rerun) | `cd server && npm run db:seed` |
| Server tests | `cd server && npm test` |
| Client tests and build | `cd client && npm test && npm run build` |
| E2E tests | `cd e2e && npm test` |
