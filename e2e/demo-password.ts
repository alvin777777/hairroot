// Password for the throwaway demo accounts that the E2E setup seeds into the local hairroot_test
// database. It is not used by any deployed environment; override it with E2E_DEMO_PASSWORD.
export const E2E_DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "E2E-local-Pass1";
