# Lab 7 RED/GREEN evidence index

Date: 27 Nov 2026 (Asia/Bangkok)

## RED on the actual pre-change release

- Pre-change source: `main` commit `cbaf1baa38a5b20c98b006f6f6effbe0f2e3f39d`.
- The original captured terminal logs came from local test-only commit `1b92ff9dedfd067019aff1534c17756e5956a8da`, applied to the exact pre-change source commit above. This local test-only commit is not on GitHub; raw output is preserved in the two RED logs below.
- GitHub-verifiable independent RED rerun: pushed commit `9b3816d790aa08c6cad1f1fe00e7a7958982ded0`. Its application source under `server/src` and `client/src` is unchanged from `cbaf1ba`; it contains the tests that expose the missing behavior. Iivo independently reported server 2 failed/18 passed and client 1 failed/3 passed in PR #63.
- Server command: `npm test -- --reporter=verbose tests/slots.unit.test.ts tests/slots.api.test.ts tests/bookings.api.test.ts`.
- Server result: 18 passed, 2 failed. The expected failures show that 29 minutes was accepted (HTTP 201 instead of 400) and the unit rule treated 29 minutes as valid. T-11c passed: a Prisma-inserted legacy 15-minute slot stayed visible, bookable, and unchanged.
- Client command: `npm test -- --reporter=verbose tests/screen-states.test.tsx`.
- Client result: 3 passed, 1 failed. The expected failure shows the schedule page still offered 15 minutes.

Full terminal output: `RED-server-2026-11-27.txt` and `RED-client-2026-11-27.txt`.

## GREEN and regression on the implementation

- Implementation branch: `feature/lab7-min-slot-duration`.
- Tested implementation commit: `923c98e255822ee590093b1326e9c7f0819b5910`.
- Server command: `npm test -- --reporter=verbose` — 48/48 passed.
- Client command: `npm test -- --reporter=verbose` — 9/9 passed.
- E2E command: `npm test -- tests/sprint-1.spec.ts --grep T-31` — 1/1 passed.
- `npm run build` passed in both `server` and `client`.

Full terminal output: `GREEN-server-2026-11-27.txt`, `GREEN-client-2026-11-27.txt`, and `GREEN-e2e-T31-2026-11-27.txt`.

The API tests ran against a temporary local PostgreSQL `hairroot_test` database. No production data or live deployment was changed. The implementation code was approved by the teammate in PR #63 and CI passed for the code/test revision; the workflow is pending again after this documentation-only correction. It has not merged to staging or been deployed; release and post-deployment checks remain pending.
