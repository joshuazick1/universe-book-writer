# Migrating AI Benchmarking to Centralized Orchestrator Queue System

## User-Driven Benchmarking Selection & Queueing

### User Workflow
- The user can select:
  - **All or some servers**
  - **All or some models**
  - **All or some benchmark types**
- The UI will allow multi-select for each category, and the backend will receive the full selection set.

### Queueing Logic
1. **For each selected server/model pair:**
   - **Queue one cold latency test** (always first, server-specific).
   - **Queue 3 (configurable) warmup tests** (any selected benchmark type, run sequentially for each model on each server).
   - **Queue 3 warm latency tests** (protocol compliance, run after warmup, sequentially per model/server). For maximum coverage, each warm latency test should use a distinct protocol compliance prompt.
   - These tasks are queued up **one model at a time per server** to ensure warmup is meaningful (no parallel warmup for multiple models on the same server).
2. **After cold/warmup/warm latency tasks are queued:**
   - For each model, determine which selected benchmark types have not yet been run.
   - Queue these remaining benchmarks through the orchestration queue as normal.
   - The orchestrator will dynamically assign these jobs, allowing faster servers to steal jobs from slower ones as their queues empty.

### Orchestration Guarantees
- **Cold/warmup/warm latency**: Always run per model/server, in strict order, with concurrency managed by the queue.
- **Remaining benchmarks**: Dynamically assigned, with load balancing and job stealing enabled.
- **Configurable warmup count**: User can set the number of warmup tests per model/server.
- **Server/model/benchmark selection**: Fully user-driven, with backend validation and queue assignment.


## Overview
This document outlines the migration plan for moving all AI benchmarking orchestration to the centralized queue system managed by the orchestrator. It also details enhancements for server-specific task assignment, embedding model detection and benchmarking, and the addition of a queue visualizer in the frontend.

---

## 1. Migration to Centralized Queue System

### Current State
- Benchmarking tasks are dispatched in parallel using `Promise.all` and manual health/concurrency checks.
- Each benchmarking step (cold, warm, quality, embedding) is managed independently per server/model.

### Target State
- All benchmarking tasks are enqueued via the orchestrator's queue system (`enqueueRequest<T>(serverId, model, entry)`), which manages concurrency, health, and load balancing.
- The queue system will serialize or parallelize jobs as appropriate, and only process jobs for healthy servers.

### Migration Steps
1. **Refactor orchestration logic** in `orchestrateEnhancedBenchmarks.ts` to enqueue each benchmarking step as a queue entry for the target server/model.
2. **Wrap each benchmarking step** (e.g., `runBenchmarksForServer`, `runWarmLatencyTests`, embedding generation) as a queue entry function, and use the orchestrator's queue to schedule and execute them.
3. **Remove manual parallelism and health checks**—the queue will handle these automatically.
4. **Add job metadata** for tracking, retries, and reporting.
5. **Update documentation and tests** to reflect the new queue-based orchestration.

---

## 2. Server-Specific Task Assignment

### Problem
Some benchmarking tasks (e.g., cold latency, embedding generation) must be completed by a specific server, not just any healthy server for a model.

### Solution
- Update the queue system to support server-specific task assignment:
  - When enqueuing a job, specify the target server ID and model ID.
  - The queue will only process the job on the designated server, respecting its concurrency and health status.
- For jobs that can be processed by any server, continue to use dynamic assignment.
- Add validation to ensure server availability before enqueuing.

---

## 3. Embedding Model Detection & Benchmarking

### Problem
Some servers expose embedding-only models, which require specialized benchmarking (e.g., embedding quality, vector search latency).

### Solution
- **Detect embedding models:**
  - Use model metadata (e.g., `modelType: 'embedding'`) or API introspection to identify embedding-only models.
  - Maintain a registry of embedding-capable servers/models in the orchestrator.
- **Queue embedding benchmarks:**
  - For each detected embedding model, enqueue embedding-specific benchmarking tasks (e.g., `embedding-quality`, `vector-search-latency`).
  - Use the same queue system, but with embedding-specific job types and result schemas.
- **Integrate results:**
  - Persist embedding benchmark results to model-performance nodes and aggregate to ai-model nodes as with other benchmarks.

---

## 4. Queue Visualizer in Frontend

### Goal
Provide a real-time visualization of the benchmarking queue, job status, and server/model assignment in the frontend (`ai-server/web/src`).

### Implementation Plan
1. **Backend API:**
   - Expose queue status endpoints in the orchestrator (e.g., `/api/queue/status`, `/api/queue/jobs`).
   - Return job metadata, status (pending, active, completed, failed), server/model assignment, and timestamps.
2. **Frontend Component:**
   - Create a React component in `ai-server/web/src/components/QueueVisualizer.tsx`.
   - Display queue length, job details, server/model assignment, and job progress.
   - Use polling or WebSocket for real-time updates.
   - Add filtering and sorting by server, model, job type, and status.
3. **Styling & Accessibility:**
   - Use Tailwind CSS for consistent styling.
   - Ensure accessibility (WCAG compliance) for all UI elements.
4. **Documentation:**
   - Add usage instructions and screenshots to the frontend README.

---

## References
- `ai-server/src/orchestrator.ts` — Queue system implementation
- `ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts` — Orchestration logic
- `shared/types/aiQualityBenchmark.ts` — Benchmark types and schemas
- `docs/RAG_Distributed_Queue_Implementation_Plan.md` — Queue architecture and integration
- `ai-server/web/src/components/QueueVisualizer.tsx` — Frontend visualizer (to be created)

---

## Next Steps
- Begin refactoring orchestration logic to use the queue system for all benchmarking tasks.
- Update the queue system to support server-specific jobs and embedding benchmarks.
- Implement backend queue status endpoints and frontend visualizer component.
- Update documentation and tests throughout the migration.
