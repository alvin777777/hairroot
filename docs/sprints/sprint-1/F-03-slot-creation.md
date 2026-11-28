# Contract: F-03 Slot Creation

Version 0.4 — Lab 7 BR-03 revision, reviewed in PR #61 and implemented in PR #63. Version 0.1 was written before implementation (commit 141f3a6); 0.2 renamed the product context without a behavior change; 0.3 revised the UI section only (C-02). The 30-minute rule is deployed in release b29aef9; TA approval was not obtained.

**Linked requirements:** FR-04, BR-03, BR-04, BR-05, NFR-02.
**Depends on:** F-01, F-02. The seed provides schedules and their assigned specialists.

## Behaviour

1. A specialist opens `/schedule` and picks one of their assigned schedules.
2. The specialist enters a start and end time and submits.
3. The server checks the role, assignment, field validity, duration, future start, and overlap, then
   stores the slot.

**Rules and boundaries:**

- **Proposed Lab 7 rule:** newly created slots must last 30 to 120 minutes inclusive. 29 and 121 minutes are invalid; 30 and 120 minutes are valid.
- Slots created before the new rule takes effect are not revalidated. Existing shorter slots remain available for booking and retain their stored times.
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

`/schedule` shows a schedule picker and a create form with a date, a start time, and a duration from 30 to 120 minutes, in Asia/Bangkok. The client computes the end time, and the API request/response shape does not change. Slots are listed grouped by day. Existing shorter slots continue to appear and can be booked.
Errors appear beside the field or in a form message. On success the slot list updates and the form
clears.

## Data

Adds `Schedule` and `Slot`. The migration adds a check that `endAt > startAt` and an exclusion
constraint on `scheduleId` and the time range, using the `btree_gist` extension.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-10 | An assigned specialist creates a valid slot, receives 201, and can retrieve it afterwards. |
| AC-11 | A past start, an end not after the start, and durations of 29 and 121 minutes are rejected with nothing stored; 30 and 120 minutes are accepted. A pre-existing slot shorter than 30 minutes remains visible and bookable. |
| AC-12 | A slot overlapping another on the same schedule returns 409 with nothing stored; an adjacent slot and an equal time on another schedule are accepted. |
| AC-13 | A specialist creating a slot on a schedule not assigned to them receives 403 with nothing stored. |
