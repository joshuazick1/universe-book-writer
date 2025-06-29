# Test Failures Report - 2025-06-28

This document summarizes the failed tests from the latest run and suggests potential fixes.

## Summary
- **Total Failed Tests:** 27
- **Total Tests:** 1077
- **Date:** 2025-06-28

---

## Notable Failures

### 1. `ai-server/tests/unit/orchestrator.test.ts`

#### a) should add and remove servers
- **Error:**
  - `expect(received).toBe(expected) // Object.is equality`
  - **Expected:** 2
  - **Received:** 34
- **Potential Cause:**
  - The orchestrator's `getServers()` is returning more servers than expected, possibly due to test pollution or improper cleanup between tests.
- **Suggested Fix:**
  - Ensure test isolation. Clear or reset the orchestrator's server list before each test.
  - Check for global state leaks.

#### b) should aggregate models and get all models
#### c) should get best server for model, skipping cooldown and bans
- **Error:**
  - `TypeError: Cannot set properties of undefined (setting 'healthy')`
  - **Location:** `addMockServer` helper, when trying to set `server.healthy = ...`
- **Potential Cause:**
  - `orchestrator.getServers().find(s => s.id === opts.id)` is returning `undefined`.
  - The server may not be added correctly, or the test setup is not matching the orchestrator's internal state.
- **Suggested Fix:**
  - Verify that `addServer` is working as intended and that the server is present in the orchestrator after addition.
  - Add assertions after `addServer` to confirm the server exists before mutating its properties.
  - Consider refactoring `addMockServer` to throw if the server is not found.

---

## General Recommendations
- Review test setup and teardown logic for all orchestrator-related tests.
- Ensure that all mocks and state are reset between tests to avoid cross-test contamination.
- If using singleton patterns or global state, consider refactoring for better testability.

---

## Next Steps
- Address the above issues in the orchestrator tests.
- Re-run the test suite to confirm fixes.
- If failures persist, enable verbose logging for the failing tests and review the logs for additional context.

---

*Generated automatically from test-results/run_2025-06-28T05-30-29/summary.json and related logs.*
