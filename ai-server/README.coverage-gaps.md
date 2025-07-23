# AI Server Test Coverage Gaps (as of 2025-07-01)

This document lists the files in the `ai-server` package that have uncovered lines according to the latest test coverage report from run_2025-07-01T06-12-21. Please address these gaps to maintain the required 80%+ coverage.

---

## Current Coverage Summary

**Overall Status**: Multiple files below 80% coverage threshold requiring immediate attention.

---

## Critical Coverage Gaps (Below 80%)

### High Priority Files (Below 50% Coverage)

| File | Line% | Uncovered Lines | Enhancement Needed |
|------|-------|----------------|-------------------|
| `ai-server/src/orchestrator.utils.ts` | 0% | 9 | **Complete implementation - file appears empty or stub** |
| `ai-server/src/routes/modelMap.ts` | 22.22% | 12,13,15,17,18,19,21 | **Add comprehensive route tests for model mapping** |
| `ai-server/src/routes/models.ts` | 14.29% | 8,13,14,16,17,18,19,20,21,22,23,24,25,26,27,28,33,36 | **Add comprehensive route tests for model operations** |
| `ai-server/src/routes/ollamaCompat.ts` | 28.46% | [181 uncovered lines] | **Add comprehensive Ollama compatibility tests** |
| `ai-server/src/routes/orchestrator.ts` | 11.39% | [70 uncovered lines] | **Add comprehensive orchestrator route tests** |
| `ai-server/src/index.ts` | 50% | 15,16 | **Add initialization and error handling tests** |

### Medium Priority Files (50-80% Coverage)

| File | Line% | Uncovered Lines | Enhancement Needed |
|------|-------|----------------|-------------------|
| `ai-server/src/orchestrator.ts` | 56.9% | [103 uncovered lines] | **Add orchestrator logic tests, especially error paths** |
| `ai-server/src/benchmarkManager.ts` | 65.38% | [45 uncovered lines] | **Add benchmark manager tests for uncovered scenarios** |
| `ai-server/src/server-persistence.ts` | 72.22% | 13,19,29,34,38 | **Add persistence layer error handling tests** |
| `ai-server/src/orchestrator-benchmark-persistence.ts` | 73.33% | 18,28,31,32 | **Add benchmark persistence edge case tests** |

### Well-Covered Files (80%+ Coverage) ✅

| File | Line% | Status |
|------|-------|--------|
| `ai-server/src/routes/benchmarks.ts` | 100% | ✅ Complete |
| `ai-server/src/routes/config.ts` | 100% | ✅ Complete |
| `ai-server/src/routes/health.ts` | 100% | ✅ Complete |
| `ai-server/src/routes/orchestratorConfig.ts` | 100% | ✅ Complete |
| `ai-server/src/routes/servers.ts` | 100% | ✅ Complete |
| `ai-server/src/orchestrator-instance.ts` | 100% | ✅ Complete |
| `ai-server/src/orchestrator-persistence.ts` | 100% | ✅ Complete |
| `ai-server/src/routes/tags.ts` | 95.65% | ✅ Nearly complete |
| `ai-server/src/app.ts` | 92.31% | ✅ Well-covered |
| `ai-server/src/logger.ts` | 88.89% | ✅ Well-covered |
| `ai-server/src/routes/generate.ts` | 80.18% | ✅ Meets threshold |

---

## Action Items (Priority Order)

### Immediate Priority - Missing Test Files
1. **`ai-server/src/orchestrator.utils.ts`** - Create `tests/unit/orchestrator-utils.test.ts`
   - Test `isHugeModel()` function with various model names
   - Add edge cases for model name patterns
   
2. **`ai-server/src/routes/modelMap.ts`** - Create `tests/routes/model-map.test.ts`
   - Test GET `/model-map` endpoint
   - Mock orchestrator responses
   - Test server-to-models mapping logic

3. **`ai-server/src/routes/models.ts`** - Create `tests/routes/models.test.ts`
   - Test GET `/` returns 404
   - Test GET `/:model` with valid/invalid models
   - Mock fetch requests to upstream servers

### High Priority - Expand Existing Tests
4. **`ai-server/src/routes/ollamaCompat.ts`** - Expand `tests/unit/ollama-compat-endpoints.test.ts`
   - Current: 28.46% coverage (181 uncovered lines)
   - Add comprehensive tests for all Ollama compatibility endpoints
   - Test error handling paths in existing tests

5. **`ai-server/src/routes/orchestrator.ts`** - Create `tests/routes/orchestrator.test.ts`
   - 11.39% coverage (70 uncovered lines)
   - Test all orchestrator route endpoints
   - Mock orchestrator instance methods

6. **`ai-server/src/orchestrator.ts`** - Expand `tests/unit/orchestrator.test.ts`
   - Current: 56.9% coverage (103 uncovered lines)
   - Add tests for uncovered orchestrator logic paths
   - Focus on error handling and edge cases

### Medium Priority - Enhance Coverage
7. **`ai-server/src/benchmarkManager.ts`** - Expand `tests/unit/benchmarks.test.ts`
   - Current: 65.38% coverage (45 uncovered lines)
   - Add benchmark execution error scenarios
   - Test performance measurement edge cases

8. **`ai-server/src/server-persistence.ts`** - Expand `tests/server-persistence.test.ts`
   - Current: 72.22% coverage, lines: 13,19,29,34,38
   - Add error handling tests for persistence failures
   - Test file system edge cases

9. **`ai-server/src/index.ts`** - Expand `tests/index.test.ts`
   - Current: 50% coverage, lines: 15,16
   - Add initialization failure tests
   - Test startup error scenarios

### Lower Priority - Minor Improvements
10. **`ai-server/src/routes/tags.ts`** - Enhance existing tests
    - Current: 95.65% coverage, lines: 27,52
    - Add edge cases for remaining uncovered lines

11. **`ai-server/src/logger.ts`** - Enhance `tests/logger.test.ts`
    - Current: 88.89% coverage, line: 8
    - Test remaining log level functionality

### Testing Strategy
- **Route Tests**: Use supertest for HTTP endpoint testing
- **Unit Tests**: Mock external dependencies (orchestrator, file system)
- **Integration Tests**: Test with real orchestrator instances where needed
- **Error Handling**: Focus on timeout, network, and resource failure scenarios
- **Async Operations**: Ensure proper cleanup and error propagation

### Existing Test Files That Can Be Enhanced
- ✅ `tests/unit/ollama-compat-endpoints.test.ts` - Expand coverage
- ✅ `tests/unit/orchestrator.test.ts` - Add error paths
- ✅ `tests/unit/benchmarks.test.ts` - Add edge cases
- ✅ `tests/server-persistence.test.ts` - Add error handling
- ✅ `tests/index.test.ts` - Add startup failures
- ✅ `tests/logger.test.ts` - Complete coverage

### New Test Files Needed
- 🆕 `tests/unit/orchestrator-utils.test.ts`
- 🆕 `tests/routes/model-map.test.ts`
- 🆕 `tests/routes/models.test.ts`
- 🆕 `tests/routes/orchestrator.test.ts`

---

*Generated on 2025-07-01 from coverage report: test-results/run_2025-07-01T06-12-21/coverage/coverage.csv*
*Please update this file after addressing the coverage gaps and re-running: `npm run test:ai-server --coverage`*
