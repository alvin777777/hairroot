# Contract: F-07 Rescheduling

Version 0.1 — 2026-11-28. Written by ไอโว before any F-07 test or implementation commit. Teammate review of this contract is required before the RED tests are committed.

**Linked requirements:** FR-10, BR-09, BR-10, BR-01, BR-02, BR-06, BR-07, NFR-02.
**Depends on:** F-01, F-02, F-04, F-05, F-06. **Sprint:** 2.
**Issue:** #68.

## Behaviour and workflow

1. The customer opens one of their bookings and chooses **Change time**.
2. The UI lists available slots (the same list as booking, `GET /api/slots/available`). The customer picks one and confirms.
3. The server derives the customer from the session and loads that customer's booking. A booking owned by someone else is indistinguishable from a missing booking.
4. The move is allowed only when all of these hold:
   - the booking is `ACTIVE`;
   - its **current** slot starts at least 24 hours after the server's current time (BR-09). Exactly 24 hours is allowed; one millisecond later is too late;
   - the target slot exists, starts after the current time (BR-02), and is not the booking's current slot;
   - no other active booking holds the target slot (BR-01).
5. A successful move changes the **same booking row**: `slotId` points to the new slot. The booking ID, owner, topic, status and `createdAt` do not change. The old slot becomes available immediately; the new slot is booked.
6. The move is atomic (BR-10). It is one conditional `UPDATE` guarded by the partial unique index `booking_one_active_per_slot`. If any check fails or the insert would violate the index, the booking still points to its original slot and nothing else changes.
7. The target slot's duration is not revalidated: a legacy short slot (Lab 7 BR-03) that is available can be chosen, like in booking.

The cutoff applies to the booking's current slot only. The target slot only has to be in the future, the same as booking a new slot.

**F-08 (BR-11) interaction.** When F-08 is implemented, rescheduling must also reject a target that overlaps another active booking of the same customer. The booking being moved is excluded from that check. Until F-08 is merged, F-07 does not enforce BR-11. F-08's contract adds the test.

## UI

| State | Contract |
|---|---|
| Entry | Booking detail shows **Change time** next to **Cancel booking**, under the same condition: status `ACTIVE` and current start at least 24 hours away. Otherwise the action is hidden. |
| Picker | Lists available slots with day, time, specialist and service. Loading, empty (*No other times are available.*) and error states are distinct. The booking's current slot is never offered. |
| Confirm | *Move your booking from {old time} to {new time}?* Dismissing sends no request. |
| Success | The detail shows the new time, specialist and service, with *Booking moved to {new time}.* The topic is unchanged. |
| Failure | The detail still shows the original time. The API message is shown (for example *Another customer has just taken this time.*), and the picker list reloads. Success is never reported for a failed request. |

The server decides ownership, cutoff and availability. UI visibility is a convenience, not an access check.

## API

`POST /api/bookings/:id/reschedule`, customer session required. Body `{ "slotId": number }`.

| Result | Status and code | When |
|---|---|---|
| Success | 200 `{ "booking": BookingView }` | Same booking ID, new `slot`, unchanged `topic` and `status: "ACTIVE"` |
| Not signed in | 401 `UNAUTHENTICATED` | No session |
| Wrong role | 403 `FORBIDDEN` | Staff session |
| Bad input | 400 `VALIDATION_ERROR`, `fields.slotId` | `slotId` missing, not a positive integer |
| No such booking | 404 `NOT_FOUND` | Invalid ID, missing, or another customer's booking |
| No such slot | 404 `NOT_FOUND` | Target slot does not exist |
| Not active | 409 `BOOKING_NOT_ACTIVE` | Booking is `CANCELLED`, or a competing change won (see below) |
| Too late | 422 `RESCHEDULE_CLOSED` | Current slot starts less than 24 hours from now |
| Target not bookable | 422 `SLOT_NOT_BOOKABLE` | Target slot starts at or before now |
| Same slot | 422 `SAME_SLOT` | Target is the booking's current slot |
| Target taken | 409 `SLOT_TAKEN` | Another active booking holds the target, including when it wins a race |

Errors use the existing shape `{ error, code, fields? }`. No error changes the booking or any slot.

`GET /api/bookings/mine`, `GET /api/bookings/:id`, `GET /api/slots/available` and the specialist schedule keep their response shapes.

## Data

No schema change and no migration. The move is a single conditional update:

```
UPDATE "Booking" SET "slotId" = :target
WHERE id = :id AND "customerId" = :me AND status = 'ACTIVE' AND "slotId" = :current
```

- 0 rows updated: another request changed or cancelled the booking first; return 409 `BOOKING_NOT_ACTIVE`.
- Unique-index violation (P2002): the target was taken; return 409 `SLOT_TAKEN`. The row keeps `:current`.

Matching on `"slotId" = :current` means two concurrent moves of one booking cannot both succeed, and a cancellation racing a move leaves exactly one of them applied.

Status history (where the booking used to be) is not stored. F-14 (Sprint 3) owns history and will add it.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-40 | A customer moves their own active booking to an available future slot; the same booking ID now has the new slot with the same topic; the old slot is available again and the new one is not. |
| AC-41 | Moving at exactly 24 hours before the current slot succeeds; closer than 24 hours, including after start, returns 422 `RESCHEDULE_CLOSED` and the booking is unchanged. |
| AC-42 | Anonymous, staff, and another customer cannot move the booking (401, 403, 404); the booking is unchanged. |
| AC-43 | A taken, past, missing, same, or invalid target is rejected with its error, and the booking still points to its original slot (BR-10). A cancelled booking cannot be moved (409). |
| AC-44 | Under competition, at most one request wins: a move and another customer's booking of the same target, or two moves of one booking, never leave a slot with two active bookings or a booking on two slots. The loser gets 409 and its own state is unchanged. |
| AC-45 | The UI offers *Change time* only when allowed, confirms, shows the new time on success, and on failure keeps the original time and shows the error. After reload, My bookings and the specialist's schedule show the move. |

## Software test specification

| Test | Level | Input and precondition | Expected result |
|---|---|---|---|
| T-46 | API + PostgreSQL | C1 owns an active booking on slot A (more than 24 h away); slot B is available. Move to B; then list available slots, C1's bookings, and the specialist's schedule. | 200, same booking ID, slot B, same topic. A is in the available list and B is not. Specialist sees A Available, B Booked by C1. |
| T-47 | API + PostgreSQL | Freeze time. Bookings whose current slots start exactly 24 h and 24 h − 1 ms from now. | First move 200. Second 422 `RESCHEDULE_CLOSED`; booking still on its original slot. |
| T-48 | API + PostgreSQL | Move C1's booking as anonymous, as staff, as C2; and with booking IDs `abc`, `0`, and a missing ID. | 401, 403, 404, 404, 404, 404. Database row unchanged. |
| T-49 | API + PostgreSQL | Targets: slot held by C2; slot that already started; missing slot ID; C1's current slot; body without `slotId`; `slotId: "x"`. Also a cancelled booking moved to a free slot. | 409 `SLOT_TAKEN`; 422 `SLOT_NOT_BOOKABLE`; 404; 422 `SAME_SLOT`; 400; 400; 409 `BOOKING_NOT_ACTIVE`. After each, the booking's `slotId` is unchanged and target slots are unchanged. |
| T-50 | API + PostgreSQL | (a) C1 moves to B while C2 books B, in parallel. (b) Two parallel moves of C1's booking to B and to C. | (a) Exactly one 2xx; B has one active booking; if C1 lost, C1 is still on A. (b) Exactly one 200, one 409; the booking is on B or C, and the other target is still available. |
| T-51 | API + PostgreSQL | A legacy 15-minute available slot inserted with Prisma. C1 moves to it. | 200; the slot's times are unchanged (no duration revalidation). |
| T-52 | Component | Detail with an eligible booking; booking less than 24 h away; cancelled booking. Picker with slots; dismiss confirm; mocked success; mocked 409 `SLOT_TAKEN`. | Action shown only for the eligible booking. Dismiss sends no request. Success shows the new time and message. Failure keeps the old time, shows the error, and reloads the list. |
| T-53 | End-to-end | Seeded C1 booking more than 24 h away and another available slot. | C1 moves through the UI; after reload the detail and My bookings show the new time; the specialist sees the old time Available and the new one Booked. |

Regression: Sprint 1 booking and ownership tests (T-14 to T-21, T-31, T-39), F-06 T-40 to T-45, and F-16 T-33 to T-38 still pass.

## Definition of Done

- This contract is teammate reviewed before the RED test commit. The PR records the order: contract, RED, GREEN.
- RED: T-46 to T-53 fail on the pre-change `sprint-2-staging` commit for the missing behaviour, not for set-up errors.
- GREEN: T-46 to T-53 and all regressions pass against PostgreSQL; client and server builds pass.
- No migration; no change to the response shapes listed above.
- Traceability updated: FR-10 → AC-40, AC-45 / T-46, T-52, T-53; BR-09 → AC-41 / T-47; BR-10 → AC-43, AC-44 / T-49, T-50.
- A teammate reviews the implementation PR; CI passes on the PR into `sprint-2-staging`.
- F-07 is called complete only at its verified level: merged to staging, then released and deployed with the Sprint 2 release.
