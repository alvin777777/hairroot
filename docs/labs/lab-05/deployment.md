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

## Docker

| Task | Command |
|---|---|
| Build the image | `docker build -t hairroot .` |
| Run with a database | `cp .env.example .env`, choose values, then `docker compose up --build` |
| Rerun migrations and seed | `docker compose run --rm migrate` |
| Stop and delete local data | `docker compose down -v` |

The `Dockerfile` has three stages: UI build, API build, and a runtime image that runs as the
non-root `node` user on port 3000. The runtime keeps `prisma/`, `src/`, and `tsx`, because the
migration job runs `prisma migrate deploy` and the TypeScript seed from the same image. No secret is
in the image. `DATABASE_URL` and `SEED_DEMO_PASSWORD` are injected at run time.

C-03 evidence from a fresh clone: [evidence/c03-fresh-clone-compose.txt](evidence/c03-fresh-clone-compose.txt).

## GCP resources

| Item | Name |
|---|---|
| Project | `cpe334-hairroot` (Free Trial, owned by ทิฐินันท์; ไอโว has Editor) |
| Region | `asia-southeast1` |
| Artifact Registry repository | `hairroot` (image `hairroot`, tagged with the full commit SHA) |
| Cloud SQL for PostgreSQL 16 | instance `hairroot-pg`, database and user `hairroot`, tier `db-f1-micro`, storage auto-increase off |
| Secret Manager | `hairroot-database-url`, `hairroot-demo-password` |
| Cloud Run service | `hairroot`, min 0 and max 3 instances, port 3000 |
| Cloud Run job | `hairroot-migrate`: `prisma migrate deploy`, then the rerunnable seed |
| Runtime service account | `hairroot-runner`: Cloud SQL client, and reads the two secrets |
| Deployer service account | `hairroot-deployer`: Cloud Run developer, Artifact Registry writer on `hairroot` only, acts as `hairroot-runner` only; no keys |
| Workload Identity Federation | pool `github-actions`, provider `github-main` |

`CLIENT_ORIGIN` lists both Cloud Run URLs of the service, separated by commas, because the
service answers at both.

## One-time setup (project Owner, in Cloud Shell)

Both scripts are safe to rerun. Run each with `DRY_RUN=1` first and read the output.

```bash
git clone https://github.com/alvin777777/hairroot.git && cd hairroot
DRY_RUN=1 PROJECT_ID=cpe334-hairroot bash deploy/deploy.sh
PROJECT_ID=cpe334-hairroot bash deploy/deploy.sh        # Issue #31: first deploy
DRY_RUN=1 PROJECT_ID=cpe334-hairroot bash deploy/setup-wif.sh
PROJECT_ID=cpe334-hairroot bash deploy/setup-wif.sh     # Issue #32: keyless GitHub access
```

`setup-wif.sh` prints four values for the GitHub environment `demo`: `GCP_PROJECT_ID`,
`GCP_REGION`, `WIF_PROVIDER`, and `WIF_SERVICE_ACCOUNT`. None is secret. The provider accepts only
tokens from `deploy.yml` on `main` of this repository, through the `demo` environment. The repository
uses immutable OIDC subject claims, so the subject includes the owner and repository IDs.

## GitHub settings

| Setting | Value |
|---|---|
| Ruleset `main: PR and test-and-docker required` | Active on `main`, with no bypass. Requires a PR with one approval and the `test-and-docker` check, with the branch up to date. Blocks deletion and force pushes. |
| Environment `demo` | Deployable from `main` only. Holds the four variables above. |
| Secret scanning and push protection | Enabled |
