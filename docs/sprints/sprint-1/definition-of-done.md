# Product Definition of Done

Version 0.1 — draft, 2026-11-07.

A feature is done only when all of these are true, and each is supported by evidence.

| Item | Evidence |
|---|---|
| Required behaviour is implemented on an Issue-linked feature branch. | Issue, branch, and commits |
| Every acceptance criterion maps to an automated test or a documented manual check. | AC-to-test results table |
| Meaningful tests pass on the tested commit, and failed or skipped tests are reported. | Command output tied to the commit |
| Rule work has a failing test recorded before the implementation. | Commit IDs and test output |
| The teammate reviewed the PR with a specific check, question, finding, or reason for approval. | The PR review, by someone other than the author |
| The feature is integrated into sprint staging, and system tests and acceptance checks pass there. | Merge commit and test output |
| README, setup, and engineering documents match the released behaviour. | The documents at the release commit |
| Incomplete work and known limitations are disclosed. | Part F of the deliverable PDF |

An AI agent's statement that work is complete or that tests pass is not evidence.
