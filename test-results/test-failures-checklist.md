# Test Failures Checklist (Fastest Wins First)

This checklist prioritizes the quickest fixes for the failed tests from the latest run. Addressing these in order should maximize rapid progress.

## ✅ Fastest Wins

- [x] **Fix test pollution in orchestrator tests**
  - Clear/reset orchestrator state before each test to avoid leftover servers.
  - **Why:** Most likely root cause for the `should add and remove servers` test returning too many servers.
  - **Effort:** Low (add `beforeEach`/`afterEach` cleanup).

- [x] **Guard against undefined in addMockServer**
  - Add an assertion or error if `getServers().find(...)` returns undefined before mutating properties.
  - **Why:** Prevents `Cannot set properties of undefined (setting 'healthy')` errors.
  - **Effort:** Low (add a check and throw or fail early).

- [x] **Refactor addMockServer to always add the server**
  - Ensure the mock server is always present after `addServer`.
  - **Why:** Ensures test setup is reliable and prevents undefined errors.
  - **Effort:** Low (review helper logic).

- [x] **Add assertions after addServer in tests**
  - Immediately check that the server exists after adding.
  - **Why:** Early detection of setup issues.
  - **Effort:** Low.

## 🟡 Medium Wins

- [ ] **Review orchestrator singleton/global state**
  - If orchestrator is reused across tests, refactor to allow isolated instances.
  - **Why:** Prevents cross-test contamination.
  - **Effort:** Medium.

- [ ] **Improve teardown logic**
  - Ensure all state, mocks, and timers are reset between tests.
  - **Why:** Avoids side effects.
  - **Effort:** Medium.

## 🔴 Slower Wins

- [ ] **Enable verbose logging for failing tests**
  - Add more debug output to failing tests to capture state.
  - **Why:** Helps diagnose persistent or non-obvious issues.
  - **Effort:** Low, but may require more test runs.

- [ ] **Refactor orchestrator internals for testability**
  - Decouple state, use dependency injection, etc.
  - **Why:** Long-term reliability and maintainability.
  - **Effort:** High.

---

*Start with the top items for the fastest improvements. Re-run tests after each fix to verify progress.*
