# Contract: F-08 Overlap Protection

Version 0.1 — 2026-11-28. Written by ไอโว before any F-08 test or implementation commit. Teammate review of this contract is required before the RED tests are committed.

**Linked requirements:** BR-11, BR-01, BR-06, BR-07, FR-06, FR-10, NFR-02.
**Depends on:** F-04, F-06, F-07. **Sprint:** 2.
**Issue:** #71.

## Rule

A customer cannot hold two `ACTIVE` bookings whose slots overlap in time (BR-11).

- Two slots overlap when `a.startAt < b.endAt` and `a.endAt > b.startAt`. Adjacent slots (one ends exactly when the other starts) do **not** overlap.
- Slots on different schedules and with different specialists still count: the customer cannot attend both.
- Only the same customer's `ACTIVE` bookings count. `CANCELLED` bookings and other customers' bookings never block.
- The rule is checked on every write that gives a customer a slot:
  - **Booking (F-04)**, `POST /api/bookings`: the new slot must not overlap any of the customer's active bookings.
  - **Rescheduling (F-07)**, `POST /api/bookings/:id/reschedule`: the target slot must not overlap any of the customer's active bookings **other than the booking being moved**. Moving a booking to a slot that overlaps its own current slot is allowed.
- Existing data is not revalidated. If two overlapping active bookings already exist (created before F-08), both stay readable and cancellable. Moving either of them is checked against all the customer's other active bookings, including the other one.

## Concurrency

An application check alone is not enough: two parallel requests by the same customer for two overlapping slots (on different schedules) could both pass the check and both insert. The partial unique index only protects one slot.

Each guarded write runs in one database transaction that first locks the customer's row:

```
BEGIN;
SELECT id FROM "User" WHERE id = :me FOR UPDATE;   -- serialises this customer's writes
-- overlap query against the customer's ACTIVE bookings (excluding :bookingId when moving)
-- INSERT the booking, or the existing conditional UPDATE for a move
COMMIT;
```

- Other customers are not blocked; only one customer's concurrent writes wait for each other.
- The existing guards stay: partial unique index `booking_one_active_per_slot` (BR-01) and F-07's conditional update on `status` and the read `slotId` (BR-10).
- F-06 cancellation does not need the lock: cancelling cannot create an overlap.

## API

No new endpoint and no response shape change. One new error on the two existing write endpoints:

| Status and code | Message | When |
|---|---|---|
| 409 `BOOKING_OVERLAP` | *You already have a booking at this time.* | The new or target slot overlaps another active booking of this customer |

Error precedence, so existing tests keep their codes:

- **Booking:** 400 validation → 404 slot → 422 `SLOT_NOT_BOOKABLE` → 409 `BOOKING_OVERLAP` → 409 `SLOT_TAKEN`.
- **Rescheduling:** the F-07 order up to the target checks (400, 404 booking, 409 `BOOKING_NOT_ACTIVE`, 422 `RESCHEDULE_CLOSED`, 422 `SAME_SLOT`, 404 slot, 422 `SLOT_NOT_BOOKABLE`) → 409 `BOOKING_OVERLAP` → 409 `SLOT_TAKEN`.

The error must not reveal anything about other customers. It only refers to the requester's own bookings.

## UI

| Screen | Contract |
|---|---|
| Book (`/slots`) | On `BOOKING_OVERLAP`, show *You already have a booking at this time. Choose a different time or cancel the other booking first.* Keep the topic the customer typed; keep the selection cleared so they choose again. Do not reload as if another customer took the slot. |
| Change time (booking detail) | On `BOOKING_OVERLAP`, show the same message. The detail still shows the original time; the picker stays open. |

The available-slot list is not filtered by the customer's own bookings in this sprint. The server is the authority; the message explains the rejection.

## Data

No schema change and no migration. The overlap query joins `Booking` (customer, `ACTIVE`) to `Slot` times.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-46 | Booking a slot on another schedule that overlaps one of the customer's active bookings returns 409 `BOOKING_OVERLAP` and creates nothing. (Slots on one schedule never overlap, BR-04.) |
| AC-47 | Adjacent slots, other customers' bookings, and the customer's cancelled bookings do not block booking. |
| AC-48 | Rescheduling to a slot that overlaps another of the customer's active bookings returns 409 `BOOKING_OVERLAP` and the booking stays on its original slot; overlap with the booking's own current slot is allowed. |
| AC-49 | Two parallel requests by one customer for two overlapping slots (booking + booking, or booking + move) never leave two overlapping active bookings: exactly one succeeds and the other gets 409 `BOOKING_OVERLAP`. |
| AC-50 | Existing overlapping bookings created before F-08 remain readable and cancellable; the rule applies only to new writes. |
| AC-51 | The booking and change-time screens show the overlap message without claiming success and without clearing the customer's typed topic. |

## Software test specification

| Test | Level | Input and precondition | Expected result |
|---|---|---|---|
| T-54 | API + PostgreSQL | C1 holds 10:00–11:00 on schedule S. On schedule T, C1 tries 10:30–11:30 (partial), 10:15–10:45 (inside), 09:30–11:30 (covering) and 10:00–11:00 (identical). | Each 409 `BOOKING_OVERLAP`; C1's booking count unchanged. |
| T-55 | API + PostgreSQL | C1 holds 10:00–11:00. C1 books 11:00–11:30 (adjacent) and 09:30–10:00 (adjacent). C2 books an overlapping slot on T. C1 cancels, then books an overlapping slot. | All 201. |
| T-56 | API + PostgreSQL | C1 holds A 10:00–11:00 and B 14:00–15:00 (other days > 24 h away). Move B to a slot overlapping A; move A to a slot 10:30–11:30 overlapping only A itself. | First 409 `BOOKING_OVERLAP`, B unchanged; second 200. |
| T-57 | API + PostgreSQL | Free overlapping slots X (schedule S) and Y (schedule T). (a) C1 books X and Y in parallel. (b) C1 holds A; in parallel C1 books X and moves A to Y. Run each case 10 times on fresh data. | Every run: exactly one success and one 409 `BOOKING_OVERLAP`; C1 never ends with two overlapping active bookings. |
| T-58 | API + PostgreSQL | Insert two overlapping active bookings for C1 directly with Prisma. List, read and cancel one; move the other to a free slot that overlaps nothing. | List/detail 200; cancel 200; move 200. |
| T-59 | API + PostgreSQL | Precedence: C1 tries an overlapping slot that has already started; an overlapping slot taken by C2. | 422 `SLOT_NOT_BOOKABLE`; 409 `BOOKING_OVERLAP`. |
| T-60 | Component | Slots page and change-time picker, API mocked to return 409 `BOOKING_OVERLAP`. | Overlap message shown; topic text kept; no navigation; detail keeps the original time. |
| T-61 | End-to-end | Seeded C1 booking; an overlapping slot on another schedule. | C1 tries to book it in the UI and sees the overlap message; My bookings is unchanged after reload. |

Regression: T-14 to T-21, T-31, T-32, T-39 (Sprint 1 booking), F-06 T-40 to T-45, F-07 T-46 to T-53, F-16 T-33 to T-38.

If a Sprint 1 or F-07 test fixture books overlapping slots for the same customer, change the fixture times rather than the expected result, and say so in the PR.

## Definition of Done

- This contract is teammate reviewed before the RED test commit. The PR records the order: contract, RED, GREEN.
- RED: T-54 to T-61 fail on the pre-change `sprint-2-staging` commit for the missing rule, not for set-up errors. Logs in `docs/sprints/sprint-2/evidence/`.
- GREEN: T-54 to T-61 and all regressions pass against PostgreSQL; client and server builds pass.
- No migration; no response-shape change other than the new error code.
- Traceability: BR-11 → AC-46 to AC-51 / T-54 to T-61.
- A teammate reviews the implementation PR; CI passes on the PR into `sprint-2-staging`.
