# CPE 334 Lab 7: Software Maintenance Metrics and Release Readiness

**HairRoot**, hair clinic appointment booking (Group Project Theme 1). Group **TH-060_P1**, section 131.

| | |
|---|---|
| **Students** | ไอโว ปีเตอร์ อัลวิน รันเน่, 67070501051, GitHub `alvin777777`<br>ทิฐินันท์ สอบกิ่ง, 67070501018, GitHub `Ohmmykung09` |
| **Repository** | https://github.com/alvin777777/hairroot (public) |
| **Accepted Sprint 1 baseline** | Tag `v0.1.0-sprint1`, commit `d1e8d81` (old rule 15 to 120 minutes) |
| **Pre-change implementation** | `main` at `cbaf1baa38a5b20c98b006f6f6effbe0f2e3f39d`, Cloud Run revision `hairroot-sha-cbaf1baa38a5-45975306714-2` (the release DineQ accepted in Lab 6) |
| **Submitted main release** | [PENDING: release commit on `main` after PR #63] |
| **Deployed URL and version** | https://hairroot-368003298307.asia-southeast1.run.app, [PENDING: footer version and revision after deployment] |
| **Change** | BR-03: a newly created slot must last 30 to 120 minutes (was 15 to 120). Existing shorter slots stay bookable. Issue #60 |

<!-- TOC -->

**Evidence IDs.** Part A: E-A1 to E-A4. Part B: E-B1 to E-B9. Part C: M-1 to M-5. Part D: E-D1.

## Version table

| Role | Commit or tag | Branch | Cloud Run revision | Notes |
|---|---|---|---|---|
| Accepted Sprint 1 baseline | `v0.1.0-sprint1` (`d1e8d81`) | `main` | — | Old rule: 15 to 120 minutes |
| Actual pre-change implementation | `cbaf1ba` | `main` | `hairroot-sha-cbaf1baa38a5-45975306714-2` | Lab 6 accepted release; same BR-03 code as the baseline |
| Contract revision (PR #61) | `9b9fcaf` (merge) | `sprint-1-staging` | — | SRS 0.3, F-03 0.4, STS 0.3, traceability 0.3; docs only |
| Changed-behaviour tests (RED) | `9b3816d` | `feature/lab7-min-slot-duration` | — | Tests only. Application code is identical to `cbaf1ba`; only `e2e/tests/sprint-1.spec.ts` differs, from Lab 6 PR #56 |
| Implementation (GREEN) | `923c98e`; evidence `a8f8d13` | `feature/lab7-min-slot-duration` (PR #63) | — | Two production lines changed |
| Staging integration | `758996e` (merge of PR #63, 28 Nov 04:01) | `sprint-1-staging` | — | Release PR #65 into `main` opened |
| Accepted main release | [PENDING: release PR and commit] | `main` | [PENDING] | |

Releases reach `main` as merge commits from `sprint-1-staging`, so a release commit differs from the staging commit it merges. **Unrelated later work:** `sprint-2-staging` contains F-16 (public booking pulse, PR #20) and a Sprint 2 sync (PR #26). Neither is part of this change or of the release above.

## Part A: Change impact and updated contract

### A.1 Approved change request (E-A1, Issue #60)

| | Old rule (Sprint 1, `d1e8d81` to `cbaf1ba`) | New rule |
|---|---|---|
| Requirement | BR-03: *A slot must start in the future, end after it starts, and last 15 to 120 minutes.* | BR-03: *A newly created slot must start in the future, end after it starts, and last 30 to 120 minutes. Slots created before this rule takes effect are not revalidated and remain bookable under the existing booking rules.* |
| Implemented in | `server/src/services/slots.ts`: `MIN_SLOT_MINUTES = 15`; `client/src/pages/SchedulePage.tsx`: `DURATIONS = [15, 30, 45, 60, 90, 120]` | `MIN_SLOT_MINUTES = 30`; `DURATIONS = [30, 45, 60, 90, 120]` |
| Boundaries | 14 and 121 rejected; 15 and 120 accepted | **29 and 121 rejected; 30 and 120 accepted** |
| Invalid cases | Past start (422 `SLOT_IN_PAST`), end not after start, duration outside the limits (400 `fields.endAt`), overlap (409) | Unchanged, with the new minimum |
| Access | Only the specialist assigned to the schedule (BR-05, 403 otherwise) | Unchanged |
| Existing data | — | Slots shorter than 30 minutes that already exist keep their times and stay listed and bookable |

**Reason.** A consultation needs preparation and wrap-up time; a 15-minute slot leaves none.

**Approval.** Issue #60 (opened by ทิฐินันท์, 27 Nov 2026 22:22 Bangkok) states the old rule, the new rule, the reason, scope, boundaries, and acceptance criteria. **No instructor or TA approval was obtained.** The team decided on 27 Nov 2026 not to request it; see Limitations. The teammate contract review (A.4) took place before implementation.

**Acceptance criteria (from Issue #60).** A new 29-minute slot returns a validation error and stores no row. A new 30-minute slot is accepted. A new 120-minute slot is accepted. A new 121-minute slot returns a validation error and stores no row. Existing slots shorter than 30 minutes remain visible and bookable. Past-start, overlap, adjacent-slot, and assigned-specialist checks remain unchanged.

### A.2 Impact trace (E-A2, `docs/labs/lab-07/change-impact.md`)

| Requirement / feature | Contract section | AC / tests | Module and effect | Scope and regression |
|---|---|---|---|---|
| FR-04, BR-03: create a slot | SRS §4 to §5; F-03 rules, API, UI | AC-11; T-11a, T-11b | `slots.ts`: minimum 15 → 30. `SchedulePage.tsx`: remove the 15-minute choice. API shape unchanged | 29 rejected, 30 and 120 accepted, 121 rejected; nothing stored for rejections |
| BR-02, BR-04: future start, no overlap | SRS §5; F-03 | AC-11, AC-12; T-11b, T-12a/b/c | Same service; database exclusion constraint unchanged | Past start, overlap, adjacency, and concurrency preserved |
| BR-05: assigned specialist only | SRS §5; F-03 API | AC-13; T-13 | Route guard unchanged | N/A for change: authorization is not affected. Protected by T-13 |
| FR-05/06, BR-01/02/06/07: view and book | SRS §4 to §5; F-04 | AC-14 to AC-16, AC-19; T-14 to T-16, T-19 to T-21, E2E T-31; new T-11c | Booking never re-checks slot length, which is what keeps legacy short slots bookable | Legacy short slots stay listed and bookable; ownership and single booking unchanged |
| Data and migrations | F-03 Data; Prisma schema | AC-11; T-11c | **No migration**: stored slots are not rewritten; the rule applies on creation only | T-11c inserts a 15-minute slot directly with Prisma and books it |
| System-Level SDS | `docs/system-sds.md` §1 to §2, §4 to §5 | — | **No change**: the Slot entity already says duration is enforced in the service layer | Validation stays on the server; the client list is convenience only |
| Historical UAT | Lab 6 `uat-cases.md` UAT-03 steps 5 and 7 | — | Not edited: it records the Lab 6 run of the old rule | Must not be rerun on the new release, or it reports a false FAIL |
| Sprint 2 F-16 | `docs/features.md`; `sprint-2-staging` | N/A | N/A: later-sprint feature, unrelated to slot creation | Not part of this release |

**Behaviour that must not change, and its protection:** past start and end-before-start rejected (T-11b); overlap rejected, adjacency allowed, concurrent overlap safe (T-12a/b/c); unassigned specialist denied (T-13); available list hides customers, booking takes the customer from the session, one booking per slot (T-14, T-15, T-16, T-19 to T-21); the guided booking journey (E2E T-31); legacy short slots bookable (T-11c).

### A.3 Revised contract: old and new excerpts (E-A3, PR #61)

Old text is from `cbaf1ba`; new text is from `sprint-1-staging` after PR #61 (`9b9fcaf`).

| Document and version | Old | New |
|---|---|---|
| SRS 0.2 → 0.3, FR-04 | A specialist can create a slot with a start and end time on a schedule assigned to them. | A specialist can create a future slot of 30 to 120 minutes on a schedule assigned to them. Existing shorter slots remain unchanged and bookable. |
| SRS, BR-03 | …last 15 to 120 minutes. | A newly created slot…last 30 to 120 minutes. Slots created before this rule takes effect are not revalidated and remain bookable… |
| SRS, decision D-02 | How long is a slot? 15 to 120 minutes, chosen per slot. Consultations and follow-ups differ in length; the limits reject obvious mistakes. | How long is a newly created slot? 30 to 120 minutes, chosen per slot; existing shorter slots remain bookable. Adds preparation and wrap-up time while preserving already scheduled appointments. |
| F-03 0.2 → 0.4, rules | Duration of exactly 15 and exactly 120 minutes is valid. 14 and 121 minutes are invalid. | Newly created slots must last 30 to 120 minutes inclusive. 29 and 121 minutes are invalid; 30 and 120 minutes are valid. Slots created before the new rule takes effect are not revalidated. |
| F-03, UI | …a duration from 15 to 120 minutes… | …a duration from 30 to 120 minutes… Existing shorter slots continue to appear and can be booked. |
| F-03, AC-11 | …durations of 14 and 121 minutes are rejected with nothing stored; 15 and 120 minutes are accepted. | …durations of 29 and 121 minutes are rejected with nothing stored; 30 and 120 minutes are accepted. A pre-existing slot shorter than 30 minutes remains visible and bookable. |
| STS 0.2 → 0.3, T-11a | Unit: 15 and 120 minutes pass; 14, 121, zero, and negative fail | Unit: 30 and 120 minutes pass; 29, 121, zero, and negative fail |
| STS, T-11b | API: past start, 14, 15, 120, 121. Past start 422; 14 and 121: 400, no row; 15 and 120: 201 | API: past start, 29, 30, 120, 121. Past start 422; 29 and 121: 400, no row; 30 and 120: 201 |
| STS, T-11c (new) | — | API + database fixture: insert a legacy slot under 30 minutes directly with Prisma; the customer lists and books it through the normal API. Slot listed, booking succeeds, stored times unchanged |
| Traceability 0.2 → 0.3, BR-03 | AC-11: T-11a, T-11b | AC-11: T-11a, T-11b, T-11c |

The T-11b expectation for 15 minutes changes legitimately because the requirement changed. The other T-11b checks (past start, 121, zero, negative) are kept.

### A.4 Teammate review of the contract, before implementation (E-A4)

| Time (Bangkok, 27 Nov 2026) | Event |
|---|---|
| 22:22 | Issue #60 opened (ทิฐินันท์) |
| 22:31 | ไอโว's first review of PR #61: rule and boundaries correct; three gaps (SRS D-02, traceability T-11c, how T-11c gets a legacy slot) |
| 22:33 | Follow-up from the Lab 7 handout: System-Level SDS row and N/A reasons, named pre-change version and F-16 scope, preserved-behaviour list |
| 23:09 | ไอโว approved PR #61 after commit `493eda5` addressed all six points |
| 23:34:22 | PR #61 merged into `sprint-1-staging` (`9b9fcaf`) |
| 23:34:40 | First test commit `9b3816d` (after the merge) |
| 23:42 | Implementation commit `923c98e` |

Approval text (PR #61, ไอโว, 23:09):

> Re-reviewed after 493eda5. All six points are addressed: 1. SRS D-02 now 30 to 120 for new slots… 2. Traceability BR-03 lists T-11a, T-11b, T-11c. 3. STS T-11c inserts the short legacy slot directly with Prisma and books it through the normal API… 4. Impact table has the System-Level SDS row… 5. Pre-change release named: `main` `cbaf1ba`… 6. Preserved-behaviour list maps to T-11b, T-12a/b/c, T-13, T-14 to T-16, T-19 to T-21, and E2E T-31… Contract approved by the teammate (ไอโว) on 27 Nov 2026, before any implementation commit. Expected RED on `cbaf1ba`: a 29-minute slot returns 201 instead of 400, and the UI still offers 15 minutes.

## Part B: Implementation and regression-safe delivery

### B.1 Changed-behaviour tests (commit `9b3816d`)

```ts
// server/tests/slots.unit.test.ts, T-11a (unit)
expect(validateSlotRule(at(60), at(90), NOW)).toBeNull();         // 30 min accepted
expect(validateSlotRule(at(60), at(180), NOW)).toBeNull();        // 120 min accepted
expect(validateSlotRule(at(60), at(89), NOW)).toBe("DURATION");   // 29 min rejected
expect(validateSlotRule(at(60), at(181), NOW)).toBe("DURATION");  // 121 min rejected

// server/tests/slots.api.test.ts, T-11b (API, real PostgreSQL)
for (const end of [29, 14, 121, 0, -15]) {
  const res = await post(scheduleA, specialistA, at(0), at(end));
  expect(res.status, `duration ${end}`).toBe(400);
}
expect(await slotCount()).toBe(0);                                // nothing stored
expect((await post(scheduleA, specialistA, at(0), at(30))).status).toBe(201);

// server/tests/bookings.api.test.ts, T-11c (legacy data preserved)
const legacy = await getPrisma().slot.create({ data: { scheduleId, startAt, endAt } }); // 15 min
expect(available.body.slots.map((s) => s.id)).toContain(legacy.id);
expect((await book(alice, legacy.id, "Legacy short slot")).status).toBe(201);
expect(stored.endAt.toISOString()).toBe(endAt.toISOString());     // times unchanged

// client/tests/screen-states.test.tsx (UI choices)
expect(screen.queryByRole("option", { name: "15 minutes" })).not.toBeInTheDocument();
expect(screen.getByRole("option", { name: "30 minutes" })).toBeInTheDocument();
```

### B.2 RED on the pre-change implementation (E-B1, E-B2)

**E-B1. Server, automated.** Commit `9b3816d` (tests only; application code identical to `cbaf1ba`). Re-run by ไอโว on 27 Nov 2026 23:48 Bangkok against local PostgreSQL 16 (Node 26.0.0, Vitest 2.1.9). Command, in `server/`: `npx vitest run --reporter=verbose tests/slots.unit.test.ts tests/slots.api.test.ts tests/bookings.api.test.ts`

```text
 ✓ bookings.api.test.ts > T-11c keeps a legacy 15-minute slot visible and bookable without changing its times
 × slots.api.test.ts > T-11b rejects times outside the limits and stores nothing (AC-11)
   → duration 29: expected 201 to be 400 // Object.is equality
 ✓ slots.api.test.ts > T-11b accepts exactly 30 and exactly 120 minutes (AC-11)
 ✓ slots.api.test.ts > T-12a / T-12b / T-12c / T-13 (4 tests)
 × slots.unit.test.ts > T-11a accepts 30 and 120 minutes and rejects values outside the limits (AC-11)
   → expected null to be 'DURATION' // Object.is equality
 Test Files  2 failed | 1 passed (3)
      Tests  2 failed | 18 passed (20)
exit=1
```

Both failures are the missing new rule: the old code accepts 29 minutes. T-11c passes, as it should, because the old code already keeps short slots bookable. Full log: `evidence/REPRO-RED-server-ivo.txt`. ทิฐินันท์'s own RED run gave the same 2 failed, 18 passed (`evidence/RED-server-2026-11-27.txt`, PR #63).

**E-B2. Client, automated.** Same commit, `client/`: `npx vitest run --reporter=verbose tests/screen-states.test.tsx`

```text
 × screen-states.test.tsx > Lab 7 BR-03 duration options > offers only new-slot durations from 30 through 120 minutes
   → expect(element).not.toBeInTheDocument()
expected document not to contain element, found <option value="15">15 minutes</option> instead
      Tests  1 failed | 3 passed (4)
```

### B.3 Implementation diff (commit `923c98e`)

```diff
--- a/server/src/services/slots.ts
+++ b/server/src/services/slots.ts
-export const MIN_SLOT_MINUTES = 15;
+export const MIN_SLOT_MINUTES = 30;
 export const MAX_SLOT_MINUTES = 120;

--- a/client/src/pages/SchedulePage.tsx
+++ b/client/src/pages/SchedulePage.tsx
-const DURATIONS = [15, 30, 45, 60, 90, 120];
+const DURATIONS = [30, 45, 60, 90, 120];
```

The server rule is authoritative; the UI list only stops a specialist choosing a value the server would reject. Authorization, booking, the schema, and stored data are untouched, as the impact analysis predicted, so no migration was needed.

### B.4 GREEN and regression (E-B3 to E-B5)

| ID | Suite and why it is relevant | Commit | Command | Passed / failed / skipped |
|---|---|---|---|---|
| E-B3 | Server, all 10 files: slot rules, booking, ownership, auth, persistence (seed), version | `a8f8d13` | `cd server && npx vitest run --reporter=verbose` | **48 / 0 / 0** |
| E-B4 | Client, all 3 files: booking flow, screen states, duration choices | `a8f8d13` | `cd client && npx vitest run --reporter=verbose` | **9 / 0 / 0** |
| E-B5 | E2E T-31: specialist creates a slot, customer books and reopens it, specialist sees it (preserved Sprint 1 journey) | `923c98e` | `cd e2e && npm test -- tests/sprint-1.spec.ts --grep T-31` | **1 / 0 / 0** |

E-B3 and E-B4 were run by ไอโว on 27 Nov 2026 23:49 Bangkok (`evidence/REPRO-GREEN-*-ivo.txt`), matching ทิฐินันท์'s runs (48/48, 9/9). E-B5 is ทิฐินันท์'s run (`evidence/GREEN-e2e-T31-2026-11-27.txt`). Both builds passed. The full E2E suite (T-30, T-31, T-32, T-39) also runs in CI (E-B7).

```text
 ✓ slots.unit.test.ts > T-11a accepts 30 and 120 minutes and rejects values outside the limits (AC-11)
 ✓ slots.api.test.ts > T-11b rejects times outside the limits and stores nothing (AC-11)
 ✓ slots.api.test.ts > T-11b accepts exactly 30 and exactly 120 minutes (AC-11)
 ✓ slots.api.test.ts > T-12a / T-12b / T-12c / T-13
 ✓ bookings.api.test.ts > T-11c / T-14 / T-15 / T-16
 Test Files  10 passed (10)
      Tests  48 passed (48)
```

No existing test was removed, skipped, or weakened. T-11a and T-11b changed their 15-minute expectation to 30 because the requirement changed; the 14-minute rejection was kept in both.

### B.5 Review, integration, release, and deployment

**E-B6. Teammate code review (PR #63, ไอโว, approved 27 Nov 2026 23:49 Bangkok).**

> Code reviewed and approved… The change is the bounded one from the contract: `MIN_SLOT_MINUTES` 15→30 in `slots.ts` and the 15 option removed from `DURATIONS`… No booking, authorization, schema or migration change, matching the impact table. T-11a now checks 29 and 30, plus the old 14 still rejected; T-11b adds 29 to the rejected list and accepts 30/120; T-11c inserts a 15-minute legacy slot with Prisma… Independent re-run… RED on `9b3816d`: server 2 failed / 18 passed… GREEN on `a8f8d13`: server 48/48, client 9/9… Doc fixes: 1. RED test-only commit `1b92ff9` is not on GitHub… cite `9b3816d`… 2. word the TA-approval line factually.

**E-B7. CI.** Run 46036169210, `test-and-docker` on `a8f8d13`: success (server and client tests, E2E, and Docker build).

[PENDING: E-B8, staging merge of PR #63; the release PR into `main` with its review; the deploy run, revision, and footer version]

[PENDING: E-B9, post-deployment checks on the live service: (1) as S1, a new slot with the 30-minute minimum is accepted and the Duration list starts at 30; (2) preserved behaviour: the legacy 15-minute slot from Lab 6 (12 Dec 19:00 to 19:15) still shows on S1's schedule and in C1's bookings; (3) `/api/version` and `/api/ready`]

## Part C: Objective engineering metrics

Repository `alvin777777/hairroot` only. Observation window **21 to 27 November 2026, Asia/Bangkok** (20 Nov 17:00 to 27 Nov 16:59 UTC), unless stated. Collected by ไอโว with the GitHub CLI on 27 Nov 2026 23:45 Bangkok.

| ID | Metric and definition | Value | Source |
|---|---|---|---|
| M-1 | Issues closed as completed in the window | **11** (0 cancelled or duplicate) | List M-1 |
| M-2 | PRs merged in the window, by target | **17**: 13 into `sprint-1-staging`, 4 into `main` | List M-2 |
| M-3 | Automated tests, server suite on `a8f8d13` (snapshot 27 Nov 23:49) | **48 passed / 0 failed / 0 skipped**; client 9/0/0 | E-B3, E-B4 |
| M-4 | UAT defects from the independent UAT (Lab 6); resolved = fix released to `main` and re-test PASS by the UAT team | **1 opened, 1 resolved** (HR-F01, Minor) | List M-4 |
| M-5 | CI runs of workflow `ci-docker.yml` (job `test-and-docker`), all branches | **56**: 44 success, 5 failure, 7 cancelled. Success rate 44/56 = 78.6% (49 completed: 44/49 = 89.8%) | List M-5 |

**M-1, issues closed (date closed, Bangkok).** #27, #28, #29, #30, #31, #32, #33, #34, #45, #48 (all 22 Nov, closing the Lab 5 work); #57 (27 Nov). All closed as completed.

**M-2, PRs merged (date, target).** `sprint-1-staging`: #38 (21 Nov), #39 (21), #44 (22), #46 (22), #49 (22), #51 (22), #54 (22), #42 (26), #58 (27), #55 (27), #56 (27), #62 (27), #61 (27). `main`: #47 (22 Nov), #50 (22), #52 (22), #59 (27).

**M-4, UAT defects.** HR-F01 (Issue #57): reported by DineQ on 26 Nov on `ac0a57b`; fixed in PR #58; released in #59 (`cbaf1ba`); DineQ re-test R02 PASS on 27 Nov; Issue closed 27 Nov. No other UAT defect was reported.

**M-5, CI runs.** Not successful (run ID, result, branch, cause):

| Run | Result | Branch | Cause |
|---|---|---|---|
| 44891832001 | failure | `demo/30-failing-check` | Deliberate failing test (Lab 5 C-02 demonstration) |
| 45017345285 | failure | `codex/lab6-e2e-ownership` | E2E T-33 (now T-39): element not found after switching user |
| 45017531875 | failure | `codex/lab6-e2e-ownership` | Same test, before the sign-in wait was added |
| 45881837785 | failure | `docs/lab6-results` | E2E T-32: `locator.click` timeout (45 s) |
| 46005515290 | failure | `docs/lab6-results` | E2E T-32: same timeout; fixed by the race fix in `1232c3e` |
| 44942468965, 44942497213, 45819385512, 46019022203, 46019426609, 46019548609, 46024538136 | cancelled | various | Superseded by a newer push to the same PR |

Successful runs (44): 44789528243, 44888863927, 44893441499, 44909679832, 44938250341, 44939946862, 44941106402, 44941555868, 44941770795, 44942509389, 44942766014, 44984940546, 44985557944, 44991213860, 44992193019, 44999527514, 44999658937, 44999890317, 45017739275, 45036055608, 45036577524, 45041814906, 45043303484, 45205189331, 45654219493, 45801113598, 45818945347, 45819455328, 45861545443, 45862227356, 45864069871, 45864332622, 45865211235, 45865298497, 45865807764, 45879278446, 45880711607, 46019101547, 46019663099, 46024600241, 46024821781, 46026533314, 46034248721, 46036169210.

**Interpretation (93 words).** Four of the five CI failures were browser E2E timing failures (T-32 twice, T-39 twice), not product defects; the fifth was deliberate. Each was fixed by waiting for the page state, but every one blocked a PR and cost a rerun, and an intermittent failure could hide a real regression in the release candidate. **Action:** before the Deliverable 2 and final releases, ทิฐินันท์ runs the full E2E suite three times on the release candidate and replaces any fixed delay or click race with an explicit wait for the expected text. ไอโว reviews it.

## Part D: Release readiness and retrospective

### D.1 Readiness checklist for the maintained Sprint 1 scope (E-D1)

| Item | Status |
|---|---|
| Submitted and deployed version | [PENDING: release commit and revision after PR #63] |
| Defects by severity and status | Critical 0, Major 0, Minor 0 open. HR-F01 (Minor) resolved and re-tested (M-4) |
| Automated tests | Server 48/0/0, client 9/0/0 on `a8f8d13`; E2E T-31 1/0/0; CI run 46036169210 green. No skipped tests |
| Selected user tests | Lab 6 independent UAT by DineQ: accepted on `cbaf1ba`. UAT-03 steps 5 and 7 test the old 15-minute rule, so they are no longer valid for this release and are replaced by T-11a/b and the post-deploy check |
| Technical debt | See D.2 |
| Configuration and secrets | Secrets in Secret Manager; deploy by Workload Identity Federation; no secret in Git or this PDF. No new configuration in this change |
| Documentation and run instructions | SRS 0.3, F-03 0.4, STS 0.3, traceability 0.3 updated; README unchanged (it states no duration) |
| Deployment and smoke check | [PENDING: deploy run, revision, and E-B9 result] |
| **Decision** | [PENDING: READY or NOT READY after deployment and E-B9] |

### D.2 Technical debt

| Item | Impact | Priority | Disposition |
|---|---|---|---|
| The duration limits are defined twice: `MIN_SLOT_MINUTES` on the server and the `DURATIONS` list in the client | A future change to one side can leave the UI offering a value the server rejects (or hiding a valid one) | Medium | Keep the client test from this change; serve the allowed durations from the API in Sprint 2. Owner: ทิฐินันท์ |
| The contract headers still say *proposal … pending review* after implementation | A reader may think the change is not approved | Low | Update the version lines in SRS, F-03, STS, and traceability with the release. Owner: ไอโว |
| E2E timing sensitivity (Part C) | Intermittent CI failures can hide or delay real failures | Medium | Action in Part C. Owner: ทิฐินันท์ |

### D.3 Retrospective

**What helped.** Writing the boundaries (29/30/120/121) and the legacy-slot rule into the contract and STS first made the RED tests obvious, and the change itself was two lines.

**What hurt.** Evidence was split between two machines and an unpushed commit (`1b92ff9`), so it had to be re-run on a pushed commit to be verifiable; E2E timing failures also cost reruns.

**What will change for the final release.** Every RED/GREEN run will use a commit that is on GitHub, with the log committed in the same PR, and the E2E suite will be run three times on each release candidate (Part C action).

## Contributions, AI use, and limitations

| Work | ไอโว | ทิฐินันท์ |
|---|---|---|
| Change request and impact (Issue #60, PR #61) | Reviewed the contract twice against the code and the handout; approved | Wrote the Issue, impact analysis, and contract revisions |
| Tests and implementation (PR #63) | Code review; independent RED/GREEN re-run on pushed commits | Wrote the tests and the change; RED, GREEN, and E2E evidence |
| Release and deployment | [PENDING] | [PENDING] |
| Metrics and this report | Collected the metrics; wrote the report and PDF | Checked accuracy [PENDING: confirm] |

| Student | AI tool | Tasks assisted |
|---|---|---|
| ไอโว | Claude Code (Claude Opus 5.5) | Reviewing PR #61 and PR #63; re-running the tests; collecting metrics; drafting this report |
| ทิฐินันท์ | OpenAI Codex (GPT-6) | Revising the impact and evidence documents; writing the boundary, legacy-slot, and UI tests; the minimum-duration change in the server and UI; running and recording RED/GREEN, regression tests, builds, and E2E T-31; organising the evidence index. Codex did not deploy to production. |

No password or secret was given to an AI tool.

**Limitations.**
- **No instructor or TA approval was obtained** for the change, although Section 3.1 requires it. The team decided on 27 Nov 2026 not to request it. The change request, the teammate's contract review, and the order of commits are recorded above.
- ทิฐินันท์'s original RED run used a local test-only commit (`1b92ff9`) that is not on GitHub. The verifiable RED evidence is ไอโว's re-run on the pushed commit `9b3816d`, whose application code equals `cbaf1ba`.
- E2E T-31 was run locally for one test; the full E2E suite was run only in CI.
- [PENDING: anything still incomplete after deployment]
