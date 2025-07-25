# Model/Server Busy Handling Plan

## Context
Currently, there is no built-in mechanism to mark a (serverId, modelId) pair as busy for the orchestrator. This can lead to multiple processes attempting to use the same server/model concurrently, which may cause contention or degraded performance.

## Proposed Solution
Implement a lightweight busy-flag or distributed lock system at the orchestrator level to prevent concurrent use of the same server/model pair.

### Steps
1. **Busy Flag/Lock:**
   - When a benchmark or generation starts, mark the (serverId, modelId) as busy in a shared state (e.g., in-memory, Redis, or DB).
   - Before assigning work, the orchestrator checks this flag and only routes to available servers.
   - When the task completes (success or failure), clear the busy flag.

2. **Queueing (Optional):**
   - If all servers for a model are busy, queue the request or retry after a delay.

3. **Integration Points:**
   - Update `getServersForModel` to filter out busy servers.
   - Add busy flag management to the benchmarking and generation flows.

## Future Considerations
- For distributed deployments, use Redis or another distributed store for the busy flag.
- Optionally, expose a status endpoint on each server for real-time health/busy checks.

---
This is a minor enhancement and can be implemented incrementally as orchestration needs grow.
