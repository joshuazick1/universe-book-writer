# Benchmarking System Refactor: Final Plan (2025-08-06) - REVISED POST-REVIEW

## Critical Implementation Reality Check ⚠️

After comprehensive codebase review, the actual implementation state differs significantly from the original plan. This document has been **completely revised** to reflect reality.

---

## Actual Implementation Status

### ✅ **FULLY IMPLEMENTED** - Major Infrastructure Already Exists
- **Queue System**: `UniversalQueueService` - **COMPLETE AND FUNCTIONAL**
- **Job Executors**: `BenchmarkJobExecutor` - **COMPLETE WITH ALL JOB TYPES**
- **Scheduler Service**: `AutomaticBenchmarkSchedulerService` - **COMPLETE**
- **Gap Analysis**: `BenchmarkGapAnalyzerService` - **COMPLETE** 
- **Aggregation Services**: `ModelAggregationService` + `ServerAggregationService` - **COMPLETE**
- **API Routes**: `scheduler.ts`, `missing-benchmarks.ts`, `queue.ts` - **FUNCTIONAL**
- **Benchmark Suite**: 30+ benchmark modules in `benchmarking/benchmarks/` - **COMPREHENSIVE**
- **Type System**: `shared/types/benchmark.ts`, `scheduler.types.ts` - **COMPLETE**

### ❌ **CRITICAL PLANNING ERROR DISCOVERED**
- **`data-aggregation.service.ts`** was planned but **NEVER EXISTED**
- **`benchmarking/SchedulingService.ts`** does **NOT EXIST** (despite plans mentioning it as existing)
- Original plans assumed missing infrastructure that actually already exists

---

## Revised Approach - Focus on Actual Missing Pieces

### **What's Actually Missing:**
1. **Central Coordination Service** - Need `SchedulingService.ts` to coordinate existing services
2. **Cost-Aware Scheduling** - Model size-based frequency calculation
3. **Gating Metadata** - Benchmark modules lack suite type and dependency metadata
4. **Performance Probes** - Lightweight health check benchmarks
5. **Frontend Dashboard** - Real-time monitoring components
6. **Database Configuration** - Persistent configuration storage

### **What's Already Working:**
1. ✅ Automatic benchmark scheduling and job queuing
2. ✅ Gap analysis and missing benchmark detection
3. ✅ Performance data aggregation (model and server nodes)
4. ✅ Queue-based job execution with intelligent load balancing
5. ✅ Comprehensive benchmark test suite with proper execution
6. ✅ API endpoints for scheduler management and status

---

## 1. Foundational Workflow
- **Job Execution & Dependencies:** Cold, warmup, and warm performance jobs must run sequentially for each model/server. Jobs are only marked complete after real inference is verified.
- **Test Type Separation:** Use a dedicated `performance-benchmark` type for latency/throughput, and `quality-benchmark` for creative/accuracy metrics.
- **Retry and Completion Tracking:** All benchmarks are retried with backoff on failure, ensuring resilience and completeness.

---

## 2. Robust Scheduling & Resource Management
- **Central Scheduling Service:**
  - Implement `benchmarking/SchedulingService.ts` to orchestrate all benchmark jobs.
  - Stagger jobs to avoid saturating all servers at once; enforce per-server and global concurrency limits.
  - Sequence performance tests as required, but distribute quality checks across servers and time.
  - Avoid keeping any single server busy for extended periods; rotate assignments to balance load.
- **Latency Test Frequency:**
  - Latency/health checks are scheduled at high frequency with minimal impact, prioritized over full suites.
- **Quality Benchmark Distribution:**
  - Track which servers have recently run which quality checks; rotate and distribute to maximize coverage and minimize disruption.

---

## 3. Dynamic & Cost-Aware Benchmark Scheduling
- **Dynamic Frequency:**
  - Replace static suites (e.g., `nightly`, `weekly`) with a scheduler that determines frequency based on model/server characteristics and operational cost.
  - The `BenchmarkingManager` calculates a "benchmark cost" for each model (size, load time, tokens/sec, etc.).
  - Scheduling algorithm uses cost to set how often to run each benchmark type:
    - **Small/Fast Models (<10B):** Full suite multiple times/day.
    - **Medium (10B-40B):** Full suite daily.
    - **Large (70B+):** Full suite weekly, with more frequent performance checks.
  - **Database-Driven Configuration:**
    - Cost thresholds and frequency settings are stored in the database and configurable per server.
    - Settings can be updated via admin API endpoints without system restart.
    - Default configurations apply to new servers, with per-server overrides available.

---

## 4. Continuous Performance Monitoring & Model Selection
- **Performance Probe Model:**
  - Use a lightweight, fast-loading model for high-frequency server health checks.
  - Prefer a model that overlaps across multiple servers for comparability and minimal unique load.
  - If no overlap, fall back to the fastest available model per server.
  - Probes run at configurable intervals (e.g., hourly), with results stored in `model-performance` nodes for immediate access.
  - **Hierarchical Data Storage:**
    - Recent performance data (few runs) stored in `model-performance` nodes for fast access.
    - Aggregated long-term historical data stored in `ai-server` nodes for persistence and trend analysis.
    - Time-series data automatically aggregated and moved from performance nodes to server nodes over time.
    - RAG queries can access both recent (performance nodes) and historical (server nodes) data as needed.

---

## 5. Predictive Load Balancing with RAG Integration
- **Predictive Scheduling:**
  - Enhance `IntelligentLoadBalancerService` to use historical performance data from RAG for forecasting server load.
  - Historical data queried from `ai-server` nodes, recent data from `model-performance` nodes.
  - Avoid assigning critical or long-running jobs to servers predicted to be busy.
  - Server scoring algorithm incorporates recent and historical load patterns.
  - **Background Task Optimization:**
    - Background (non-urgent) tasks—such as non-critical quality benchmarks or archival jobs—should be preferentially scheduled during predicted server idle/low-load periods.
    - If a preferred model is only available on a limited number of servers, background jobs for that model are deferred until those servers are not busy with higher-priority work.
    - The scheduler and load balancer must distinguish between foreground (interactive/urgent) and background (batch/maintenance) jobs, optimizing for minimal disruption and maximum resource utilization.

---

## 6. Pre-flight and Gating Checks
- **Discovery/Smoke Suite:**
  - Designate a minimal set of benchmarks (latency, basic inference, basic dialogue, and JSON crafting) as a pre-flight suite.
  - Run these before any larger batch; if a server/model fails, skip further tests for that combo and log a notification.
- **Gating Logic:**
  - If a model/server fails a basic test (e.g., dialogue, JSON crafting), all advanced or dependent tests are skipped for that run (e.g., fail dialogue → skip advanced dialogue; fail JSON crafting → skip all JSON-dependent tests).
  - Designate these basic tests as “warmup” or “gatekeeper” tests in suite metadata.
  - This prevents wasted resources and provides fast, actionable feedback.
- **Gatekeeper Benchmark Modules:**
  - The following benchmark modules are designated as gatekeeper (gating/warmup) tests and must be tagged accordingly:
    - `measureSimpleServerLatency` (basic health/latency)
    - `evaluateJSONAssembly` (basic JSON crafting)
    - `dialogueGeneration` (basic dialogue)
    - `basic inference` (if not present, create a minimal inference test)
    - `basic completion` (NEW: create a minimal test for generic text completion)
    - `basic summarization` (NEW: create a minimal summarization test)
    - `basic code generation` (NEW: create a minimal code generation test)
    - `basic fact extraction` (NEW: create a minimal fact extraction test)
  - These tests are always run first for each server/model. If any fail, all dependent or advanced tests are skipped for that run.
  - If additional minimal tests are needed (e.g., a dedicated "basic inference" or "smoke" test), create new modules and tag them as gatekeeper.
- **Quality Gating Hierarchy:**
  - The following quality benchmarks should act as gates for more advanced or specialized tests:
    - `dialogueGeneration` → gates all advanced dialogue, character consistency, and plot coherence tests.
    - `evaluateJSONAssembly` → gates all advanced JSON-dependent tests (e.g., structured task planning, node graph construction).
    - `basic summarization` → gates advanced summarization and content moderation tests.
    - `basic code generation` → gates advanced code generation, TypeScript quality, and plugin architecture tests.
    - `basic fact extraction` → gates advanced fact extraction and world building tests.
    - `basic completion` → gates all creative writing, style transfer, and long form generation tests.
  - Each advanced benchmark module must declare its gating dependencies (e.g., `requires: ['dialogue', 'json', 'summarization']`).
  - The scheduler uses this hierarchy to dynamically build the test plan tree and skip tests as appropriate.
  - Review and update all benchmark modules to ensure proper gating and dependency metadata is present.
- **Multi-layer Gating Logic:**
  - Implement multiple layers of gating, where the outcome of each gate determines which subsequent tests are scheduled:
    - If a model passes test A but fails test B, then dependent test C (which requires B) is skipped.
    - Example: If a model passes basic dialogue but fails JSON crafting, all advanced JSON-dependent tests are skipped, but non-JSON advanced tests may still run.
    - Each benchmark module must declare its gating dependencies (e.g., `requires: ['dialogue', 'json']`).
    - The scheduler dynamically builds the test plan tree per server/model based on gate outcomes and declared dependencies.
  - This approach maximizes efficiency, avoids wasted runs, and provides fine-grained diagnostic feedback.
- **Suite Type Tagging:**
  - All benchmark modules must be tagged with their suite type(s): e.g., `gatekeeper`, `performance`, `quality`, `advanced`, `book-writing`, etc.
  - Update each module's metadata export to include suite type(s) and gating status.
  - The barrel file (`benchmarks/index.ts`) should document and enforce this tagging for discoverability and scheduling.
- **Hardware/Platform Note:**
  - Since server hardware specifications are unknown and only Ollama compatibility is guaranteed, performance test deduplication across servers is not performed unless there is strong evidence of stable, platform-independent results.
  - All servers are treated as potentially unique environments; performance benchmarks are run per server/model to ensure accuracy.
- **Benchmark Frequency & Utilization:**
  - Target: Keep servers busy <0.1% of the time for benchmarks.
  - Small models are benchmarked more frequently than large models, with dynamic adjustment based on cost and recent results.
  - Focus on scheduling benchmarks during predicted server downtime to minimize performance impact.
- **Migration & Legacy System Removal:**
  - The existing non-functional scheduling and benchmark system will be removed immediately.
  - No backward compatibility required—clean slate implementation.
  - **RAG Storage Architecture:**
    - `ai-server` nodes: Long-term aggregated historical data for trend analysis and recovery.
    - `model-performance` nodes: Recent runs (few runs worth) for immediate access and real-time monitoring.
    - Data flows from performance nodes to server nodes via scheduled aggregation processes.
    - Recovery strategy: aggregate from performance nodes to rebuild server/model nodes; only rebuild from scratch if performance nodes are corrupted.
- **Adaptive Benchmark Frequency:**
  - The scheduler dynamically reduces the frequency of benchmarks for a given server/model as soon as sufficient metrics have been collected and results remain stable over time (e.g., low variance in latency, accuracy, or other key metrics).
  - If instability or drift is detected (e.g., sudden change in performance or quality), frequency is automatically increased until stability is re-established.
  - This adaptive approach minimizes unnecessary benchmarking, further reducing server load and resource usage while maintaining confidence in model/server health.

---

## 7. Real-time Web Dashboard & Monitoring
- **Live Observability:**
  - Build a new React component (`BenchmarkDashboard.tsx`) in the frontend, inspired by `QueueVisualizer.tsx`.
  - Poll a new API endpoint (`/api/benchmarking/status`) for live data: progress, ETA, job status, server health, and predicted load.
- **Comprehensive Monitoring:**
  - All system monitoring happens through the dashboard with dedicated API endpoints.
  - Include metrics for scheduling system health, adaptive frequency changes, gating failures, and overall system effectiveness.
  - Manual debug endpoints available for deep testing and troubleshooting during development.
- **Admin Configuration Interface:**
  - Dashboard includes admin panels for updating cost thresholds and frequency settings per server.
  - Real-time configuration changes without system restart.

---

## 8. Code and Documentation Updates
- All new/modified modules must have JSDoc and local README updates.
- Architectural changes must be logged in `docs/DECISION_LOG.md`.

---

## Relevant API Endpoints (Post-Refactor)
This section lists all API endpoints involved in the benchmarking system, including new and existing endpoints, with their expected request/response payloads after the refactor.

### 1. `GET /api/benchmarking/status`
- **Purpose:** Real-time status for dashboard (progress, ETA, job status, server health, predicted load)
- **Response:**
```json
{
  "progress": 0.42,
  "etaSeconds": 120,
  "jobs": [
    { "id": "job123", "type": "performance", "status": "running", "model": "mistral:7b", "server": "srv1", "startedAt": 1690000000, "eta": 30 },
    { "id": "job124", "type": "quality", "status": "queued", "model": "mistral:7b", "server": "srv2" }
  ],
  "servers": [
    { "id": "srv1", "status": "healthy", "predictedLoad": 0.7, "currentModel": "mistral:7b" },
    { "id": "srv2", "status": "healthy", "predictedLoad": 0.2, "currentModel": "llama:3b" }
  ]
}
```

### 2. `POST /api/benchmarking/schedule`
- **Purpose:** Schedule a new benchmark run (manual or automated)
- **Request:**
```json
{
  "suite": "nightly",
  "models": ["mistral:7b", "llama:3b"],
  "servers": ["srv1", "srv2"],
  "priority": "normal"
}
```
- **Response:**
```json
{ "runId": "run789", "status": "scheduled" }
```

### 3. `GET /api/benchmarking/results/:runId`
- **Purpose:** Retrieve results for a specific benchmark run
- **Response:**
```json
{
  "runId": "run789",
  "status": "completed",
  "startedAt": 1690000000,
  "completedAt": 1690003600,
  "results": [
    { "jobId": "job123", "type": "performance", "model": "mistral:7b", "server": "srv1", "metrics": { "latencyMs": 120, "tokensPerSec": 45 } },
    { "jobId": "job124", "type": "quality", "model": "mistral:7b", "server": "srv2", "metrics": { "accuracy": 0.92 } }
  ]
}
```

### 4. `GET /api/benchmarking/history?model=mistral:7b&server=srv1`
- **Purpose:** Retrieve historical performance data for a model/server (for dashboard, analytics, or load balancer)
- **Response:**
```json
{
  "model": "mistral:7b",
  "server": "srv1",
  "history": [
    { "timestamp": 1690000000, "latencyMs": 120, "tokensPerSec": 45 },
    { "timestamp": 1690003600, "latencyMs": 130, "tokensPerSec": 43 }
  ]
}
```

### 5. `GET /api/queue/status`
- **Purpose:** (Existing) Queue status for all jobs (used by QueueVisualizer)
- **Response:**
```json
{
  "stats": { "totalJobs": 10, "pendingJobs": 2, "runningJobs": 3, "completedJobs": 5, "failedJobs": 0, "averageWaitTime": 120, "averageExecutionTime": 300 },
  "runningJobs": [ /* ... */ ],
  "recentCompletedJobs": [ /* ... */ ]
}
```

### 6. `GET /api/benchmarking/config/:serverId?`
- **Purpose:** Retrieve configuration settings for all servers or a specific server
- **Response:**
```json
{
  "serverId": "srv1",
  "costThresholds": { "small": 10, "medium": 40, "large": 70 },
  "frequencies": { "small": "4x/day", "medium": "daily", "large": "weekly" },
  "customSettings": { "probeInterval": 3600, "maxConcurrentJobs": 2 }
}
```

### 7. `PUT /api/benchmarking/config/:serverId`
- **Purpose:** Update configuration settings for a specific server
- **Request:**
```json
{
  "costThresholds": { "small": 15, "medium": 45, "large": 80 },
  "frequencies": { "small": "6x/day", "medium": "daily", "large": "weekly" }
}
```
- **Response:**
```json
{ "status": "updated", "serverId": "srv1" }
```

### 8. `GET /api/benchmarking/debug/gating-tree/:serverId/:modelId`
- **Purpose:** Debug endpoint to view the complete gating dependency tree for a server/model
- **Response:**
```json
{
  "serverId": "srv1",
  "modelId": "mistral:7b",
  "gatingTree": {
    "gatekeeper": ["measureSimpleServerLatency", "basic completion"],
    "conditionalTests": {
      "styleTransfer": { "requires": ["basic completion"], "status": "eligible" },
      "advancedCodeGeneration": { "requires": ["basic code generation"], "status": "blocked" }
    }
  }
}
```

---

## File and Module Impact Checklist
This list enumerates all files/modules expected to be created, updated, or reviewed during the refactor. Update as implementation progresses.

### Backend (ai-server)
- `benchmarking/BenchmarkingManager.ts` (retain: dynamic scheduling, cost calculation, suite logic)
- `benchmarking/SchedulingService.ts` (retain: robust, concurrency-aware scheduler)
- `benchmarking/benchmarks/index.ts` (update: ensure all benchmarks export suite/frequency metadata)
- `src/services/historical-performance.service.ts` (retain: manage time-series storage/retrieval for performance data)
- `src/services/model-aggregation.service.ts` (retain: aggregate performance data from model-performance to ai-server nodes)
- `src/services/server-aggregation.service.ts` (retain: server-specific aggregation logic)
- **Legacy System Removal:**
  - Remove `data-aggregation.service.ts` and update references.

---

## Documentation Updates
- Update `docs/DECISION_LOG.md` to reflect the removal of `data-aggregation.service.ts`.
- Ensure `shared/README.md` includes references to retained and updated modules.

---

## References
- `ai-server/benchmarking/BenchmarkingManager.ts`
- `ai-server/benchmarking/SchedulingService.ts`
- `ai-server/benchmarking/monitoring/modelSelector.ts`
- `ai-server/src/services/intelligent-load-balancer.service.ts`
- `ai-server/benchmarking/benchmarks/index.ts`
- `ai-server/web/src/components/QueueVisualizer.tsx`
- `ai-server/web/src/components/BenchmarkDashboard.tsx`
- `docs/DECISION_LOG.md`

---

**Date:** 2025-08-06
**Author:** Copilot (with user collaboration)

---

- **Additional Recommended Test Types:**
  - Robustness & Error Handling:
    - `malformedInputHandling` (NEW: test for graceful handling of broken/malformed prompts)
    - `adversarialPromptResistance` (NEW: test for prompt injection/jailbreak attempts)
    - `rateLimitingAndOverload` (NEW: test for proper throttling and error codes)
  - Compliance & Safety:
    - `contentSafetyCompliance` (NEW: test for refusal to generate unsafe/restricted content)
    - `piiRedaction` (NEW: test for PII detection and redaction)
    - `hallucinationDetection` (NEW: test for factuality and plausible but incorrect answers)
  - Multilingual & Encoding:
    - `basicMultilingual` (NEW: test for correct output in non-English languages)
    - `unicodeEncoding` (NEW: test for special characters, emojis, non-Latin scripts)
  - Formatting & Output Structure:
    - `markdownHtmlOutput` (NEW: test for valid Markdown/HTML output)
    - `tableGeneration` (NEW: test for tabular data formatting)
    - `listOutput` (NEW: test for bullet/numbered lists)
  - Context & Memory:
    - `shortContextRetention` (NEW: test for multi-turn context awareness)
    - `longContextWindow` (NEW: test for long prompt context retention)
  - Plugin/Tool Use:
    - `toolInvocation` (NEW: test for plugin/tool invocation and output)
    - `functionCalling` (NEW: test for function calling with simple/complex schemas)
  - Miscellaneous:
    - `determinismRepeatability` (NEW: test for output stability on repeated prompts)
    - `outputLengthControl` (NEW: test for compliance with requested output length)
    - `stopSequenceHandling` (NEW: test for correct stopping at specified tokens/sequences)

- **Quality Test Modules to Update for Gating and Suite Types:**
  - `styleTransfer` (gated by: `basic completion`)
  - `advancedCodeGeneration` (gated by: `basic code generation`)
  - `nodeGraphConstruction` (gated by: `evaluateJSONAssembly`, `basic code generation`)
  - `longFormGeneration` (gated by: `basic completion`)
  - `permissiveContent` (gated by: `basic completion`, `contentSafetyCompliance`)
  - `dialogueGeneration` (gate for: advanced dialogue, character consistency, plot coherence)
  - `factExtraction` (gated by: `basic fact extraction`)
  - `summarization` (gated by: `basic summarization`)
  - `contentModeration` (gated by: `basic summarization`, `contentSafetyCompliance`)
  - `characterConsistency` (gated by: `dialogueGeneration`)
  - `plotCoherence` (gated by: `dialogueGeneration`)
  - `worldBuilding` (gated by: `basic fact extraction`)
  - `evaluateJSONAssembly` (gate for: all advanced JSON-dependent tests)
  - `evaluateTaskPlanning` (gated by: `evaluateJSONAssembly`, `basic code generation`)
  - `evaluateCreativeWriting` (gated by: `basic completion`)
  - `evaluateTypescriptQuality` (gated by: `basic code generation`)
  - `malformedInputHandling` (standalone or gate for: robustness/error handling group)
  - `adversarialPromptResistance` (standalone or gate for: robustness/error handling group)
  - `rateLimitingAndOverload` (standalone)
  - `contentSafetyCompliance` (gate for: `permissiveContent`, `contentModeration`)
  - `piiRedaction` (standalone)
  - `hallucinationDetection` (standalone)
  - `basicMultilingual` (gate for: advanced multilingual tests)
  - `unicodeEncoding` (gate for: advanced encoding/formatting tests)
  - `markdownHtmlOutput` (gate for: advanced formatting tests)
  - `tableGeneration` (gate for: advanced formatting tests)
  - `listOutput` (gate for: advanced formatting tests)
  - `shortContextRetention` (gate for: long context window, multi-turn tests)
  - `longContextWindow` (gate for: advanced context/memory tests)
  - `toolInvocation` (gate for: advanced plugin/tool use tests)
  - `functionCalling` (gate for: advanced function calling tests)
  - `determinismRepeatability` (standalone)
  - `outputLengthControl` (standalone)
  - `stopSequenceHandling` (standalone)
  - (plus all new basic/gatekeeper and additional tests listed above)
  - Review all other quality-related modules for proper tagging and dependency metadata.
