# AI Model Quality Benchmark Refactor Checklist

## Objective
Refactor the quality benchmarking workflow to be model-centric, extensible, and compliant with project architecture and documentation standards.

---

## Checklist

### 1. Benchmark Targeting
- [ ] Update runner to benchmark unique models (not server/model pairs)
- [ ] For each model, select the highest latency server for benchmark execution

### 2. Task Types & Extensibility
- [ ] Define generic quality benchmark types in `shared/types/aiQualityBenchmark.ts`:
    - [ ] `task-planning`
    - [ ] `json-assembly`
    - [ ] `creative-writing`
    - [ ] `typescript-quality`
- [ ] Ensure each type has clear input/output schema and scoring rubric
- [ ] Document types and edge cases in module README

### 3. Node Storage
- [ ] Store quality scores in the `ai-model` node
- [ ] Key results by benchmark type
- [ ] Remove any quality scores from `ai-performance` nodes

### 4. Benchmark Runner Refactor
- [ ] Refactor runner to:
    - [ ] Accept a list of generic task types
    - [ ] Select slowest server for each model
    - [ ] Store results in correct node
- [ ] Update interfaces in `shared/types/`
- [ ] Add/Update unit tests for new runner logic

### 5. Routing Logic Integration
- [ ] Update model selection logic to use quality scores from model node
- [ ] Use latency scores from `ai-performance` node for server selection

### 6. Documentation
- [ ] Update module README with new workflow, types, and usage examples
- [ ] Update architectural docs and diagrams as needed
- [ ] Record changes in `docs/DECISION_LOG.md`

### 7. Validation & QA
- [ ] Run full test suite and ensure >80% coverage
- [ ] Validate benchmark results and routing logic in staging
- [ ] Update `docs/PROGRESS.md` upon completion

---

## Notes
- Follow all conventions in `copilot-instructions.md` and Clean Architecture plan
- Ensure zero duplication and strict typing
- Document all changes and update barrel files as needed
