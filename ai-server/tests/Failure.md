# AI Server Test Failures Report

**Test Run Timestamp:** 2025-06-28T16-08-54  
**Test Results Directory:** `test-results/run_2025-06-28T16-08-54/`  
**Total Test Suites:** 26  
**Total Tests:** 73  
**Passed:** 55  
**Failed:** 18  
**Skipped:** 0  

---

## Summary of Failed Test Suites and Individual Test Failures

---

### 1. `ai-server/tests/unit/tags/tags-api-edge-cases.test.ts`
**Log:** [ai-server_tests_unit_tags_tags-api-edge-cases.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_unit_tags_tags-api-edge-cases.test.ts.log)

- GET handles a model with missing fields gracefully
- GET includes a model present on only one server
- GET skips a server that returns invalid data but still aggregates from others

---

### 2. `ai-server/tests/routes/generate.test.ts`
**Log:** [ai-server_tests_routes_generate.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_routes_generate.test.ts.log)

- handles non-streaming JSON response
- handles NDJSON response
- handles streaming response
- handles model not found in downstream JSON

---

### 3. `ai-server/tests/unit/routes/show.test.ts`
**Log:** [ai-server_tests_unit_routes_show.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_unit_routes_show.test.ts.log)

- returns 200 and model info for POST with valid model

---

### 4. `ai-server/tests/app.test.ts`
**Log:** [ai-server_tests_app.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_app.test.ts.log)

- should handle thrown string errors

---

### 5. `ai-server/tests/routes/benchmarks.test.ts`
**Log:** [ai-server_tests_routes_benchmarks.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_routes_benchmarks.test.ts.log)

- GET /api/orchestrator/benchmarks returns all benchmarks
- POST /api/orchestrator/benchmarks/run triggers all benchmarks
- POST /api/orchestrator/benchmarks/server triggers all models for a server
- POST /api/orchestrator/benchmarks/server triggers a specific model
- POST /api/orchestrator/benchmarks/server returns 404 for missing server
- POST /api/orchestrator/benchmarks/server returns 404 for missing model

---

### 6. `ai-server/tests/unit/orchestrator.test.ts`
**Log:** [ai-server_tests_unit_orchestrator.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_unit_orchestrator.test.ts.log)

- should aggregate models and get all models
  - **Reason:** Test setup failed: `addMockServerTo: Server with id 'b' was not found after addServer.` The test could not find the server after adding it, likely due to a bug in the test helper or orchestrator's `addServer` logic.
  - **Proposed Solution:** Ensure `addServer` correctly adds the server with the expected `id`. Add debug output to verify the state of `orchestrator.getServers()` after each `addServer` call. Check for state mutation between tests.

- should get best server for model, skipping cooldown and bans
  - **Reason:** Same as above: `addMockServerTo: Server with id 'b' was not found after addServer.`
  - **Proposed Solution:** Same as above.

---

### 7. `ai-server/tests/orchestrator-instance.test.ts`
**Log:** [ai-server_tests_orchestrator-instance.test.ts.log](test-results/run_2025-06-28T16-08-54/ai-server_tests_orchestrator-instance.test.ts.log)

- should handle error/fallback logic in addServer/removeServer patching
  - **Reason:** `ReferenceError: require is not defined`. The test uses `require` in an ESM context, which is not allowed.
  - **Proposed Solution:** Replace `require` with dynamic `import()` for ESM compatibility. Refactor the test to use ESM imports and mocks.

---

### 8. `tests/orchestrator-instance.test.ts`
**Log:** [tests_orchestrator-instance.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_orchestrator-instance.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 9. `tests/unit/tags/tags-api.test.ts`
**Log:** [tests_unit_tags_tags-api.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_unit_tags_tags-api.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 10. `tests/unit/admin/admin-config-api.test.ts`
**Log:** [tests_unit_admin_admin-config-api.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_unit_admin_admin-config-api.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 11. `tests/unit/ollama-compat-endpoints.test.ts`
**Log:** [tests_unit_ollama-compat-endpoints.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_unit_ollama-compat-endpoints.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 12. `tests/routes/health.test.ts`
**Log:** [tests_routes_health.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_routes_health.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 13. `tests/server-persistence.test.ts`
**Log:** [tests_server-persistence.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_server-persistence.test.ts.log)

- (See log for details; test names not listed in summary)

---

### 14. `tests/orchestrator-persistence.test.ts`
**Log:** [tests_orchestrator-persistence.test.ts.log](test-results/run_2025-06-28T16-08-54/tests_orchestrator-persistence.test.ts.log)

- (See log for details; test names not listed in summary)

---

## Notes

- For test suites where individual test names are not listed in the summary, please refer to the linked log files for detailed failure information.
- All log files are available in the `test-results/run_2025-06-28T16-08-54/` directory for in-depth diagnostics.
- Some test files may be duplicated under both `ai-server/tests/` and `tests/` directories; ensure you are reviewing the correct log for the intended test suite.

---

**Generated by the Enhanced Test Runner on 2025-06