# AI Model Quality Benchmark Refactor: File-Level Update Checklist

This checklist details all required file updates, edits, and removals for the quality benchmark refactor. Follow project conventions and update documentation as specified in `copilot-instructions.md`.

---


## 1. Source Code: Production-Readiness & Migration Checklist

- **ai-server/benchmarking/BenchmarkingManager.ts**
  - Replace all in-memory/mock logic with persistent storage (database or service) for model benchmarks.
  - Integrate real server discovery and latency measurement (remove simulated servers/latencies).
  - Implement actual benchmark execution for each model and benchmark type, migrating any robust evaluation logic from `QualityBenchmarkManager` (e.g., scoring, retries, schema validation, BLEU/ROUGE, etc.).
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

- **Migration from QualityBenchmarkManager**



### [x] Logic to Migrate from QualityBenchmarkManager


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

- Remove `ai-server/src/services/benchmarking/QualityBenchmarkManager.ts` and any related files or documentation (including `QUALITY_BENCHMARKING_AGGREGATION_AND_SCORING.md`, `REAL_MODEL_BENCHMARKING_STEPS.md` if specific to the old implementation).
- Remove or update any imports/usages of `QualityBenchmarkManager` throughout the codebase.
- Refactor all quality benchmarking logic into `ai-server/benchmarking/BenchmarkingManager.ts` using generic, extensible types and model-centric storage (in `ai-model` node, keyed by benchmark type).
- Ensure all type definitions for benchmarks are unified and extensible in `shared/types/aiQualityBenchmark.ts` or `ai-server/types/models.ts`.
- Update all orchestrator, controller, and utility files to use the new benchmarking manager and types.
- Remove any legacy code or documentation referencing quality benchmarks stored in `ai-performance` nodes.
- Deprecate any benchmark types or logic that are not generic/extensible.
- Remove references to `QualityBenchmarkManager` from all documentation and update workflow/architecture docs to reflect the new approach.
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
