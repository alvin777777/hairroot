# Lab 7 change proposal: minimum new slot duration

Issue: [#60](https://github.com/alvin777777/hairroot/issues/60)

Status: proposed contract; implementation has not started.

Reference release: `cbaf1baa38a5b20c98b006f6f6effbe0f2e3f39d`, Cloud Run revision `hairroot-sha-cbaf1baa38a5-45975306714-2`.

Accepted Sprint 1 baseline: tag `v0.1.0-sprint1`, commit `d1e8d81`.

## Proposed change

Change BR-03 for newly created slots from 15–120 minutes to 30–120 minutes inclusive. Reject 29 and 121 minutes; accept 30 and 120 minutes. Existing slots shorter than 30 minutes remain unchanged and bookable. The reason proposed for the change is to leave a preparation and wrap-up buffer for clinic consultations. This reason and the new rule require approval before implementation.

## Impact trace

| Requirement / feature | Contract section | Acceptance criteria / test | Expected module and effect | Scope and regression |
|---|---|---|---|---|
| FR-04, BR-03: create a slot | SRS §4–5; F-03 rules/API/UI | AC-11; T-11a, T-11b | `server/src/services/slots.ts`: update minimum duration used by validation. `client/src/pages/SchedulePage.tsx`: remove durations below 30 from the creation choices. API request shape stays the same. | New slots: 29 rejected, 30/120 accepted, 121 rejected; invalid requests store no row. |
| BR-02, BR-04: future start and no overlap | SRS §5; F-03 | AC-11, AC-12; T-11b, T-12a/b/c | Same slot validation/service and existing database exclusion constraint. No schema change expected. | Preserve past-start rejection, overlap rejection, adjacency acceptance, and concurrency protection. |
| BR-05: assigned specialist only | SRS §5; F-03 API | AC-13; T-13 | Schedule route authorization; no policy change. | An unassigned specialist remains denied and creates no row. |
| FR-05/06, BR-01/02: view and book available slots | SRS §4–5; F-04 | AC-14/15/16; T-14/15/16; new T-11c | Available-slot and booking services; no new-slot minimum is applied during booking to legacy rows. | Existing shorter slots remain listed and bookable if otherwise available; ownership and single-booking rules remain unchanged. |
| Data and migrations | F-03 Data; database migrations | AC-11; T-11c | No migration expected because stored slot times are not rewritten and the rule is checked on creation. | Verify a pre-existing short slot remains valid and its timestamps do not change. |

## Contract sequence and approvals

1. TA approval: pending. Record approver, date, and approved scope before implementation, as required by Lab 7.
2. Teammate contract review: pending. Complete before the implementation PR begins.
3. New tests and RED against the actual pre-change code: not started.
4. Implementation and GREEN/regression: not started.
5. Staging, release, deployment and post-deployment checks: not started.

This document records the proposed contract and impact only. It does not claim approval or implementation.
