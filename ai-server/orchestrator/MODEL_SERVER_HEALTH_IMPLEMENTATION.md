# Model/Server Health Marking & Orchestrator Integration

## Overview
This document describes the implementation of persistent health tracking for model/server pairs in the Universe Book Writer AI Orchestrator. The goal is to ensure that if a server returns a 5xx, OOM, or similar error for a model, it is marked as unhealthy and excluded from all future orchestrator/model selection and API calls until manually or automatically re-enabled.

## Motivation
- Prevent repeated failed calls to unhealthy servers (e.g., OOM, GPU errors, persistent 5xx).
- Ensure orchestrator/model selection logic only uses healthy servers for each model.
- Enable robust failover and reliability for all AI API calls and benchmarking.

## Implementation Details

### 1. Persistent Health Map
- A new file (e.g., `model-server-health.json`) is used to persistently track unhealthy model/server pairs.
- The file maps `{ [modelId]: string[] }` where each array contains server IDs currently marked as unhealthy for that model.

### 2. Orchestrator API Changes
- `serverDiscovery.ts` exposes:
  - `markServerUnhealthy(modelId: string, serverId: string)`: Adds the server to the unhealthy list for the model and persists the change.
  - `getHealthyServersForModel(modelId: string)`: Returns only healthy servers for the model, filtering out unhealthy ones.
- All server selection logic (including `getServersForModel`) is updated to use only healthy servers.

### 3. Benchmarking/Model API Changes
- In `BenchmarkingManager.callModelAPI`, when a server returns a 5xx, OOM, or similar error, `markServerUnhealthy` is called.
- Retry logic rotates through only healthy servers for the model.
- If all servers are unhealthy, the error is logged and surfaced.

### 4. Health Recovery (Optional/Future)
- Manual or scheduled health reset can be implemented to re-enable servers after a cooldown or admin action.

## Example Usage
```ts
import { markServerUnhealthy, getHealthyServersForModel } from '../orchestrator/serverDiscovery.js';

// Mark a server as unhealthy for a model
await markServerUnhealthy('llama2', '10.0.0.1:11434');

// Get only healthy servers for a model
const healthy = await getHealthyServersForModel('llama2');
```

## Edge Cases
- If all servers are unhealthy, orchestrator/model selection will fail and log an error.
- Health map is persistent and survives process restarts.
- Health can be reset by deleting or editing the health file, or via future admin API.

## File Locations
- `ai-server/orchestrator/model-server-health.json` (persistent health map)
- `ai-server/orchestrator/serverDiscovery.ts` (API and logic)

## Status
- [x] Health marking logic implemented
- [x] Orchestrator and benchmarking logic updated
- [ ] Health reset/admin API (future)

---

*Last updated: 2025-07-25*
