# AdvisorBook — Software Requirements Specification

| | |
|---|---|
| **Version** | 0.1 — draft, 2026-11-07, pending teammate review |
| **Course theme** | Theme 1: Appointment and Scheduling System |
| **Chosen context** | Student academic advising in a university department |

## 1. Stakeholder problem

Students need time with their academic advisors, and advisors hold limited office hours. When
appointments are arranged through chat and email, students cannot see which times are free, two
students can believe they hold the same time, and advisors have no single list of who is coming.

AdvisorBook lets advisors publish bookable times and lets students reserve one of those times, with
the system guaranteeing that a time is never given to two students.

## 2. Actors and responsibilities

| Actor | System role | Responsibilities |
|---|---|---|
| Student | `CUSTOMER` | Finds available times, books them, and tracks their own appointments. |
| Advisor | `STAFF` | Publishes available times on schedules assigned to them and inspects those bookings. |
| Anonymous visitor | none | Can only reach the login page. |
| Seed operator (developer) | none | Creates demo accounts and schedule assignments through the seed script. |

The course brief names the roles Customer and Staff. The code uses those names, and the UI shows
"Student" and "Advisor".

## 3. Scope

### In scope for the complete product

- Login, logout, and current-user identity with two roles.
- Advisor schedules and appointment slots, including recurring creation and slot maintenance.
- Booking, cancellation, and rescheduling with conflict prevention.
- Filtering, appointment outcomes, and an appointment summary for advisors.

### Explicit exclusions

- Self-registration, password recovery, email verification, and account administration. Accounts are
  seeded.
- Real email, SMS, calendar, or other external integrations. Data is synthetic.
- Payment of any kind.
- Group appointments. Every slot is exclusive to one student.
- A waiting list for full schedules.
- Native mobile applications.

## 4. Functional requirements

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A seeded user can log in with an email and password and receives a session. | 1 |
| FR-02 | A logged-in user can log out, after which the session no longer works. | 1 |
| FR-03 | A logged-in user can retrieve their own identity and role. | 1 |
| FR-04 | An advisor can create a slot with a start and end time on a schedule assigned to them. | 1 |
| FR-05 | A student can list future, unbooked slots with the advisor name and time. | 1 |
| FR-06 | A student can book an available slot, giving a short discussion topic. | 1 |
| FR-07 | A student can list their own bookings and open the detail of one booking. | 1 |
| FR-08 | An advisor can list the slots and bookings on a schedule assigned to them, including student name and topic. | 1 |
| FR-09 | A student can cancel their own future booking, which makes the slot available again. | 2 |
| FR-10 | A student can move a booking to another available slot. | 2 |
| FR-11 | An advisor can edit or remove an unbooked future slot. | 2 |
| FR-12 | An advisor can create a weekly series of slots in one operation. | 2 |
| FR-13 | An advisor can cancel a booking on their schedule, giving a reason the student can read. | 2 |
| FR-14 | A student can filter available slots by advisor and date range. | 3 |
| FR-15 | An advisor can filter schedule bookings by status and date range. | 3 |
| FR-16 | An advisor can record an appointment outcome of Completed or No-show. | 3 |
| FR-17 | An advisor can view a summary of appointments per schedule: booked, cancelled, completed, no-show, and utilisation. | 3 |
| FR-18 | A student and advisor can read the status history of a booking. | 3 |

## 5. Business rules

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | A slot can have at most one active booking, including when requests compete. | 1 |
| BR-02 | A slot can be booked only while its start time is in the future. | 1 |
| BR-03 | A slot must start in the future, end after it starts, and last 15 to 120 minutes. | 1 |
| BR-04 | Slots on the same schedule must not overlap. Adjacent slots are allowed. | 1 |
| BR-05 | Only the advisor assigned to a schedule can create slots on it or read its bookings. | 1 |
| BR-06 | A student can read only their own booking details. The available-slot list never reveals who booked what. | 1 |
| BR-07 | The booking owner comes from the session. A client-supplied student ID is ignored. | 1 |
| BR-08 | A booking topic is required and is 3 to 200 characters after trimming. | 1 |
| BR-09 | A student can cancel or reschedule until 24 hours before the slot starts. | 2 |
| BR-10 | Rescheduling is atomic: if the new slot cannot be booked, the original booking is unchanged. | 2 |
| BR-11 | A student cannot hold two active bookings that overlap in time. | 2 |
| BR-12 | A slot with an active booking cannot be edited or removed. The advisor must cancel the booking first. | 2 |
| BR-13 | An advisor cancellation requires a reason of 3 to 200 characters. | 2 |
| BR-14 | An outcome can be recorded only on an active booking whose slot has started. | 3 |
| BR-15 | Summary figures include only schedules assigned to the requesting advisor. | 3 |

## 6. Non-functional requirements

| ID | Requirement and measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Every protected endpoint answers an unauthenticated request with 401 and no private data. | API tests | 1 |
| NFR-02 | Role and ownership rules are enforced by the backend; forbidden requests return 403 or 404 and change nothing. | API and database tests | 1 |
| NFR-03 | Passwords are stored only as salted scrypt hashes and never appear in an API response. | Unit and API tests | 1 |
| NFR-04 | Of 20 concurrent booking requests for one slot, exactly 1 succeeds, 19 receive 409, and 1 active booking is stored. | Integration test against PostgreSQL | 1 |
| NFR-05 | Session cookies are httpOnly, last at most 8 hours, and expired or logged-out sessions are rejected. | API tests | 1 |
| NFR-06 | Bookings survive an application restart. | Manual restart check in Sprint 1; automated in Lab 5 | 1 |
| NFR-07 | No real secret is committed; configuration comes from environment variables with a documented example file. | Repository search and review | 1 |
| NFR-08 | Every data screen shows distinct loading, empty, and error states. | UI tests | 1 to 3 |
| NFR-09 | Core journeys work at a 375 px viewport without horizontal page scrolling. | Playwright | 3 |
| NFR-10 | With 1,000 slots seeded, the available-slot API responds within 500 ms at the 95th percentile, measured locally. | Scripted measurement | 3 |
| NFR-11 | The application runs in a Docker container on GCP with durable PostgreSQL storage, deployed from `main`. | Lab 5 pipeline and smoke test | 2 |
| NFR-12 | A release to `main` requires all required automated tests to pass. | Local evidence in Sprint 1; CI from Lab 5 | 1 to 3 |

## 7. Assumptions

| ID | Assumption |
|---|---|
| A-01 | One department uses the system, and all times are shown in Asia/Bangkok. |
| A-02 | Each schedule has exactly one assigned advisor. An advisor may have several schedules. |
| A-03 | Seeded accounts satisfy the course's identity requirement. |
| A-04 | A cancelled booking is retained for history and no longer blocks its slot. |

## 8. Decisions

| ID | Question | Decision | Reason |
|---|---|---|---|
| D-01 | Which context? | Academic advising | Familiar to both students and gives clear rules. |
| D-02 | How long is a slot? | 15 to 120 minutes, chosen per slot | Advising needs vary; the limits reject obvious mistakes. |
| D-03 | Who changes availability? | Only the advisor assigned to the schedule | Matches the theme's authorisation requirement. |
| D-04 | What is the cancellation limit? | 24 hours before the start | Gives another student time to take the slot. |
| D-05 | How is double booking prevented? | A partial unique index on active bookings per slot | Holds under concurrency, unlike a check made only in application code. |
| D-06 | Which stack? | The stack from Labs 1 to 4 | The course encourages it and both students know it. |

## 9. Open questions

| ID | Question | Status |
|---|---|---|
| Q-01 | Does the instructor or TA require anything further about the chosen context? | Open. The brief lists advising as an acceptable context, so work proceeds on that basis. |
