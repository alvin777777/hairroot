# Contract: F-16 Public Booking Pulse

Version 0.1 — draft, 2026-11-08. Proposed change C-03; pending teammate review before implementation is integrated.

**Linked requirements:** FR-19, BR-16, NFR-08, NFR-13.
**Depends on:** F-04. Uses booking records and slot start times; no schema change.
**Issue:** #23.

## Behaviour

- `/` is a public Home page. Opening it does not require login and does not redirect an anonymous
  visitor to `/login`.
- The page shows booking activity for the current date in Asia/Bangkok and the following six
  calendar dates. It counts only active bookings whose slot starts after the current instant and
  before the end of that seven-date window. A booking earlier today is not upcoming.
- Each date is present in the result, including dates with zero bookings. The total is the sum of
  the seven daily counts. Dates and day grouping use Asia/Bangkok.
- Booking activity is a snapshot loaded when Home opens. Reopening or reloading Home fetches fresh
  totals; no live push or polling is required.
- The portrait shows one hair strand for each upcoming booking, up to 28 visible strands. The
  numeric total remains exact above that cap. The daily bars show the same counts; the busiest date
  is the earliest date with the maximum count. If all counts are zero, Home says “No bookings yet”.
- A failed activity request shows an unavailable message and does not present the failure as zero
  bookings. The sign-in or dashboard links remain usable.
- Anonymous visitors are directed to sign in. Customers can proceed to booking, specialists to
  their schedule. The HairRoot brand link in authenticated navigation returns to Home.

## API

| Method and path | Access | Success | Errors |
|---|---|---|---|
| `GET /api/public/popularity` | Public | 200 `{ "days": [{ "date": "YYYY-MM-DD", "bookings": number }], "totalBookings": number }` | 500 `INTERNAL_ERROR` |

The response contains exactly seven Bangkok calendar dates, starting today. It returns aggregate
counts only: no booking, slot, schedule, specialist, or customer identifiers or details. Only
active bookings with future slot start times count toward the totals.

## UI

- `/` presents a short introduction, the portrait and booking total, the seven daily bars, and a
  sign-in or role-appropriate action.
- Loading, empty (seven zero counts), and error states are distinct.
- At 375 px width the page has no horizontal scrolling.

## Data

No schema change. Counts are computed from active bookings joined to their slot start times.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-28 | An anonymous visitor can open `/` and see Home without being redirected to login. |
| AC-29 | The public API returns seven Bangkok date buckets for today and the following six dates; each count is the number of active bookings with a slot start after now and before the window end, and the total equals the sum of the buckets. |
| AC-30 | The public API returns no appointment, schedule, specialist, or customer identifiers or details. |
| AC-31 | The portrait renders `min(totalBookings, 28)` visible strands and shows the exact booking total. |
| AC-32 | Daily bars use the API counts, identify the earliest busiest date, and show “No bookings yet” when all counts are zero. |
| AC-33 | A failed API request shows an unavailable state rather than zero counts; the sign-in or dashboard actions remain available. |
| AC-34 | Home has no horizontal page scrolling at 375 px, and the authenticated HairRoot brand link returns to Home. |

## Test plan

| Test | Type | Acceptance criteria | Check |
|---|---|---|---|
| T-33 | API | AC-29 | Seed active bookings in and outside the time window; assert all seven dates, daily counts, and total. |
| T-34 | API | AC-30 | Call without a session and assert the response contains counts only, with no identifying fields. |
| T-35 | Component | AC-31 | Render zero, under-cap, and over-cap counts; assert the number of strands and exact total. |
| T-36 | Component | AC-32, AC-33 | Assert busiest-day and all-zero labels, then API failure copy and usable actions. |
| T-37 | End-to-end | AC-28, AC-34 | Open Home anonymously and as each role; verify destinations and return-home navigation. |
| T-38 | End-to-end | AC-34 | At 375 px, verify the Home page does not scroll horizontally. |

## Open questions

- Teammate review of proposed SRS change C-03 and this contract.
- Confirm whether a later release should add live updates; this contract uses a fresh snapshot on page load.
