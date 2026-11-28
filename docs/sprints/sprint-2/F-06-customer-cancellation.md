# Contract: F-06 Customer Cancellation

Version 0.1 — 2026-11-28. Written before F-06 implementation; teammate review is pending.

**Linked requirements:** FR-09, BR-09, BR-01, BR-06, NFR-02, NFR-06.
**Depends on:** F-01, F-02, F-04, F-05. **Sprint:** 2.
**Issue:** #66.

## Behaviour and workflow

1. The customer opens an existing booking from **My bookings** and requests cancellation.
2. The server derives the customer from the session and looks up that customer's booking. A booking owned by someone else is indistinguishable from a missing booking.
3. Cancellation is allowed only while the booking is `ACTIVE` and its slot starts at least 24 hours after the server's current time. Exactly 24 hours before the start is allowed; one millisecond later is too late.
4. A successful cancellation changes the existing booking row to `CANCELLED` and retains its topic, owner and slot. It does not delete the booking or slot. The slot becomes available for another customer immediately because only `ACTIVE` bookings reserve it.
5. The customer can still see the cancelled record in **My bookings** and its detail. A repeat cancellation is rejected without changing the record.

## UI, API and data

| Layer | Contract |
|---|---|
| UI | Booking detail shows the current status. Show a **Cancel booking** action only for an active booking more than 24 hours from its start; ask for confirmation. After success, show `Cancelled`, keep the detail visible and remove the action. Show API errors without reporting success. |
| API | `POST /api/bookings/:id/cancel`, customer session required. On success, 200 `{ "booking": BookingView }` with `status: "CANCELLED"`. Keep `GET /api/bookings/mine` and `GET /api/bookings/:id` response shapes; both include cancelled records. |
| Errors | 401 without a session; 403 for a non-customer; 404 for an invalid, missing or other customer's ID; 409 `BOOKING_NOT_ACTIVE` on repeat cancellation; 422 `CANCELLATION_CLOSED` inside the 24-hour window. Errors do not change the booking or slot. |
| Data | Add `CANCELLED` to `BookingStatus` through an additive Prisma migration. Keep the existing partial unique index on `(slotId)` where status is `ACTIVE`; no historical booking is rewritten. |

The server decides the cutoff and ownership. UI visibility is a convenience, not an access check. The transition uses a conditional database update so two cancellation requests cannot both report success.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-35 | A customer cancels their own active booking at least 24 hours before start; the same row becomes `CANCELLED`, remains readable, and its slot is available for another booking. |
| AC-36 | Cancellation at exactly 24 hours succeeds; cancellation closer than 24 hours, including after start, returns 422 and leaves the booking active. |
| AC-37 | An anonymous or staff request cannot cancel; another customer receives 404. Every denied request leaves the booking unchanged. |
| AC-38 | A second or concurrent cancellation cannot report another success; the stored row remains cancelled and there is no duplicate transition. |
| AC-39 | The customer UI confirms the action, reports success or failure accurately, and retains cancelled bookings in list/detail after reload. |

## Software test specification

| Test | Level | Input and precondition | Expected result |
|---|---|---|---|
| T-40 | API + PostgreSQL | Customer owns an active booking starting more than 24 hours away; cancel it, then list bookings and available slots; a second customer books the slot. | 200, same booking ID with `CANCELLED`; old owner can still read it; slot reopens and can be booked once. |
| T-41 | API + PostgreSQL | Freeze server time; cancel bookings at 24 hours and 24 hours minus 1 ms before start. | Boundary succeeds; later attempt returns 422, and the row remains `ACTIVE`. |
| T-42 | API + PostgreSQL | Send cancel as anonymous, staff, and another customer. | 401, 403, 404 respectively; database row remains `ACTIVE`. |
| T-43 | API + PostgreSQL | Cancel an already cancelled booking and submit two concurrent requests for one active booking. | Repeat returns 409; exactly one concurrent request succeeds, the other returns 409. |
| T-44 | Component | Detail contains an eligible booking; confirm or dismiss the action, then simulate success and API failure. | Dismissal sends no request; success shows `Cancelled` and removes the button; failure remains visible and does not claim success. |
| T-45 | End-to-end | Seed an eligible booking in the isolated test database; cancel through the UI, reload and revisit My bookings. | Cancelled status persists in list/detail and the freed slot is available. |

## Definition of Done

The contract is teammate reviewed; the migration is additive; T-40 to T-45 and relevant Sprint 1 booking/ownership regressions pass against PostgreSQL; UI and API builds pass; a teammate reviews the PR; CI passes on `sprint-2-staging`; the accepted Sprint 2 release records the tested commit. Until that release, mark F-06 as implemented/tested only at its actual verified level.
