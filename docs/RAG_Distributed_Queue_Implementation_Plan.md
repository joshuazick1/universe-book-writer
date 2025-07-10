# RAG Distributed Post-Section Summary & Enrichment Queue System: Implementation Plan

## Overview
This document details the plan for refactoring the RAG post-section summary and enrichment pipeline into a distributed, queue-based system. The goal is to maximize throughput, minimize latency, and enable robust, scalable AI-powered enrichment by leveraging multiple AI servers/models in parallel with dynamic orchestration.

---

## Motivation
- Current enrichment is synchronous or single-threaded, limiting throughput.
- Static assignment wastes resources when servers/models have different speeds.
- Need to handle slow/failed responses gracefully and maximize compute utilization.
- Incremental re-processing is required for user edits (avoid re-chunking/re-processing the whole document).

---

## Key Requirements
- **Parallelism:** Multiple jobs processed in parallel, up to the number of available servers/models.
- **Dynamic Assignment:** Orchestrator assigns jobs to servers based on real-time response times and queue lengths.
- **Re-queuing:** Fast servers can steal jobs from slower ones, even if jobs are already in-flight elsewhere.
- **First-Response Wins:** If a job is sent to multiple servers, the first valid response is used; later responses are cached for validation/fallback.
- **Fault Tolerance:** Failed/slow jobs are retried or reassigned as needed.
- **Extensible:** Supports different post-processing tasks (summaries, entity linking, enrichment, etc.).
- **Incremental Processing:** Only changed/added chunks are re-processed on user edits.

---

## Additional Best Practices Before Implementation

### 2. Design for Observability
- Add structured logging, metrics, and tracing from the start (job lifecycle, worker health, quality scores, retries).
- Use dashboards (Grafana, Prometheus, etc.) to monitor throughput, latency, and error rates.
- Make it easy to debug stuck or failed jobs.

### 3. Plan for Graceful Degradation and Recovery
- Ensure jobs are persisted and can be resumed after a crash/restart.
- Design for idempotency: re-running a job should not corrupt state.
- Allow for manual intervention (pause, retry, cancel, reassign jobs).

### 4. Keep the Pipeline Modular
- Each enrichment step (summarization, entity extraction, etc.) should be a pluggable module.
- This makes it easy to add, remove, or update steps without breaking the whole system.

---

## High-Level Architecture

1. **Task Producer:**
   - After sectioning/chunking, produces a queue of post-processing jobs (summarize, enrich entities, etc.).
   - On user edit, diffs old/new text, identifies changed/added chunks, and only enqueues jobs for those.
2. **Task Queue:**
   - Central queue holds pending jobs (e.g., Redis/BullMQ, RabbitMQ).
   - Each job includes section/chunk ID, task type, payload, and metadata.
3. **Orchestrator:**
   - Monitors available servers/models and their response times.
   - Assigns jobs to servers dynamically.
   - If a server is idle, can reassign jobs from slower servers (even if already in-flight).
   - Tracks which jobs are in-flight, completed, or need retry.
   - Handles job deduplication and result validation.
4. **Worker Servers:**
   - Each server/model polls for jobs or receives assignments.
   - Processes jobs and returns results.
   - Can be heterogeneous (different models, hardware, etc.).
5. **Result Handler:**
   - Accepts first valid response for each job.
   - Caches later responses for validation/fallback.
   - Updates job status and downstream consumers (e.g., updates knowledge graph, triggers next pipeline stage).

---

## Example Flow
1. 100 section summary jobs are queued.
2. 3 servers are available: FastA, FastB, SlowC.
3. Orchestrator assigns jobs round-robin, but tracks response times.
4. FastA and FastB finish their jobs quickly; SlowC is still working on its first batch.
5. Orchestrator reassigns some of SlowC's in-flight jobs to FastA/FastB.
6. If both FastA and SlowC return a result for the same job, the first valid result is used; the other is cached.
7. If a server fails or is too slow, jobs are retried or reassigned.

---

## Handling User Edits Efficiently
- **Chunk Versioning & Diffing:**
  - Store each chunk with a unique ID and version.
  - On edit, diff new text against previous version to identify changed/added/deleted chunks.
  - Only re-chunk and re-process affected sections; unchanged chunks retain enrichment data.
- **Chunk Boundary Stability:**
  - Use semantic chunking (paragraph, scene, etc.) to keep boundaries stable across edits.
  - If a chunk changes, increment its version and enqueue for re-processing.
- **Efficient Reprocessing Pipeline:**
  - On edit: Save new text, diff, enqueue jobs for changed/added chunks, mark deleted chunks as obsolete, update relationships/summaries only for affected areas.

---

## Implementation Steps

### 1. Queue System Selection & Setup
- Evaluate and select a queueing library (BullMQ recommended for Redis-backed, robust distributed queues).
- Set up central queue infrastructure (Redis, RabbitMQ, etc.).

### 2. Define Job & Result Schemas
- Job: { id, chunkId, type, payload, metadata, version, dependencies }
- Result: { jobId, chunkId, type, result, status, serverId, receivedAt, isFirst }

### 3. Orchestrator Service
- Monitors worker health, response times, and queue lengths.
- Assigns jobs dynamically, supports job stealing and re-queuing.
- Tracks in-flight, completed, and failed jobs.
- Handles deduplication and first-response-wins logic.
- Exposes API for workers to poll/receive jobs and submit results.

### 4. Worker Server Implementation
- Polls for jobs or receives assignments from orchestrator.
- Processes jobs (summarization, entity extraction, etc.) using local AI model or API.
- Submits results back to orchestrator/result handler.
- Reports health and performance metrics.

### 5. Result Handler & Downstream Updates
- Accepts first valid result for each job, caches later responses.
- Updates job status, triggers downstream consumers (e.g., updates knowledge graph, triggers next pipeline stage).
- Handles retries and fallback logic.

### 6. Integration with RAG Pipeline
- Refactor sectioning/chunking to produce jobs for the queue.
- On user edit, run diff, enqueue jobs for changed/added chunks only.
- Update enrichment pipeline to consume results from the queue system.

### 7. Monitoring & Fault Tolerance
- Implement health checks and response time tracking for all worker servers.
- Retry or reassign failed/slow jobs.
- Persist job state for recovery after restart.

### 8. Extensibility
- Support new job types (e.g., relationship extraction, lore enrichment) by extending job schema and worker logic.
- Allow heterogeneous workers (different models, hardware, etc.).

---

## Open Questions & Considerations
- How to efficiently track in-flight jobs and reassignments?
- How to handle job deduplication and result validation?
- What is the best way to monitor server/model health and response times?
- How to generalize for different post-processing task types?
- How to persist/cancel jobs if the system is restarted?

---

## Response Quality Judger Integration

### Overview
To ensure robust, dynamic model selection and high-quality enrichment, a response quality judger will be integrated into the distributed queue system. This component will automatically evaluate and score the quality of AI/model responses for each task type, enabling smarter routing, fallback, and continuous improvement.

### Key Features
- **Task-Type-Specific Rubrics:** Define quality dimensions and scoring methods for each task type (summarization, code, entity extraction, etc.).
- **Automated Validators:** Use JSON schema validation, linting, static analysis, regex/pattern checks, and reference comparison (BLEU, ROUGE, F1, etc.) where applicable.
- **AI-Assisted Evaluation:** For subjective or complex metrics (e.g., clarity, engagement), use a small, fast LLM (e.g., TinyLlama, DistilBERT) to provide rubric-based scoring and rationale.
- **Quality Judger Service:** Central service/class that accepts a model response, task type, and (optionally) reference data, runs all relevant validators and AI checks, aggregates scores, and logs all sub-scores and decisions.
- **Integration with Orchestrator:**
  - Every model/server response is evaluated before acceptance.
  - Scores are stored per model/server/task type in the RAG (rolling averages, recent scores, etc.).
  - Orchestrator uses these scores for routing, fallback, and model selection.
  - Retries or fallback are triggered if quality is below threshold.
- **Logging & Feedback:** All scores, rationales, and errors are logged. User/admin feedback can be incorporated for future tuning.
- **Testing:** Unit tests for each validator and scoring function, with gold/reference data and edge cases.

### Implementation Steps
1. Define schemas/rubrics for each task type.
2. Implement automated validators and AI-assisted scoring functions.
3. Expose a quality judger service/class for orchestrator integration.
4. Integrate quality scoring into orchestrator routing logic and model selection.
5. Store and log all quality metrics for monitoring and future tuning.
6. Write unit tests for all validators and scoring functions.

### Example Flow
1. Model returns a response for a job (e.g., summarization, entity extraction).
2. Orchestrator invokes the quality judger for the response and task type.
3. Validators and AI-assisted checks are run; scores are aggregated.
4. If quality is sufficient, the result is accepted and downstream consumers are updated. If not, the job is retried or reassigned.
5. Quality metrics are logged and stored for future routing/model selection.

### Model Selection Logic
- For multi-metric tasks, aggregate recent scores for all required metrics per model.
- Use minimum, average, or weighted sum strategies to select the best model.
- Exclude models that fall below minimum thresholds.
- Optionally, use multi-model strategies (parallel execution, fallback) if no model meets requirements.

---

## Next Steps
- Prototype orchestrator logic for dynamic assignment and re-queuing.
- Define job and result schemas.
- Evaluate and set up queueing infrastructure.
- Design API for worker servers to poll/receive jobs and return results.
- Implement the response quality judger and integrate with orchestrator.
- Plan for integration with existing sectioning and enrichment pipeline.
- Document all new modules and update architectural diagrams.

---

*This document should be updated as the implementation progresses. See also: `docs/BRAINSTORM_PostSectionSummary_QueueSystem.md` and `docs/BRAINSTORM_Orchestrator_ResponseQuality.md` for original brainstorming notes.*
