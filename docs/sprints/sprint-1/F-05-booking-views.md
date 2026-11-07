# Contract: F-05 Booking Views

Version 0.1 — draft, 2026-11-07. Written before implementation.

**Linked requirements:** FR-07, FR-08, BR-05, BR-06, NFR-02, NFR-08.
**Depends on:** F-04.

## Behaviour

- A student lists their own bookings, soonest first, and opens one booking.
- An advisor lists all slots on an assigned schedule, each with booking status, and for booked slots
  the student's name and topic.
- A student opening another student's booking receives the same 404 as for a missing booking, so its
  existence is not revealed.
- An advisor requesting a schedule not assigned to them receives 403.

## API

| Method and path | Access | Success | Errors |
|---|---|---|---|
| `GET /api/bookings/mine` | Customer | 200 `{ "bookings": [Booking] }` | 401, 403 |
| `GET /api/bookings/:id` | Owning Customer | 200 `{ "booking": Booking }` | 401, 403, 404 `NOT_FOUND` |
| `GET /api/schedules/:id/slots` | Assigned Staff | 200 `{ "slots": [{ "id", "startAt", "endAt", "booking": null or { "id", "topic", "student": { "id", "name" } } }] }` | 401, 403 `FORBIDDEN`, 404 `NOT_FOUND` |

`Booking` is defined in the F-04 contract.

## UI

- `/bookings` lists a student's bookings, with an empty state linking to `/slots`.
- `/bookings/:id` shows date, time, advisor, topic, and status. A 404 shows "Booking not found".
- `/schedule` lists the chosen schedule's slots below the create form, showing Available or the
  student's name and topic.

## Data

No schema change.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-20 | A student's list contains only their own bookings, and they can open each one. |
| AC-21 | A student requesting another student's booking receives 404 with no booking data in the response. |
| AC-22 | An assigned advisor sees the schedule's slots, including student name and topic on booked slots. |
| AC-23 | An advisor requesting an unassigned schedule's slots receives 403 with no booking data in the response. |
| AC-26 | The slot list, booking list, and schedule screen each show loading, empty, and error states. |
