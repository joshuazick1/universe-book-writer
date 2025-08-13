# AI Task & Benchmark Retry System

## Overview
This document outlines the retry and timeout logic for AI job orchestration in Universe Book Writer, covering both multi-server and single-server (Ollama) setups. The system is designed to maximize reliability, minimize latency, and ensure correct benchmarking.

---

## Job Types
- **Benchmark Jobs:** Must run on a specific model/server pair. Results must be isolated and repeatable.
- **Normal Tasks:** Can be executed on any eligible server/model. Prioritize speed and reliability.

---

## Multi-Server Retry & Timeout Logic

### Benchmarks
- **Server/Model Selection:** Always run on the specified server/model.
- **Retries:**
  - If a job fails or times out, retry only on the same server/model.
  - Maximum retry count is configurable.
- **Timeouts:**
  - If a job exceeds the timeout, mark as failed and optionally retry (on same server).
  - No parallel retries; only one job in flight per benchmark.

### Normal Tasks
- **Server/Model Selection:**
  - On failure or timeout, retry on a different eligible server/model.
  - Maintain a list of attempted servers/models in job metadata.
- **Timeouts:**
  - If a job exceeds the timeout, immediately dispatch a retry to another server/model.
  - Both the original and retried jobs remain in flight; whichever completes first is accepted (fastest-wins).
  - Superseded jobs are marked in metadata and ignored on completion.
- **Retries:**
  - Maximum retry count is configurable.
  - Retries are distributed across available servers/models.

---

## Single-Server Retry & Timeout Logic

### Benchmarks
- **Behavior:** Identical to multi-server. Only retry on the single available server/model.
- **Timeouts:**
  - If a job exceeds the timeout, mark as failed and optionally retry (on same server).

### Normal Tasks
- **Server/Model Selection:**
  - No alternate servers/models available.
  - On failure or timeout, only retry on the same server/model.
- **Timeouts:**
  - If a job exceeds the timeout, mark as failed and optionally retry (on same server).
  - No parallel retries; only one job in flight per task.
- **Retries:**
  - Maximum retry count is configurable.

---


## Job Metadata
- `jobId`: Unique identifier for each job.
- `status`: 'pending', 'active', 'completed', 'failed', 'superseded'.
- `retries`: Number of retry attempts.
- `timestamps`: Tracks enqueue, start, completion, failure times.
- `serverId`, `model`: Server/model used for each attempt.
- `attemptedServers`: List of all servers/models tried (normal tasks, multi-server only).
- `superseded`: Boolean flag for jobs whose result was not used (normal tasks, multi-server only).
- `attemptedModels`: List of all models tried (for future alternate model selection).
- `retryReasons`: List of reasons for each retry (e.g., timeout, server_error).

---

## Fastest-Wins Logic (Multi-Server, Normal Tasks Only)
- When a timeout occurs, a retry is dispatched to another server/model.
- Both jobs are tracked; the first successful response is accepted.
- The slower job is marked as superseded and ignored on completion.

---

## Configuration
- **Timeouts:** Per-job or global default (e.g., 30s).
- **Max Retries:** Per-job or global default (e.g., 3).
- **Retention:** Completed/failed jobs are retained for a configurable period (default: 5 minutes).

---

## Edge Cases
- **No Available Servers:** If all servers/models are unavailable, jobs fail immediately.
- **Single Server:** No parallel retries; only sequential retries on the same server/model.
- **Benchmark Isolation:** Benchmarks never retry on alternate servers/models.

---


## Implementation Notes
- Retry and timeout logic is handled in the orchestrator layer, not in the queue system itself.
- Job metadata is updated on each attempt, including retries and superseded status.
- API endpoints reflect real-time job status, including retries and superseded jobs.

---

## Hooks for Alternate Model Selection (Future Implementation)

The system is designed to support future enhancements for alternate model selection during retry. Key extension points:

- **Orchestrator Hooks:**
  - The orchestrator should expose a hook or callback for selecting alternate models/servers when a retry is triggered.
  - This allows for custom logic (e.g., load balancing, model compatibility, user preferences).

- **Job Metadata:**
  - Add fields to track all attempted models/servers, and the reason for each retry (e.g., timeout, server error).
  - Example:
    ```json
    {
      "jobId": "abc123",
      "attemptedModels": ["modelX", "modelY"],
      "retryReasons": ["timeout", "server_error"]
    }
    ```

- **API & UI:**
  - API endpoints and visualizers should display all attempted models/servers and retry reasons for transparency.

- **Configuration:**
  - Allow configuration of model selection strategies (e.g., round-robin, weighted random, preferred model list).

These hooks ensure the system can evolve to support more advanced retry and failover strategies as needed.

---

## Example Metadata (Normal Task, Multi-Server)
```json
{
  "jobId": "abc123",
  "status": "completed",
  "retries": 2,
  "timestamps": {
    "enqueued": 1751420000000,
    "started": 1751420001000,
    "completed": 1751420005000
  },
  "serverId": "serverA",
  "model": "modelX",
  "attemptedServers": ["serverA:modelX", "serverB:modelY"],
  "attemptedModels": ["modelX", "modelY"],
  "retryReasons": ["timeout", "server_error"],
  "superseded": false
}
```

---

## References
- See `ai-server/src/queueSystem.ts` for queue implementation.
- See `ai-server/docs/ORCHESTRATION_RETRY_LOGIC.md` for orchestrator logic and configuration.
