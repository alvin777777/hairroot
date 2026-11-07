# Contract: F-04 Booking

Version 0.2 — draft, 2026-11-07. Version 0.1 was written before implementation (commit 141f3a6). Version 0.2 renames the product context only and changes no behaviour. Version 0.3 revises the UI section and adds AC-27 (C-02).

**Linked requirements:** FR-05, FR-06, BR-01, BR-02, BR-06, BR-07, BR-08, NFR-04, NFR-06.
**Depends on:** F-01, F-02, F-03.

## Behaviour

1. A customer opens `/slots` and sees future slots with no active booking.
2. The customer chooses a slot and enters a topic.
3. The server takes the customer from the session, validates the topic, checks that the slot exists
   and is in the future, and inserts an `ACTIVE` booking.
4. If the insert violates the partial unique index, the request returns 409 `SLOT_TAKEN`.

**Rules and boundaries:**

- The database index, not a prior read, decides which competing request wins.
- A slot whose start equals the current time is not bookable.
- A topic is 3 to 200 characters after trimming. Lengths 2 and 201 are rejected; 3 and 200 are accepted.
- A `customerId` in the request body is ignored.
- A customer may book several non-overlapping slots. Overlap between a customer's bookings is BR-11,
  planned for Sprint 2.

## API

| Method and path | Access | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/slots/available` | Customer | none | 200 `{ "slots": [{ "id", "startAt", "endAt", "scheduleName", "specialistName" }] }`, ordered by start | 401, 403 |
| `POST /api/bookings` | Customer | `{ "slotId": number, "topic": string }` | 201 `{ "booking": Booking }` | 400 `VALIDATION_ERROR`, 401, 403, 404 `NOT_FOUND`, 409 `SLOT_TAKEN`, 422 `SLOT_NOT_BOOKABLE` |

`Booking` is `{ "id", "status", "topic", "createdAt", "slot": { "id", "startAt", "endAt", "scheduleName", "specialistName" } }`.

## UI

- `/slots` is a guided flow built from the available-slot API, with loading, empty, and error states.
- Step 1 lists services with their specialist. Step 2 lists days that have times, with the soonest selected. Step 3 lists that day's times. Step 4 summarises the choice and asks for the topic.
- Submit is disabled while the request runs.
- Success leads to the booking's detail page with a confirmation message.
- On 409 the page says that another customer has just taken the slot, refreshes the times, and keeps the chosen service.

## Data

Adds `Booking` and the `BookingStatus` enum, with only `ACTIVE` in use during Sprint 1. The migration
adds this raw SQL index:

```sql
CREATE UNIQUE INDEX booking_one_active_per_slot ON "Booking" ("slotId") WHERE status = 'ACTIVE';
```

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-14 | The list includes future unbooked slots, excludes booked and past slots, and contains no customer information. |
| AC-15 | A customer books an available slot with a valid topic, receives 201, and the booking is stored under that customer. |
| AC-15b | Topics of 2 and 201 characters after trimming return 400 with nothing stored; 3 and 200 are accepted. |
| AC-16 | Booking a slot with an active booking returns 409 `SLOT_TAKEN`, and the original booking is unchanged. |
| AC-17 | Of 20 concurrent requests from different customers for one slot, exactly 1 returns 201, 19 return 409, and 1 active booking is stored. |
| AC-18 | Booking a slot whose start has passed returns 422 with nothing stored. |
| AC-19 | A request naming another customer's `customerId` creates a booking owned by the session's customer. |
| AC-24 | A booking is still retrievable after the API process restarts. |
| AC-27 | A customer books by choosing a service, a day, and a time in order. Each step offers only available options for the earlier choices. |
