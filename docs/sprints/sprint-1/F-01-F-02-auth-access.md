# Contract: F-01 Authentication and F-02 Access Control

Version 0.2 — draft, 2026-11-07. Version 0.1 was written before implementation (commit 141f3a6). Version 0.2 renames the product context only and changes no behaviour.

**Linked requirements:** FR-01, FR-02, FR-03, BR-07, NFR-01, NFR-02, NFR-03, NFR-05.
**Depends on:** nothing. Every other Sprint 1 feature depends on this one.

## Behaviour

1. A user submits an email and password. The email is trimmed and lower-cased before lookup.
2. On success the server creates a session, sets the cookie, and returns the user.
3. Each protected request resolves the user from the session and then applies guards in this order:
   authenticated, role, ownership.
4. Logout deletes the session and clears the cookie. Logout with no valid session still returns 204.

**Failure and boundary cases:**

- A missing email or password returns 400.
- Unknown email and wrong password return an identical 401.
- An expired, unknown, or deleted session returns 401.
- A state-changing request with the wrong `Origin` returns 403.

## API

| Method and path | Access | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/login` | Public | `{ "email": string, "password": string }` | 200 `{ "user": User }` and session cookie | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | Public | none | 204 and cookie cleared | none |
| `GET /api/auth/me` | Authenticated | none | 200 `{ "user": User }` | 401 `UNAUTHENTICATED` |

`User` is `{ "id": number, "name": string, "email": string, "role": "CUSTOMER" | "STAFF" }`.

## UI

- `/login` has email and password fields, field errors, and a general error message on 401.
- Submit is disabled while the request runs. Success leads to `/slots` for Customer or `/schedule`
  for Staff.
- The navigation bar shows the user's name and a Log out button, which returns to `/login`.
- Opening a protected route while signed out redirects to `/login`.

## Data

Adds `User` and `Session` as specified in the System-Level SDS §2. The migration creates the
`UserRole` enum and unique constraints. The seed creates 2 Staff and 3 Customer accounts with synthetic
data.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | Valid credentials return 200, the user without a password field, and a session cookie. |
| AC-02 | A wrong password and an unknown email both return 401 with an identical body, and no cookie is set. |
| AC-03 | After logout, the previous session token receives 401 from `/api/auth/me`. |
| AC-04 | `/api/auth/me` returns the identity and role of the session's user. |
| AC-05 | Every protected endpoint in Sprint 1 returns 401 without a session and includes no private data. |
| AC-06 | A Customer calling Staff endpoints and Staff calling Customer endpoints receive 403 and no change is stored. |
| AC-07 | Stored passwords are salted scrypt hashes, and no auth response contains a hash. |
| AC-08 | The session cookie is httpOnly with a lifetime of at most 8 hours, and an expired session receives 401. |
