# HairRoot — Three-Sprint Plan

Version 0.3 — reviewed and approved in PR #24, 2026-11-14.

| Sprint | Goal | Features | Depends on | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| 1 | Prove the core journey with real identity and safe booking. | F-01, F-02, F-03, F-04, F-05; first part of R-01 and R-02 | none | A specialist publishes a slot, a customer books and retrieves it, and the rules and access limits are tested. | Deliverable 1, 8 Nov |
| 2 | Complete the core booking life cycle and slot management. | F-06, F-07, F-08, F-09, F-10, F-11, F-16; R-02 through Lab 5 | Sprint 1 release | Bookings can be cancelled and moved, specialists can maintain their schedules, customers can see anonymous booking activity before choosing a time, and the release is deployed. | Deliverable 2, 29 Nov |
| 3 | Finish reporting and harden the product. | F-12, F-13, F-14, F-15; completion of R-01 | Sprint 2 features | The complete baseline is verified and released. | Progress 29 Nov; complete 13 Dec |

## Why Sprint 1 has this scope

Sprint 1 follows the course's Theme 1 example because that slice carries the highest risk: identity,
ownership, and exclusive booking under competition. Everything later depends on them.

Cancellation, rescheduling, and slot editing wait for Sprint 2. Sprint 1 therefore has only the
`ACTIVE` booking status, while the partial unique index already allows for later cancellation.

The Sprint 1 feature order is F-01 and F-02, then F-03, F-04, and F-05.

F-16 (public booking pulse) is deferred to Sprint 2 because it extends the product scope beyond the
Sprint 1 requirements. Its SRS change and contract must be reviewed before its implementation PR is
integrated.

## Sprint 2 and 3 risks

| Risk | Response |
|---|---|
| Lab 5, 6, and 7 work and final exams overlap Sprint 2 and 3. | Finish Sprint 2 by 29 Nov as the course schedule advises, and leave only fixes and verification for the exam period. |
| UAT finds defects in released behaviour. | Handle them as Issues with fix branches and failing tests first. |
