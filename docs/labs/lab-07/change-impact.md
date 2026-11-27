# Lab 7 change proposal: minimum new slot duration

Issue: [#60](https://github.com/alvin777777/hairroot/issues/60)

Status: reviewed contract; implementation is in PR #63 and has not yet merged or been deployed.

Accepted Sprint 1 baseline: tag `v0.1.0-sprint1`, commit `d1e8d81`.

Pre-change release on `main`: `cbaf1baa38a5b20c98b006f6f6effbe0f2e3f39d` (`cbaf1ba`), Cloud Run revision `hairroot-sha-cbaf1baa38a5-45975306714-2`. The RED test must run against this actual pre-change implementation (or a clean checkout of this commit), not only against the Sprint 1 baseline tag.

The repository also has `sprint-2-staging` work, including F-16 Public booking pulse. That later-sprint feature is outside this BR-03 change and must be identified separately if present in the release candidate; it is not evidence for Lab 7's Sprint 1 maintenance change.

## Proposed change

Change BR-03 for newly created slots from 15–120 minutes to 30–120 minutes inclusive. Reject 29 and 121 minutes; accept 30 and 120 minutes. Existing slots shorter than 30 minutes remain unchanged and bookable. The reason proposed for the change is to leave a preparation and wrap-up buffer for clinic consultations. This reason and the new rule require approval before implementation.

## Impact trace

| Requirement / feature | Contract section | Acceptance criteria / test | Expected module and effect | Scope and regression |
|---|---|---|---|---|
| FR-04, BR-03: create a slot | SRS §4–5; F-03 rules/API/UI | AC-11; T-11a, T-11b | `server/src/services/slots.ts`: update minimum duration used by validation. `client/src/pages/SchedulePage.tsx`: remove choices below 30 minutes. API request/response shape stays the same. | New slots: 29 rejected, 30/120 accepted, 121 rejected; invalid requests store no row. |
| BR-02, BR-04: future start and no overlap | SRS §5; F-03 | AC-11, AC-12; T-11b, T-12a/b/c | Slot service and existing database exclusion constraint. | Preserve past-start rejection, overlap rejection, adjacency acceptance, and concurrency protection. No database constraint change: duration is validated by the service before insert; overlap remains database-enforced. |
| BR-05: assigned specialist only | SRS §5; F-03 API | AC-13; T-13 | Existing schedule route authorization and service guard; no policy change. | Unassigned specialist remains denied and creates no row. Preserve via T-13. |
| FR-05/06, BR-01/02/06/07: view and book available slots | SRS §4–5; F-04 | AC-14/15/16/19; T-14, T-15, T-16, T-19, T-20, T-21, E2E T-31; new T-11c | Available-slot and booking services. Booking does not revalidate the slot's duration; this is needed to preserve legacy short slots. | Existing 15-minute UAT slot from UAT-03 (12 Dec 2026, 19:00–19:15 Bangkok) is a candidate for a read-only post-deployment persistence check. Do not rerun UAT-03 against the changed policy; it would report the historical 15-minute creation as a false failure. Automated T-11c uses a short slot inserted directly by Prisma and books it through the ordinary API. Preserve visibility, booking, ownership and single-booking behavior. |
| Data and migrations | F-03 Data; Prisma schema/migrations | AC-11; T-11c | No schema or migration change: slot records are not rewritten, and duration is validated only when creating new slots. A legacy slot is inserted directly via Prisma in the test fixture because the changed API should reject short durations. | No migration is needed; T-11c proves old short rows can still be listed/booked and their timestamps remain unchanged. |
| System architecture | `docs/system-sds.md` §§1–2, 4–5 | AC-11; T-11a/b/c; T-13; T-14–16; E2E T-31 | No SDS change proposed: the existing layered design already places business validation in `server/src/services`, UI choices in React, and persistence constraints in PostgreSQL. The API payload and data model remain unchanged. | Check the existing service/UI layers and regression suites; do not introduce a migration or move authorization into the client. |
| Sprint 2 F-16 Public booking pulse | `docs/features.md`; `sprint-2-staging` | N/A for this change | No F-16 module changes are in scope; it is a later-sprint feature and is not needed to alter slot creation policy. | N/A because this proposal changes only new slot duration. Identify F-16 separately if it is included in the deployed project. |

## Existing behavior to preserve

- Past starts and invalid end times are rejected; same-schedule overlaps are rejected; adjacent slots and equivalent times on different schedules remain allowed: T-11b and T-12a/b/c.
- Only the assigned specialist can create slots: T-13.
- Customers see only future, unbooked slots and no customer information; booking stores ownership from the session and slot competition stays safe: T-14, T-15, T-16 (and T-19–T-21).
- The guided customer booking flow remains intact: E2E T-31.
- Existing short slots remain visible/bookable: T-11c; post-deploy, use the existing 15-minute 12 Dec UAT slot as a read-only check if still present. Do not rerun the historical UAT-03 case on the changed release.

## Contract sequence and approvals

1. TA approval: not obtained. The team decided on 27 Nov 2026 not to request it; record this as a limitation in the Lab 7 report.
2. Teammate contract review: approved by Iivo (ไอโว) on 27 Nov 2026 in PR #61, before implementation.
3. New tests and RED against the actual pre-change code: complete. The original captured run used local test-only commit `1b92ff9dedfd067019aff1534c17756e5956a8da` on pre-change `main` `cbaf1baa38a5b20c98b006f6f6effbe0f2e3f39d`; its output is preserved in `evidence/RED-server-2026-11-27.txt` and `evidence/RED-client-2026-11-27.txt`. For GitHub-verifiable reproduction, Iivo independently reran RED on pushed commit `9b3816d790aa08c6cad1f1fe00e7a7958982ded0`; `server/src` and `client/src` are unchanged from `cbaf1ba`. The server result was 2 failed/18 passed and the client result was 1 failed/3 passed (PR #63 review).
4. Implementation and GREEN/regression: implemented locally in commit `923c98e255822ee590093b1326e9c7f0819b5910`. Server tests passed 48/48, client tests passed 9/9, and E2E T-31 passed 1/1. Both builds passed. Full commands and output are in `evidence/`.
5. Teammate code review: approved in PR #63. CI passed for the code/test revision; a workflow rerun after this documentation correction is pending. Merge, staging integration, release, deployment and post-deployment checks remain pending. No implementation has been deployed.

This document records the reviewed contract, impact, and current RED/GREEN evidence. Staging integration, release, deployment, and post-deployment checks remain pending.
