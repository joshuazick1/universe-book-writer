# Unified Implementation Plan: Enhanced Pipeline Streaming & Orchestrator Model Selection

## Overview
This plan combines the implementation of enhanced RAG pipeline streaming (with friendly task names and real-time status) and orchestrator-driven model selection/recommendations for both backend and frontend. The goal is to provide clear, actionable steps and file targets for a cohesive developer experience.

---

## Backend Plan

### Key Files to Update/Create
- `ai-server/src/controllers/ragTextController.ts`  
  (Pipeline streaming logic, SSE events, orchestrator integration)
- `ai-server/src/utils/pipelineTasks.ts`  
  (Canonical pipeline task list & friendly names)
- `ai-server/src/routes/rag/ingestTextStream.ts`  
  (Route wiring)
- `ai-server/orchestrator/ModelSelector.ts`  
  (Model selection logic)
- `ai-server/orchestrator/RecommendationEngine.ts`  
  (Dynamic recommendations)
- `ai-server/orchestrator/index.ts`  
  (Barrel file)
- `ai-server/benchmarking/BenchmarkingManager.ts`  
  (Expose `getQualityReport()`)
- `ai-server/types/models.ts`  
  (Model metadata/types)
- (Optional) `ai-server/tests/`  
  (Test coverage)

### Steps
1. **Pipeline Task List**: Define canonical pipeline tasks and friendly names in `pipelineTasks.ts`.
2. **Streaming Events**: Update `ragTextController.ts` to emit `pipeline_overview` and `task_status` SSE events, using friendly names.
3. **Model Selection**: Integrate orchestrator model selection in the pipeline (select best model if not specified, use recommendations for downstream tasks).
4. **Recommendation Engine**: Implement or update `RecommendationEngine.ts` to provide dynamic model suggestions based on benchmarking data.
5. **Benchmarking Integration**: Ensure orchestrator consumes `getQualityReport()` from `BenchmarkingManager.ts`.
6. **Types**: Update/add model and pipeline types in `types/models.ts`.
7. **Testing**: Add/expand tests for streaming, model selection, and recommendations.

---


## Frontend Plan (ai-server/web dev server)

This plan targets the development frontend located in `ai-server/web/src` (not the main production frontend). All implementation, testing, and updates should be performed in this dev server codebase.

### Key Files to Update/Create
- `ai-server/web/src/components/PipelineStatus.tsx`  
  (Pipeline visualization component)
- `ai-server/web/src/pages/ingest/[...].tsx`  
  (SSE event handling, model selection UI)
- `ai-server/web/src/features/rag-dashboard/components/TextToRagNode.tsx`  
  (Model selection & recommendations)
- `ai-server/web/src/features/rag-dashboard/hooks/useModelRecommendations.ts`  
  (Fetch/display model recommendations)
- `ai-server/web/src/utils/pipelineFriendlyNames.ts`  
  (Friendly name mapping)
- `ai-server/web/src/types/pipeline.ts`  
  (Pipeline event types)
- `ai-server/web/src/types/models.ts`  
  (Model metadata/types)
- (Optional) `ai-server/web/src/tests/`  
  (UI/SSE/model selection tests)

### Steps
1. **SSE Handling**: Update event handlers in the dev frontend to process `pipeline_overview` and `task_status` events, using friendly names.
2. **Pipeline Visualization**: Build/update `PipelineStatus.tsx` in the dev frontend to show all tasks and their statuses in real time.
3. **Model Selection UI**: Integrate model selection and recommendations into the ingest/dashboard UI of the dev frontend, using orchestrator data.
4. **Friendly Names**: Use friendly names for all tasks/nodes in the dev frontend UI.
5. **Types**: Ensure pipeline/model types are up to date and shared with backend.
6. **Testing**: Test UI and SSE/model selection flows with various pipeline runs in the dev frontend.

---

## Documentation & Architecture
- Update `docs/ENHANCED_PIPELINE_STREAMING_AND_UI.md` and `docs/ORCHESTRATOR_MODEL_SELECTION_AND_RECOMMENDATIONS.md` with implementation details, file paths, and architectural notes.
- Record all major changes in `docs/DECISION_LOG.md`.
- Update relevant README files in `ai-server/` and `frontend/`.

---

## Example Workflow
1. User submits text for ingestion.
2. Backend orchestrator selects the best model (unless overridden), emits pipeline overview and task status events with friendly names.
3. Frontend displays real-time pipeline progress and model selection/recommendations.
4. All events and recommendations are type-safe and documented.

---

## Notes
- Ensure extensibility for future pipeline steps and model types.
- Keep all logic modular and well-documented for maintainability.
