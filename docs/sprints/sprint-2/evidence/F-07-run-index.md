# F-07 test evidence

Contract: PR #69, merged to `sprint-2-staging` as `53ad59d` before the RED commits.

| Phase | Commit tested | Command and working directory | Exit | Log |
|---|---|---|---:|---|
| RED API | `f968013` (contains API RED commit `81fcaeb`; no F-07 implementation) | `npm test -- rescheduling.api.test.ts` in `server/` | 1 expected; 6/6 failed because the route was absent | `F-07-red-server.txt` |
| RED UI | `f968013` (contains UI RED tests; no F-07 implementation) | `npm test -- rescheduling.test.tsx` in `client/` | 1 expected; 3/3 failed because Change time was absent | `F-07-red-client.txt` |
| GREEN API and regression | `9fab284` | `npm test` in `server/` | 0; 60/60 passed | `F-07-green-server.txt` |
| GREEN UI and regression | `9fab284` | `npm test` in `client/` | 0; 23/23 passed | `F-07-green-client.txt` |
| GREEN browser flow and regression | `9fab284` | `npm test` in `e2e/` | 0; 8/8 passed | `F-07-green-e2e.txt` |

The RED runs used the parent test commit, then the checkout was restored to `codex/f07-rescheduling` for GREEN. All runs used the local test database; no production credentials are included in these logs.
