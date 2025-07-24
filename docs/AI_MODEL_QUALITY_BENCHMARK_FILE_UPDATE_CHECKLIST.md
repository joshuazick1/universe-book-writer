# AI Model Quality Benchmark Refactor: File-Level Update Checklist

This checklist details all required file updates, edits, and removals for the quality benchmark refactor. Follow project conventions and update documentation as specified in `copilot-instructions.md`.

---

## 1. Source Code Updates

- **ai-server/benchmarking/BenchmarkingManager.ts**
  - Refactor to run quality benchmarks per model (not server/model pair).
  - Implement selection of highest latency server for each model.
  - Accept and process generic benchmark types: `task-planning`, `json-assembly`, `creative-writing`, `typescript-quality`.
  - Store results in `ai-model` node, keyed by benchmark type.
  - Remove any logic storing quality scores in `ai-performance` nodes.

- **ai-server/orchestrator/ModelSelector.ts**
  - Update model selection logic to use quality scores from model node.
  - Ensure latency scores are used for server selection only.

- **ai-server/types/models.ts** (and/or `shared/types/aiQualityBenchmark.ts`)
  - Define/extend types for generic quality benchmarks and scoring rubrics.
  - Ensure strict typing and extensibility.

- **ai-server/orchestrator/RecommendationEngine.ts**
  - Integrate new quality benchmark results into recommendation logic.

- **ai-server/src/controllers/ragTextController.ts**
  - Update any references to quality benchmarks to use new workflow.

- **ai-server/src/utils/pipelineTasks.ts**
  - Refactor to support new benchmark types and routing logic.

- **ai-server/orchestrator/index.ts**
  - Ensure exports and barrel files are updated for new/changed modules.

- **ai-server/tests/**
  - Add/Update unit tests for:
    - BenchmarkingManager changes
    - ModelSelector logic
    - RecommendationEngine integration
    - Type definitions and edge cases

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

## 4. Removals & Deprecations

- Remove any legacy code or documentation referencing quality benchmarks stored in `ai-performance` nodes.
- Deprecate any benchmark types or logic that are not generic/extensible.

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
