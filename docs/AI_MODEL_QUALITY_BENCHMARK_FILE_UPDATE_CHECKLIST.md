# AI Model Quality Benchmark Refactor: File-Level Update Checklist

This checklist details all required file updates, edits, and removals for the quality benchmark refactor. Follow project conventions and update documentation as specified in `copilot-instructions.md`.

---


## 1. Source Code: Production-Readiness & Migration Checklist

- **ai-server/benchmarking/BenchmarkingManager.ts**
  - Replace all in-memory/mock logic with persistent storage (database or service) for model benchmarks.
  - Integrate real server discovery and latency measurement (remove simulated servers/latencies).
  - Ensure results are stored in the `ai-model` node, keyed by benchmark type, and are up-to-date.
  - Remove all demo, stub, and placeholder code/comments.

- **ai-server/orchestrator/ModelSelector.ts**
  - Replace stub logic with production-ready model selection using real benchmark and latency data.
  - Ensure selection logic is fully integrated with the new benchmarking manager and types.
  - Remove all stub/demo comments.

- **ai-server/types/models.ts** and **shared/types/aiQualityBenchmark.ts**
  - Ensure all required fields for model-centric, generic benchmarks are present and strictly typed.
  - Unify and document types for extensibility and cross-module use.

- **ai-server/orchestrator/RecommendationEngine.ts**
  - Replace stub logic with production-ready recommendation logic using real benchmark data.
  - Integrate with the new benchmarking manager and types.

- **ai-server/src/controllers/ragTextController.ts**
  - Update any references to quality benchmarks to use the new workflow and types.
  - Remove any legacy or stubbed logic related to model quality selection.

- **ai-server/src/utils/pipelineTasks.ts**
  - Ensure pipeline tasks support new benchmark types and routing logic as needed.

- **ai-server/orchestrator/index.ts**
  - Update barrel exports as modules are refactored or replaced.






#### Files to Update or Create for Migration

- [ ] ai-server/benchmarking/BenchmarkingManager.ts (main migration target)
- [ ] ai-server/benchmarking/db/modelBenchmarksDb.ts (persistent storage logic)
- [ ] ai-server/orchestrator/serverDiscovery.ts (server/latency logic)
- [ ] shared/types/aiQualityBenchmark.ts (types for benchmarks, scoring, etc.)
- [ ] shared/types/models.ts (model metadata/types)
- [ ] ai-server/orchestrator/ModelSelector.ts (selection logic integration)
- [ ] ai-server/orchestrator/RecommendationEngine.ts (recommendation logic integration)
- [ ] ai-server/src/controllers/ragTextController.ts (controller integration)
- [ ] ai-server/src/utils/pipelineTasks.ts (pipeline support for new benchmarks)
- [ ] tests/ (add/update unit tests for all migrated logic)


- [x] BLEU/ROUGE scoring for all benchmark types (JSON, conversational, character generation)
- [x] Schema validation for JSON generation (Ajv)
- [x] Prompt adherence and detail/creativity checks for conversational and character generation
- [x] Model API call logic with retries and exponential backoff
- [x] Aggregation of multiple test prompts per benchmark type
- [x] Per-task quality scoring and overall aggregation
- [x] Latency-based server selection and slow server detection
- [x] Automated/background benchmarking and scheduling
- [x] Quality data update and recommendation logic per task type
- [x] Quality report generation (summary, recommendations, per-model data)
- [x] Error handling and logging for all evaluation steps

---

---

## 2. Documentation Updates

- **docs/AI_MODEL_QUALITY_BENCHMARK_REFACTOR_CHECKLIST.md**
  - Maintain and update implementation checklist as progress is made.

- **docs/UNIFIED_PIPELINE_AND_MODEL_SELECTION_PLAN.md**
  - Update workflow diagrams and file references for new benchmark logic.
  - Add section describing generic benchmark types and model-centric storage.

- **docs/TOOL_ORIENTED_AI_HELPER_IMPLEMENTATION_PLAN.md**
  - Document new benchmark workflow and integration points.

- **docs/README.md**
  - Update summary and usage instructions for quality benchmarking.

- **docs/DECISION_LOG.md**
  - Record architectural decisions, rationale, and cross-reference related changes.

---

## 3. Directory Structure & Barrel Files

- **MODULAR_DIRECTORY_STRUCTURE.md**
  - Update directory tree to reflect any new/renamed files or modules.

- **Barrel Files (`index.ts`)**
  - Update all affected directories to re-export new/changed modules.

---


## 4. Removals, Deprecations & Migration Plan

- Refactor all quality benchmarking logic into `ai-server/benchmarking/BenchmarkingManager.ts` using generic, extensible types and model-centric storage (in `ai-model` node, keyed by benchmark type).
- Ensure all type definitions for benchmarks are unified and extensible in `shared/types/aiQualityBenchmark.ts` or `ai-server/types/models.ts`.
- Update all orchestrator, controller, and utility files to use the new benchmarking manager and types.
- Remove any legacy code or documentation referencing quality benchmarks stored in `ai-performance` nodes.
- Deprecate any benchmark types or logic that are not generic/extensible.
- Add/Update unit tests for the new implementation and remove any tests specific to the old manager.

---

## 5. Quality Assurance & Progress Tracking

- **PROJECT_CHECKLIST.md**
  - Mark relevant items as complete/in progress.
- **docs/PROGRESS.md**
  - Log progress and blockers.

---

## Notes
- Ensure all updates follow strict TypeScript, documentation, and architectural conventions.
- Update test coverage and validate all changes in staging before merging.







Your current benchmarks are running, but the results are limited by several issues:
- Some servers are returning 500 errors or timing out on `/api/generate` (likely due to model loading, RAM, or misconfiguration).
- BLEU/ROUGE scoring is failing (`bleu is not a function`), so quality scores are not meaningful.
- Some model outputs are malformed or not valid JSON, causing parsing errors.
- Benchmarks are not robust to streaming/NDJSON responses or model-specific quirks.

To enhance your benchmarks for better, more actionable results:

### 1. Robust Model API Calls
- Add retry logic and exponential backoff for transient errors (network, 500, timeouts).
- Detect and handle model loading delays (Ollama may take 10–30s to load a model).
- For `/api/generate`, check for streaming/NDJSON and parse accordingly.

### 2. Improve Output Parsing
- For JSON benchmarks, use a tolerant parser that can extract the first valid JSON object from a messy or NDJSON stream.
- For text/creative benchmarks, trim and normalize whitespace before scoring.

### 3. Fix BLEU/ROUGE Scoring
- Ensure your BLEU/ROUGE implementation is correct and available (import a robust library, e.g., `n-bleu`, `rouge-score`).
- Add error handling so a missing scorer does not zero out the score.

### 4. Quality Benchmarking Improvements
- For each benchmark type, provide a canonical reference output and compare model output to it.
- For creative/text tasks, use both automated metrics (BLEU/ROUGE) and simple heuristics (length, keyword presence).
- For code/TypeScript, use a linter or type checker to validate output.

### 5. Latency/Throughput
- For latency, always measure both cold (model not loaded) and warm (model loaded) times if possible.
- For throughput, run multiple requests in parallel and measure average response time.

### 6. Error Reporting & Logging
- Log all errors with enough context (server, model, input, error message).
- Return error details in the benchmark result rubric for transparency.

### 7. Adaptive Benchmarking
- If a server fails repeatedly, mark it as unhealthy and skip further benchmarks until it recovers.
- If a model is slow to load, increase timeout for that server/model pair.

---

#### Example: Improving `runBenchmarksForServer`
- Add a helper to robustly call the model API, with retries and streaming/NDJSON support.
- Use a real BLEU/ROUGE scorer and catch errors.
- For JSON, extract the first valid object even from a messy response.

Would you like a concrete code patch for any of these improvements (e.g., BLEU/ROUGE fix, robust JSON extraction, or retry logic for model API calls)? If so, specify which area to prioritize first.