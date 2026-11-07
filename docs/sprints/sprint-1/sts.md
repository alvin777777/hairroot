# Sprint 1 — Software Test Specification

Version 0.2 — draft, 2026-11-07. Version 0.1 was written before implementation (commit 141f3a6). Version 0.2 renames the product context only and changes no behaviour.

API tests use Supertest against the real Express app and a real PostgreSQL test database. Mocks do not
replace persistence in these tests.

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| T-01 | AC-01 | API | Seeded user | Log in with correct credentials | 200, user without password fields, session cookie set |
| T-02 | AC-02 | API | Seeded user | Log in with a wrong password and with an unknown email | Both 401 with identical bodies; no cookie |
| T-03 | AC-03 | API | Logged-in user | Log out, then reuse the old cookie on `/api/auth/me` | 204, then 401 |
| T-04 | AC-04 | API | Logged-in user of each role | Call `/api/auth/me` | Correct identity and role |
| T-05 | AC-05 | API | No session | Call every protected Sprint 1 endpoint | All 401 with no private data |
| T-06 | AC-06 | API | One session per role | Customer calls Staff endpoints; Staff calls Customer endpoints | All 403; row counts unchanged |
| T-07a | AC-07 | Unit | A password | Hash it twice and verify | Different salted hashes; correct password verifies, wrong does not |
| T-07b | AC-07 | API | Seeded user | Inspect login and `/me` bodies and the stored row | No hash in the responses; stored value starts with `scrypt$` |
| T-08 | AC-08 | API | Login; a session row with a past expiry | Inspect the cookie; call `/me` with the expired session | httpOnly, Max-Age at most 8 hours; 401 |
| T-10 | AC-10 | API | Assigned specialist | Create a valid slot and retrieve it through the schedule list | 201; the slot appears with the same times |
| T-11a | AC-11 | Unit | Times at the boundaries | Call the slot validation rule | 15 and 120 minutes pass; 14, 121, zero, and negative fail |
| T-11b | AC-11 | API | Assigned specialist | Post a past start, 14, 15, 120, and 121 minutes | Past start: 422; 14 and 121: 400; no row stored for these. 15 and 120: 201 |
| T-12a | AC-12 | API | A slot from 10:00 to 11:00 | Post 10:30 to 11:30 | 409 `SLOT_OVERLAP`; no new row |
| T-12b | AC-12 | API | The same slot | Post 11:00 to 11:30, and 10:00 to 11:00 on another schedule | Both 201 |
| T-12c | AC-12 | Integration | 8 identical requests | Send them concurrently | One 201, seven 409; one row stored |
| T-13 | AC-13 | API | Specialist B; Specialist A's schedule | Post a slot on A's schedule | 403; no row stored |
| T-14 | AC-14 | API | One future free, one booked, one past slot | Customer lists available slots | Only the free slot; no customer fields |
| T-15 | AC-15 | API | Customer; free slot | Book it, then read the database row | 201; `ACTIVE` row owned by the customer |
| T-15b | AC-15b | API | Customer; free slot | Topics of 2, 201, 3, and 200 characters after trimming | 2 and 201: 400 with no row; 3 and 200: 201 |
| T-16 | AC-16 | API | Customer A holds the slot | Customer B books it | 409 `SLOT_TAKEN`; A's booking unchanged, one row |
| T-17 | AC-17 | Integration | 20 customers; one free slot | Send 20 booking requests concurrently | One 201, nineteen 409, one `ACTIVE` row |
| T-18 | AC-18 | API | A slot with a start in the past, inserted directly | Book it | 422 `SLOT_NOT_BOOKABLE`; no row |
| T-19 | AC-19 | API | Customer A's session; Customer B's ID in the body | Book a free slot | 201; row owned by A |
| T-20 | AC-20 | API | Bookings for A and B | A lists bookings and opens one | Only A's bookings; detail returned |
| T-21 | AC-21 | API | A booking owned by B | A requests it | 404; the body has no booking data |
| T-22 | AC-22 | API | A booked slot and a free slot | Assigned specialist lists the schedule | Both slots; customer name and topic on the booked one |
| T-23 | AC-23 | API | A booked slot on A's schedule | Specialist B requests that schedule | 403; the body has no booking data |
| T-26 | AC-26 | Component | Mocked API states | Render the three screens while loading, empty, and failing | The correct state message each time |
| T-27 | AC-27 | Component | Mocked slots for two services across two days | Choose a service, day, and time, enter a topic, and confirm | Only matching options appear; the booking is submitted for the chosen slot |
| T-30 | AC-01, AC-03 | End-to-end | Seeded database | Log in through the browser, log out, then open a protected page | Home page; login page; redirect to login |
| T-31 | AC-10, AC-14, AC-15, AC-20, AC-22 | End-to-end | Seeded database | Specialist creates a slot; customer books and reopens it; specialist sees the booking | Each step shows the expected data |
| T-32 | AC-16 | End-to-end | A slot booked after the customer opened the list | The customer submits a booking for it | A "slot was taken" message; the list refreshes |
| M-01 | AC-24 | Manual | A created booking | Stop and restart the API, then read the booking | The booking is returned unchanged |
| M-02 | AC-25 | Manual | The release commit | Search the repository for secrets and confirm `.env` is ignored | No real secrets; only `.env.example` files tracked |

**AC-25.** The repository contains no real secrets, and `.env` files are not tracked.

## TDD plan

These rules follow a failing test first, then implementation, with both commits kept in the history:

- AC-11, AC-12: slot duration and overlap
- AC-16, AC-17: exclusive booking and competition
- AC-21, AC-23: ownership restrictions

## Commands

| Scope | Command |
|---|---|
| Server tests | `cd server && npm test` |
| Client tests | `cd client && npm test` |
| End-to-end tests | `cd e2e && npm test` |
