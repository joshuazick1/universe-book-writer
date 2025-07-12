---

## 6. Files to Update for Orchestrator Model Selection & Recommendations

To implement orchestrator-based model selection and dynamic recommendations for the RAG-to-text endpoint and the AI server/web dashboard, the following files should (and likely must) be updated or created:

### 1. Orchestrator Logic & Interfaces
- `ai-server/orchestrator/ModelSelector.ts` (or similar): New or updated module for model selection logic.
- `ai-server/orchestrator/RecommendationEngine.ts` (or similar): New or updated module for dynamic recommendations.
- `ai-server/orchestrator/index.ts`: Barrel file for orchestrator exports.
- `ai-server/orchestrator/README.md`: Documentation for orchestrator logic and usage.

### 2. Benchmarking Integration
- `ai-server/benchmarking/BenchmarkingManager.ts`: Ensure `getQualityReport()` is exposed and used by orchestrator.
- `ai-server/benchmarking/index.ts`: Barrel file for benchmarking exports.

### 3. RAG-to-Text Endpoint
- `ai-server/routes/ragText.ts` or `ai-server/api/ragText.ts`: Update endpoint to use orchestrator for model selection unless a model is specified.
- `ai-server/controllers/ragTextController.ts`: If controller pattern is used, update to use orchestrator logic.
- `ai-server/services/ragTextService.ts`: If service layer exists, update to use orchestrator/model selection.
- `ai-server/routes/index.ts`: Ensure correct export and routing.

### 4. Web Dashboard (Text to RAG Node)
- `frontend/src/features/rag-dashboard/components/TextToRagNode.tsx`: Update to support model selection and recommendations.
- `frontend/src/features/rag-dashboard/hooks/useModelRecommendations.ts`: New or updated hook for fetching/displaying recommendations.
- `frontend/src/features/rag-dashboard/api/ragApi.ts`: Update API calls to support model selection.
- `frontend/src/features/rag-dashboard/index.ts`: Barrel file for dashboard exports.

### 5. Types & Shared Interfaces
- `ai-server/types/models.ts` or `shared/types/models.ts`: Update or add types for model metadata, selection criteria, and recommendations.
- `frontend/src/types/models.ts`: Ensure frontend types match backend.

### 6. Documentation & Architecture
- `docs/ORCHESTRATOR_MODEL_SELECTION_AND_RECOMMENDATIONS.md`: Update with implementation details and file paths.
- `docs/DECISION_LOG.md`: Record architectural decisions and changes.
- `docs/QUALITY_BENCHMARKING_AGGREGATION_AND_SCORING.md`: Cross-reference orchestrator integration.
- `ai-server/README.md`: Update with orchestrator usage and API changes.
- `frontend/README.md`: Update with dashboard changes.

### 7. Tests
- `ai-server/orchestrator/ModelSelector.test.ts`
- `ai-server/orchestrator/RecommendationEngine.test.ts`
- `ai-server/routes/ragText.test.ts` or `ai-server/api/ragText.test.ts`
- `frontend/src/features/rag-dashboard/components/TextToRagNode.test.tsx`
- Any relevant integration or e2e tests in `tests/` or `e2e/`

This list covers all files that should or could be updated to implement orchestrator-driven model selection and recommendations for the RAG-to-text flow and dashboard, as well as all required documentation and test updates.
# Orchestrator Responsibilities: Model Selection and Recommendations

## Overview
This document defines the responsibilities of the orchestrator regarding model selection and dynamic recommendations, as they relate to quality benchmarking and system architecture.

---

## 1. Best Model Selection
- The orchestrator is responsible for selecting the best model for a given task type (e.g., JSON generation, conversational, character generation).
- Selection should be based on the quality data provided by the benchmarking manager (e.g., scores, timestamps, model metadata).
- The orchestrator may implement additional logic such as:
  - Task-specific thresholds
  - Load balancing
  - User or project preferences
  - Model availability and health

---

## 2. Dynamic Recommendations
- The orchestrator should provide dynamic recommendations for which model(s) to use for specific tasks or scenarios.
- Recommendations may consider:
  - Recent quality scores
  - Model specialization
  - Performance/latency
  - Cost or resource constraints
  - User feedback or overrides
- The benchmarking manager should not contain any recommendation or selection logic; it is purely a measurement and reporting component.

---

## 3. Implementation Notes
- The orchestrator should consume the `getQualityReport()` output from the benchmarking manager to inform its decisions.
- All recommendation and selection logic should be documented and versioned for transparency and reproducibility.
- Any changes to recommendation criteria or selection algorithms should be recorded in the decision log.

---

## 4. Example Workflow
1. Orchestrator requests the latest quality report from the benchmarking manager.
2. Orchestrator applies its selection logic to choose the best model for a given task.
3. Orchestrator provides recommendations to downstream services or users.

---

## 5. References
- See `QUALITY_BENCHMARKING_AGGREGATION_AND_SCORING.md` for details on the benchmarking manager's responsibilities and reporting API.
- All orchestrator logic should be cross-referenced in the architecture documentation and decision log.
