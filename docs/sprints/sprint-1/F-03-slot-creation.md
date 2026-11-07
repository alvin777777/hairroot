# Contract: F-03 Slot Creation

Version 0.1 — draft, 2026-11-07. Written before implementation.

**Linked requirements:** FR-04, BR-03, BR-04, BR-05, NFR-02.
**Depends on:** F-01, F-02. The seed provides schedules and their assigned advisors.

## Behaviour

1. An advisor opens `/schedule` and picks one of their assigned schedules.
2. The advisor enters a start and end time and submits.
3. The server checks the role, assignment, field validity, duration, future start, and overlap, then
   stores the slot.

**Rules and boundaries:**

- Duration of exactly 15 and exactly 120 minutes is valid. 14 and 121 minutes are invalid.
- A slot starting at or before the current time is rejected.
- A slot that begins exactly when another ends is valid, as they do not overlap.
- An exclusion constraint rejects overlap under competing requests. Its violation returns the same
  409 as the service check.

## API

| Method and path | Access | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/schedules/mine` | Staff | none | 200 `{ "schedules": [{ "id", "name" }] }` | 401, 403 |
| `POST /api/schedules/:id/slots` | Assigned Staff | `{ "startAt": ISO-8601, "endAt": ISO-8601 }` | 201 `{ "slot": { "id", "scheduleId", "startAt", "endAt" } }` | 400 `VALIDATION_ERROR`, 401, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `SLOT_OVERLAP`, 422 `SLOT_IN_PAST` |

Invalid durations and an end before the start return 400 with `fields.endAt`.

## UI

`/schedule` shows a schedule picker and a create form with two date-time inputs in Asia/Bangkok.
Errors appear beside the field or in a form message. On success the slot list updates and the form
clears.

## Data

Adds `Schedule` and `Slot`. The migration adds a check that `endAt > startAt` and an exclusion
constraint on `scheduleId` and the time range, using the `btree_gist` extension.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-10 | An assigned advisor creates a valid slot, receives 201, and can retrieve it afterwards. |
| AC-11 | A past start, an end not after the start, and durations of 14 and 121 minutes are rejected with nothing stored; 15 and 120 minutes are accepted. |
| AC-12 | A slot overlapping another on the same schedule returns 409 with nothing stored; an adjacent slot and an equal time on another schedule are accepted. |
| AC-13 | An advisor creating a slot on a schedule not assigned to them receives 403 with nothing stored. |
