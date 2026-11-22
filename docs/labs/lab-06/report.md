# CPE 334 Lab 6: Independent UAT and Defect Management

**HairRoot**, hair clinic appointment booking (Group Project Theme 1). Group **TH-060_P1**, section 131.

| | |
|---|---|
| **Students** | ไอโว ปีเตอร์ อัลวิน รันเน่, 67070501051, GitHub `alvin777777`<br>ทิฐินันท์ สอบกิ่ง, 67070501018, GitHub `Ohmmykung09` |
| **Sprint 1 scope** | Sign-in and roles; a specialist adds times; a customer books by service, day, and time; exclusive booking; own-booking and own-schedule views (Part A, Section 1) |
| **Repository** | https://github.com/alvin777777/hairroot (public) |
| **Sprint 1 baseline** | Tag `v0.1.0-sprint1`, commit `d1e8d81` |
| **Tested release** | Commit `ac0a57b` on `main`, Cloud Run revision `hairroot-sha-ac0a57b9eb87-44992339630-1` |
| **Deployed URL** | https://hairroot-368003298307.asia-southeast1.run.app |
| **Partner team** | [PENDING: team name, both students and IDs, and their repository and URL] |
| **Independent UAT testers of HairRoot** | [PENDING: names of the partner team's testers] |
| **Final UAT decision for HairRoot** | [PENDING: Accepted, Accepted with documented minor limitations, or Not Accepted, recorded by the partner team] |

<!-- TOC -->

## Version table

| Role | Commit or tag | Cloud Run revision | Notes |
|---|---|---|---|
| Sprint 1 baseline | `v0.1.0-sprint1` (`d1e8d81`) | — | Accepted Sprint 1 contract and scope |
| Release under UAT | `ac0a57b` | `hairroot-sha-ac0a57b9eb87-44992339630-1` | It adds the Lab 5 changes (Docker, CI/CD, version footer), with no Sprint 1 behaviour change, and the guided flow (C-02) |
| Defective commit(s), if any | [PENDING] | — | |
| Regression test (RED) | [PENDING] | — | |
| Fix (GREEN) and release PR | [PENDING] | [PENDING] | |
| Revision re-tested by the UAT team | [PENDING] | [PENDING] | |

Each release into `main` passes through `sprint-1-staging` as a merge commit, so a release commit on `main` differs from the staging commit it merges. The deployed footer *Version abc1234* and `GET /api/version` give the commit actually served.

## Part A: UAT preparation and handoff

**Cases.** HairRoot's six Sprint 1 UAT cases are in Appendix A, and they cover every required category:

| Category | Case | AC |
|---|---|---|
| Normal domain journey | UAT-01 | AC-10, AC-14, AC-15, AC-20, AC-22, AC-27 |
| Business rule | UAT-02 | AC-16 (AC-17 by automated T-17) |
| Boundary | UAT-03 | AC-11, AC-12, AC-15b |
| Forbidden role or ownership | UAT-04 | AC-05, AC-06, AC-21, AC-23 |
| State and persistence | UAT-05 | AC-14, AC-20, AC-22, AC-24 |
| Authentication | UAT-06 | AC-01, AC-02, AC-03 |

**Handoff.** Appendix A, Section 1 covers:
- the tested scope, and what is excluded as Sprint 2 or 3
- account labels S1, S2, and C1 to C3 with their roles, but no passwords
- data setup and independence: each case creates its own time; only UAT-05 follows UAT-01
- cleanup, and the rule that the Product Team announces deployments in advance
- how to report findings: the *UAT finding* Issue form, label `uat`

**Credentials.** The demo password is in Secret Manager. ทิฐินันท์ gave it to the UAT team privately [PENDING: date and channel, with no value]. It does not appear in this PDF, in Git, or in any screenshot.

**Automated support.** E2E tests cover the same paths as UAT-01, UAT-02, and UAT-04: T-31, T-32, and T-39 (added in PR #54). They run in CI on every PR. They support the UAT but do not replace independent testing.

**Sessions with the partner team.**

| Session | Date and time | Who | Release | Outcome |
|---|---|---|---|---|
| Handoff | [PENDING] | Both teams | [PENDING] | [PENDING] |
| Initial UAT of HairRoot | [PENDING] | Partner testers | [PENDING] | [PENDING] |
| Our UAT of the partner product | [PENDING] | ไอโว and ทิฐินันท์ | [PENDING] | [PENDING] |
| Re-test after corrections | [PENDING] | Partner testers | [PENDING] | [PENDING] |

## Part B: Independent execution of the partner team's product

**Product tested.** [PENDING: partner product name, tested release or commit, URL, and the cases they gave us]

Both students tested together. Results are recorded as observed, not copied from expected results.

| Case | Tester | Date and time | Tested version | Inputs | Actual result | Result | Evidence |
|---|---|---|---|---|---|---|---|
| [PENDING: partner case ID] | [PENDING] | [PENDING] | [PENDING] | [PENDING] | [PENDING] | PASS / FAIL / BLOCKED | E-B1 |

[PENDING: evidence E-B1 and later. At least the normal journey and a negative or access case, each captioned with the evidence ID, action, expected and actual result, time, and tested version. For a rejected operation, also show that the protected state was not changed or disclosed.]

## Part C: Defect reporting and triage

### C.1 Findings we reported to the partner team

| ID | Case and requirement | Version | Steps, expected, and actual | Severity and user impact | Evidence | Partner's response |
|---|---|---|---|---|---|---|
| [PENDING: or "None: every case passed"] | | | | | | |

### C.2 Findings received about HairRoot

Every received finding is classified against the Sprint 1 contract. A failing requirement is never relabelled as an enhancement.

| Issue | Reporter | Case and requirement | Version | Classification | Reason, from the contract and evidence | Severity | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| [PENDING: or "None received"] | | | | Accepted defect / duplicate / not a defect / enhancement | | Critical / major / minor | | |

### C.3 Accepted minor limitations

[PENDING: minor defects the UAT team explicitly accepted as known limitations, with their confirmation, or "None"]

## Part D: Resolution and independent re-test

### D.1 Accepted-defect chain

[PENDING: for each corrected release-blocking defect: the Issue; the regression test excerpt with RED output on the defective commit; the fix diff; GREEN output with the existing regression tests; the teammate's PR review; CI; the release PR into `main`; the deploy run and revision; the post-deployment smoke check; and the partner's re-test. If HairRoot had no legitimate defect, record the TA's controlled defect exercise here instead, on an isolated branch (Lab 6 Section 3.5).]

### D.2 Independent acceptance decision for HairRoot

Only the UAT team can confirm acceptance.

| | |
|---|---|
| Decision | [PENDING: Accepted / Accepted with documented minor limitations / Not Accepted] |
| Tested release and revision | [PENDING] |
| UAT testers (team and names) | [PENDING] |
| Date | [PENDING] |
| Conditions or reasons | [PENDING] |
| Record | [PENDING: link to or screenshot of the partner's written decision] |

## Contributions, AI use, and limitations

| Work | ไอโว | ทิฐินันท์ |
|---|---|---|
| UAT cases and handoff (PR #42) | Wrote the cases and checked the expected messages against a local run | Reviewed them against the contract and the live app, requested the boundary and AC-17 corrections, and confirmed the release and revision |
| E2E for UAT-04 (PR #54) | Reviewed it and ran it locally (4/4, twice) | Wrote it |
| Testing the partner product | [PENDING] | [PENDING] |
| Findings, triage, and fixes | [PENDING] | [PENDING] |
| This report | Structure and evidence | Checked accuracy [PENDING: confirm] |

| Student | AI tool | Tasks assisted |
|---|---|---|
| ไอโว | Claude Code (Claude Opus 5.5) | Drafting the UAT cases and this report; the browser check of the expected results; reviewing PR #54 |
| ทิฐินันท์ | OpenAI Codex (GPT-6) | Adding E2E test T-39; reviewing PR #42 |

No password or secret was given to an AI tool.

**Limitations.**
- [PENDING: anything not completed, BLOCKED cases, unresolved dependencies, and any TA notification about the partner team]

## Appendix A: HairRoot Sprint 1 UAT cases and handoff

The full handoff document given to the partner team follows.
