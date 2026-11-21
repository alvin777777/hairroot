# HairRoot — Sprint 1 UAT Cases and Handoff (Lab 6, Part A)

Version 0.1 — draft, 2026-11-21. Prepared by the HairRoot Product Team for the independent UAT Team.

## 1. Handoff

| Item | Value |
|---|---|
| Product | HairRoot: booking consultation appointments at a hair transplant clinic |
| Product Team | ไอโว ปีเตอร์ อัลวิน รันเน่ (67070501051), ทิฐินันท์ สอบกิ่ง (67070501018) |
| Repository | https://github.com/alvin777777/hairroot (public) |
| Sprint 1 baseline | Tag `v0.1.0-sprint1`, commit `d1e8d81`, contract in `docs/sprints/sprint-1/` |
| Release under test | [PENDING: Lab 5 release tag and commit on `main`] |
| Deployed revision and URL | [PENDING: Cloud Run revision and URL] |
| Browser | A current desktop Chrome, Edge, Firefox, or Safari. Phone width also works. |
| Time zone | All times are shown in Asia/Bangkok. |

### Scope accepted for test (Sprint 1 only)

- Sign in, sign out, and role-based pages for Customer and Specialist.
- A Specialist adds an available time to an assigned service (15 to 120 minutes, in the future, no
  overlap).
- A Customer books by choosing a service, a day, and a time, then entering a topic (3 to 200
  characters).
- Exclusive booking: one time can be booked by only one customer.
- A Customer reads only their own bookings, and a Specialist reads bookings on their own schedules.

**Not in Sprint 1, so not part of this acceptance:** cancelling or rescheduling, editing or deleting
times, repeating times, filtering, appointment outcomes, history, reports, and the public Home page.
Report anything in this list as an enhancement, not a defect.

### Accounts

Passwords are shared privately through the course handoff, never in this document or in Git. All data
is synthetic. Every case uses the labels below.

| Label | Role | Email | Assigned services |
|---|---|---|---|
| S1 | Specialist | `specialist.somchai@hairroot.test` | Hair transplant consultation; Post-procedure follow-up |
| S2 | Specialist | `specialist.nida@hairroot.test` | Hair transplant consultation |
| C1 | Customer | `customer.anan@hairroot.test` | — |
| C2 | Customer | `customer.mali@hairroot.test` | — |
| C3 | Customer | `customer.krit@hairroot.test` | — |

### Data setup, independence, and cleanup

- The live database keeps everything the UAT Team creates. Sprint 1 has no cancellation, so a booked
  time stays booked.
- To keep cases independent, each case that needs a time **creates its own** as S1, using a date 10 to
  30 days ahead and a start minute unique to your team (for example 16:07). Other cases and the
  seeded times are not affected.
- Run UAT-05 **after** UAT-01, because it reuses the booking from UAT-01. Every other case can run in
  any order.
- No cleanup is needed. Leftover bookings and times are synthetic, and the Product Team may remove
  them after acceptance. Never enter real personal data.
- The Product Team announces any deployment during testing before it happens, as Lab 6 Section 2
  requires.

### How to report a finding

Open a GitHub Issue in the repository with the label `uat`, or send the same details through the
agreed handoff channel. Include:

- the case ID, the tested version, and the date and time
- the account label (never a password)
- the steps, the expected result, and the actual result
- your suggested severity, with a screenshot

## 2. Cases

### UAT-01 Normal journey: add a time, book it, and retrieve it

| | |
|---|---|
| **Requirements and AC** | FR-04 to FR-08; AC-10, AC-14, AC-15, AC-20, AC-22, AC-27 |
| **Purpose** | A customer can book a time that a specialist publishes, and both can see the saved booking. |
| **Roles** | S1, then C1, then S1 |
| **Preconditions** | Signed out. Choose a date D 10 to 30 days ahead and a start time T, such as 16:07. |
| **Inputs** | Service *Hair transplant consultation*; date D; start T; duration 30 minutes; topic `UAT hairline review` |

1. Sign in as S1. Expected: the *My schedule* page opens.
2. With *Service* set to **Hair transplant consultation**, enter date D and start T, keep **30 minutes**, and choose **Add time**. Expected: *Time added.* appears, and T to T+30 is listed under D as **Available**.
3. Choose **Log out**, then sign in as C1. Expected: the *Book an appointment* page opens.
4. Choose the service **Hair transplant consultation, Dr. Somchai Prasert**, then day D, then time T. Expected: step 4 shows the service, the specialist, and D, T to T+30.
5. Enter the topic `UAT hairline review` and choose **Confirm booking**. Expected: a page shows *Your booking is confirmed.* with When, Specialist, Service, Topic, and Status **Confirmed**.
6. Open **My bookings**, then open the new booking. Expected: it is listed and opens with the same details.
7. Log out and sign in as S1. Expected: under D, the time T to T+30 shows **Booked**, **Anan Suksan**, and the topic.

### UAT-02 Business rule: two customers try to book the same time

| | |
|---|---|
| **Requirements and AC** | BR-01; AC-16, AC-17 |
| **Purpose** | A time can never be given to two customers. |
| **Roles** | S1, C2, and C3 in two separate browser windows (one normal and one private) |
| **Preconditions** | As S1, add a new time T2 on date D2, as in UAT-01 steps 1 and 2. Then log out. |
| **Inputs** | Topics `UAT race C2` and `UAT race C3` |

1. In window A, sign in as C2. In window B, sign in as C3.
2. In **both** windows, choose the S1 consultation service, day D2, time T2, and enter the window's topic. Do not confirm yet.
3. In window A, choose **Confirm booking**. Expected: C2's booking is confirmed.
4. In window B, choose **Confirm booking**. Expected: the message *Another customer has just taken this time. Please choose another.*, and T2 is no longer offered for D2.
5. In window B, open **My bookings**. Expected: there is no booking for D2, T2.
6. In window A, open **My bookings**. Expected: C2's booking for D2, T2 is still there with the topic `UAT race C2`.

### UAT-03 Boundaries: invalid times and topic length

| | |
|---|---|
| **Requirements and AC** | BR-03, BR-04, BR-08; AC-11, AC-12, AC-15b |
| **Purpose** | Invalid input is rejected with a clear message, and nothing is saved. |
| **Roles** | S1, then C1 |
| **Preconditions** | Signed out. Choose a new date D3 10 to 30 days ahead. |
| **Inputs** | Past date: yesterday at 10:00. Times on D3: 17:00 for 60 minutes, then 17:30 for 30 minutes, then 18:00 for 30 minutes. Topics `ab` (2 characters) and `abc` (3 characters). |

1. Sign in as S1. Enter yesterday's date, 10:00, and 30 minutes, then choose **Add time**. Expected: *A slot must start in the future.*, and nothing is added.
2. Add D3, 17:00, **60 minutes**. Expected: *Time added.*
3. Add D3, 17:30, 30 minutes. Expected: *This time overlaps another slot on the schedule.*, and nothing is added.
4. Add D3, 18:00, 30 minutes, which starts exactly when the 17:00 time ends. Expected: *Time added.* Adjacent times are allowed.
5. Log out and sign in as C1. Choose the S1 consultation service, D3, and 18:00. Enter the topic `ab` and confirm. Expected: an error under the topic says it must be 3 to 200 characters, and no booking is made.
6. Change the topic to `abc` and confirm. Expected: the booking is confirmed.

### UAT-04 Forbidden role and ownership

| | |
|---|---|
| **Requirements and AC** | BR-05, BR-06; AC-05, AC-06, AC-21, AC-23 |
| **Purpose** | Users cannot see or use what belongs to another user or another role. |
| **Roles** | C1, C2, S2, and a signed-out visitor |
| **Preconditions** | C1 has at least one booking, for example from UAT-01 or UAT-03. |
| **Inputs** | The address of one of C1's bookings, for example `<URL>/bookings/<id>` |

1. Sign in as C1, open one of C1's bookings, and copy its address from the address bar. Log out.
2. Sign in as C2 and open the copied address. Expected: *Booking not found.* None of C1's details (topic, time, or name) are shown.
3. As C2, open `<URL>/schedule`. Expected: C2 is sent to the booking page. No specialist schedule or other customers' bookings are shown.
4. Log out. Without signing in, open `<URL>/bookings`. Expected: the sign-in page is shown.
5. Sign in as S2. Open the *Service* list on *My schedule*. Expected: only S2's own service is listed, and none of S1's bookings or customer names appear.

### UAT-05 State and persistence

| | |
|---|---|
| **Requirements and AC** | FR-07, FR-08, BR-01; AC-14, AC-20, AC-22, AC-24 |
| **Purpose** | A saved booking survives sign-out, a new session, and a redeployment, and stays unavailable to others. |
| **Roles** | C1, C3, and S1 |
| **Preconditions** | UAT-01 is complete. Note its booking: date D, time T, and topic `UAT hairline review`. |

1. Sign in as C1 in a fresh private window. Open **My bookings**. Expected: the UAT-01 booking is listed with the same date, time, and topic.
2. Log out and sign in as C3. Choose the S1 consultation service and day D. Expected: time T is **not** offered.
3. Log out and sign in as S1. Expected: D, T still shows **Booked** with C1's name and topic.
4. **After the Product Team announces a redeployment**, wait until they say it is finished, then repeat steps 1 to 3. Expected: the same results, so the data survived the redeployment.

### UAT-06 Sign-in and sign-out

| | |
|---|---|
| **Requirements and AC** | FR-01 to FR-03; AC-01 to AC-03 |
| **Purpose** | Only correct credentials give a session, and signing out ends it. |
| **Roles** | C1 and a signed-out visitor |
| **Inputs** | C1's email with the wrong password `Wrong-Pass1`, then the correct password |

1. Open `<URL>/login`. Enter C1's email and `Wrong-Pass1`, then choose **Sign in**. Expected: *Invalid email or password.*, and you stay on the sign-in page.
2. Enter an unknown email, `nobody@hairroot.test`, with any password. Expected: the same message, which does not reveal whether the account exists.
3. Sign in with C1's correct password. Expected: the booking page opens, and the header shows *Anan Suksan (Customer)*.
4. Choose **Log out**, then press the browser's Back button and reload. Expected: the sign-in page, not C1's data.

## 3. Coverage

| Lab 6 category | Cases |
|---|---|
| Normal domain journey | UAT-01 |
| Business rule or boundary | UAT-02, UAT-03 |
| Forbidden role or ownership | UAT-04 |
| State, history, or persistence | UAT-05 |
| Authentication | UAT-06 |

| Sprint 1 AC | Covered by |
|---|---|
| AC-01 to AC-03 | UAT-06 |
| AC-05, AC-06 | UAT-04 |
| AC-10 to AC-12 | UAT-01, UAT-03 |
| AC-14 to AC-17 | UAT-01, UAT-02, UAT-03, UAT-05 |
| AC-20 to AC-24 | UAT-01, UAT-04, UAT-05 |
| AC-27 | UAT-01 |
| AC-04, AC-07, AC-08, AC-13, AC-18, AC-19, AC-25, AC-26 | Automated tests only. They cannot be observed through the UI without developer tools. |

## 4. Execution record (completed by the UAT Team)

| Case | Tester and team | Date and time | Tested version | Actual result | Result (PASS / FAIL / BLOCKED) | Evidence ID | Finding |
|---|---|---|---|---|---|---|---|
| UAT-01 | | | | | | | |
| UAT-02 | | | | | | | |
| UAT-03 | | | | | | | |
| UAT-04 | | | | | | | |
| UAT-05 | | | | | | | |
| UAT-06 | | | | | | | |

Record what actually happened, not the expected result. BLOCKED is not a pass.
