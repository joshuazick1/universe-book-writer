# AI Server Rebuild Checklist (In-Progress)

## Completed Milestones (2025-06-26/copilot)
- Old AI server code removed; new backend scaffolded (Express, TypeScript, ES Modules)
- Multi-server/model orchestration layer implemented
- Server registry, health/status checks, and model aggregation complete
- Request routing, error handling, and fallback logic implemented
- All major Ollama-compatible endpoints relayed and tested
- Adaptive benchmarking, health, and concurrency tracking for all server/model pairs
- Fair load distribution (least-connections, then lowest latency) with queuing and 429/Retry-After logic
- All concurrency, queuing, and fairness logic documented in code, README, and DECISION_LOG
- Unit and integration tests cover all endpoints and orchestration logic (≥80% coverage)

---

## Remaining Tasks

- [x] **Full re-write of dev frontend to showcase all AI server features (TOP PRIORITY)** (2025-06-26/copilot)
    - [x] Build a modern, responsive dashboard in `ai-server/web/` using React + TypeScript + Vite + Tailwind CSS (2025-06-26/copilot)
    - [x] Visualize server/model health, benchmarks, load, queue status, failover events, and plugin hooks in real time (2025-06-26/copilot)
    - [x] Add a **Conversation tab**: (2025-06-26/copilot)
        - [x] Allow user to select a model and have a full, persistent conversation (chat UI) with that model (2025-06-26/copilot)
        - [x] Each message should show the model/server used for the response (2025-06-26/copilot)
        - [x] For each response, display a clickable carrot (`>` icon) that expands to reveal background details (2025-06-26/copilot)
            - [x] Show the full server selection log ("how this server was picked"), including routing, failover, and benchmark info (2025-06-26/copilot)
            - [x] Include timestamps, server/model candidates, and any fallback/queue/429 events (2025-06-26/copilot)
        - [x] Support multi-turn chat, streaming responses, and message history (2025-06-26/copilot)
        - [x] Ensure accessibility and mobile-friendliness for the chat UI (2025-06-26/copilot)
    - [ ] Add sortable/filterable tables for:
        - Server list (status, health, models, in-flight requests, queue depth, last error, etc.)
        - Model list (availability, latency, benchmark scores, server mapping)
        - Benchmark history (per server/model, with trend lines)
        - Request/response logs (with error/failover details)
    - [ ] Implement live charts/graphs for:
        - Server/model latency and throughput (historical and real-time)
        - Queue depth and request rates
        - Benchmark trends and server/model performance comparisons
    - [ ] Add manual controls for:
        - Triggering benchmarks (per server/model)
        - Forcing failover or draining a server
        - Adjusting concurrency/queue settings (with live feedback)
    - [x] Expose all new API features in the UI (health, benchmarks, load, queue, plugin hooks, etc.) (2025-06-26/copilot)
    - [x] Ensure all UI features are accessible and mobile-friendly (2025-06-26/copilot)
    - [x] Add unit and integration tests for all frontend components (≥80% coverage) (2025-06-26/copilot)
    - [x] Document all UI features and usage in `ai-server/web/README.md` (2025-06-26/copilot)
    - [x] Update `docs/PROGRESS.md` as frontend milestones are completed (2025-06-26/copilot)
- [x] Add/expand API endpoints for future growth:
        - [x] **Model Management**
            - [x] `POST /api/orchestrator/models/add` — Add a model to a specific server (2025-06-27/copilot)
            - [x] `DELETE /api/orchestrator/models/:model` — Remove a model from a specific server or all servers (2025-06-27/copilot)
            - [x] `POST /api/orchestrator/models/upload` — Upload a new model (with versioning support) (2025-06-27/copilot)
            - [x] `GET /api/orchestrator/models/versions` — List all versions of a model (2025-06-27/copilot)
        - [x] **Server Management**
            - [x] `POST /api/orchestrator/servers/add` — Add a new server (with config) (2025-06-27/copilot)
            - [x] `DELETE /api/orchestrator/servers/:id` — Remove a server (2025-06-27/copilot)
            - [x] `PATCH /api/orchestrator/servers/:id` — Update server config (concurrency, health, etc.) (2025-06-27/copilot)
        - [x] **Model/Server Mapping**
            - [x] `GET /api/orchestrator/model-map` — Return a mapping of models to servers and vice versa (2025-06-27/copilot)
    - [ ] Update and expand automated tests for all new and updated API endpoints to ensure ≥80% coverage and parity with OpenAPI/Swagger documentation
    - [ ] Add endpoints to support Phase C AI orchestration features:
        - [ ] Universe Generation API (C.1)
            - [ ] Design OpenAPI schema for universe generation requests and responses
            - [ ] Implement endpoint: `POST /api/orchestrator/universe/generate`
            - [ ] Integrate plugin pattern analysis and ruleset extraction
            - [ ] Add validation and error handling for generation parameters
            - [ ] Add unit/integration tests for universe generation logic
        - [ ] Plugin Security Analysis API (C.2)
            - [ ] Design OpenAPI schema for plugin security analysis
            - [ ] Implement endpoint: `POST /api/orchestrator/plugins/analyze`
            - [ ] Integrate code analysis and exploit detection modules
            - [ ] Return detailed vulnerability and patch recommendations
            - [ ] Add tests for exploit detection and patch generation
        - [ ] Permission-Aware Task Routing (C.3)
            - [ ] Define task routing and permission-checking interfaces
            - [ ] Implement endpoint: `POST /api/orchestrator/task/route`
            - [ ] Integrate permission validation and privacy filtering
            - [ ] Add logging for routing decisions and permission denials
            - [ ] Add tests for routing, privacy, and error cases
        - [ ] Context Management (C.4)
            - [ ] Implement endpoints for context chunking and token estimation: `POST /api/orchestrator/context/chunk`, `POST /api/orchestrator/context/estimate`
            - [ ] Add privacy filtering and spoiler protection logic
            - [ ] Integrate encrypted memory and context summarization
            - [ ] Add tests for context chunking, privacy, and memory
        - [ ] Universe-Aware Content Generation (C.5)
            - [ ] Implement endpoint: `POST /api/orchestrator/generate/universe-aware`
            - [ ] Integrate universe knowledge base and compliance checks
            - [ ] Add support for cross-universe and variant content
            - [ ] Add tests for universe compliance and adaptation
        - [ ] Multi-Format Content Import (C.6)
            - [ ] Implement endpoint: `POST /api/orchestrator/import`
            - [ ] Add support for PDF, Word, TXT, and other formats
            - [ ] Integrate entity extraction and universe categorization
            - [ ] Add tests for import, extraction, and migration
        - [ ] Comprehensive Testing & Security Validation (C.7)
            - [ ] Implement endpoint: `POST /api/orchestrator/validate`
            - [ ] Add system-wide integration and security tests
            - [ ] Validate AI features against abuse and privacy criteria
            - [ ] Document test coverage and validation results
    - [ ] Document all new endpoints in OpenAPI/Swagger, including request/response examples and error cases
    - [ ] Add/expand automated tests for all new endpoints and orchestration logic
    - [ ] Update architectural docs and `docs/PROGRESS.md` as features are implemented
- [ ] Maintain request/response compatibility for drop-in relay use
- [ ] Support plugin hooks for custom load balancing or benchmarking logic
- [ ] Add/expand automated tests for advanced load balancer (fairness, queuing, 429, adaptive routing, edge cases)
- [ ] Add automated tests to verify status codes and error messages for all endpoints against a real Ollama server
- [ ] Document all endpoints with Swagger/OpenAPI, including request/response examples and error cases
- [ ] Document all endpoints that are for legacy/compatibility only (e.g., `/api/models`) and not present in all Ollama versions
- [ ] Document all differences and rationale in README and Swagger/OpenAPI docs
- [ ] Update and maintain Swagger/OpenAPI documentation as features evolve
- [ ] Update `docs/PROGRESS.md` and architectural docs as tasks are completed

---

## Notes
- The AI server frontend (`ai-server/web/`) is for development and debugging only. It should not run by default in production environments.
- Always follow the code style, testing, and documentation guidelines in `.github/copilot-instructions.md`.
- For any architectural changes, update `docs/DECISION_LOG.md` as required.

---

## Error Handling & Retry Logic
- If a request to a server fails (timeout, 5xx, network error, etc.):
  1. Mark that server/model pair as “unavailable” for a cooldown period (e.g., 1–5 minutes, configurable).
  2. Retry the same request on another server that has the required model, if available.
  3. If all servers with the model fail, return an error to the client, including details of which servers were tried and why they failed.
- Maintain a cache or in-memory map of recent failures (e.g., `{ serverId, model } → timestamp`).
- When routing, skip any server/model pair that is still in its cooldown window.
- If a server fails repeatedly, open a “circuit breaker” for that server/model, so it’s not retried until a health check passes.
- If a server/model returns a permanent error (e.g., "not enough RAM", "model not supported"), permanently ban that server/model pair from routing (until manual intervention or config reload).
- If all attempts fail, return a clear error to the client, including:
  - The model requested
  - The servers tried and their error messages
  - A suggestion to try again later if appropriate

---

## How to Update This Checklist
- Mark completed steps with `[x]` and add your initials/date.
- If you change the process, update this file and summarize the change in `docs/PROGRESS.md`.
- Keep this document up to date as the rebuild progresses.

---

**Note:** The AI server should be able to act as a drop-in relay for Ollama’s API, orchestrating requests to multiple servers and returning results as if it were a single Ollama instance.

---

**Plugin System Note:**
- The plugin/extension system will be managed by the main backend. For universe-specific features (e.g., Star Trek), document plugin architecture and extension points in the main phase documentation.

---

## AI Server Test Coverage Gaps (from latest coverage.csv)

- [x] **ai-server/src/index.ts**: All endpoints below have passing unit tests as of 2025-06-26:
  - [x] /api/health (GET)
  - [x] /api/models (GET, 404 case)
  - [x] /api/generate (POST, streaming and non-streaming, all error/edge cases)
  - [x] /api/generate/stream (POST, fast 404/error for missing/slow model)
  - [x] /api/models/pull (POST, admin and non-admin cases)
  - [x] /api/models/:model (DELETE, all error/edge cases)
  - [x] /api/config (GET/POST, config update and error cases)
  - [x] /api/tags (GET, aggregation, alternate tags, error cases)
  - [x] /api/orchestrator/config (GET/POST, all config scenarios)
  - [x] /api/servers (GET/POST, server add/remove, error cases)
  - [x] /api/show (GET/POST, missing model, 405, 404, error parsing)
  - [x] /api/embeddings (POST, supported/unsupported, 404/405, field shape)
  - [x] /api/create, /api/push, /api/convert, /api/stop (POST, all status codes, error/edge cases)
  - [x] /api/delete (DELETE, disabled endpoint)
  - [x] /api/orchestrator/models/delete (POST, admin, error/edge cases)
  - [x] /api/orchestrator/models/pull (POST, admin, error/edge cases)
  - [x] All error handling, fallback, and orchestration logic (e.g., failover, server selection, timeouts, cooldowns)
  - [x] All admin/config endpoints and their error/edge cases (2025-06-26/copilot)
  - [x] Add/expand tests for `/api/tags`:
    - [x] All fields populated (no nulls)
    - [x] Missing/invalid model scenarios
    - [x] Multiple versions/tags per model: highest version or random tag selection logic
    - [x] Tag aggregation and alternate tag metadata capture

- [x] **ai-server/src/orchestrator.ts**: All orchestration logic, failover, server/model selection, cooldowns, and edge cases for server/model availability, unhealthy servers, and fallback are covered by passing tests as of 2025-06-26.

- [x] **ai-server/src/server-persistence.ts**: All uncovered lines and functions, including error handling for file read/write and missing/corrupt data, are covered by passing tests as of 2025-06-26.

- [x] **General**:
  - [x] All error/edge cases are tested (missing model, unsupported method, slow/unhealthy server, admin-only endpoints, config errors)
  - [x] At least 80% coverage for statements, branches, functions, and lines in all AI server modules
  - [x] All test cases and rationale are documented in test README

---

## Test Coverage Checklist (Expanded)

- [x] All `/api/tags` scenarios covered:
  - [x] All fields populated (no nulls)
  - [x] Missing/invalid model scenarios
  - [x] Multiple versions/tags per model: highest version or random tag selection logic
  - [x] Tag aggregation and alternate tag metadata capture
- [x] `/api/generate/stream`:
  - [x] Fast 404 for missing model (plain text, status code matches Ollama)
  - [x] Fast error for slow/unresponsive backend
- [x] `/api/embeddings`:
  - [x] 200 with correct `embedding` array for supported models
  - [x] 405 or 404 for unsupported models/methods, response shape matches Ollama
- [x] `/api/create`, `/api/convert`, `/api/stop`, `/api/push`:
  - [x] 405, 404, or 200 with error array for unsupported/edge cases, matching Ollama
- [x] All endpoints:
  - [x] Status code and error message parity with Ollama (including edge cases)
  - [x] Response shape and content parity (including error and success cases)
  - [x] Timeout, slow server, and network error handling
- [x] At least 80% test coverage for all orchestrator logic and endpoints
- [x] All test cases and rationale documented in test README

---

## Progress Update (2025-06-26/copilot)
- [x] All major and edge-case tests for admin/config endpoints, orchestrator logic, and Ollama-compatible endpoints are passing as of 2025-06-26.
- [x] All `/api/tags` scenarios, including edge cases and aggregation logic, are covered by passing tests.
- [x] All orchestration, error handling, and fallback logic are covered by passing tests.
- [x] At least 80% test coverage achieved for all AI server modules.
- [x] All test cases and rationale are documented in the test README.
- [x] **Advanced orchestration and load balancing improvements:**
  - [x] Benchmarking now prioritizes models available on multiple servers; single-server models are benchmarked less frequently.
  - [x] Servers with significantly increased response times are deprioritized for benchmarking (benchmarked much less frequently if slow).
  - [x] Benchmarks are only triggered when new servers are added or after a period of orchestrator inactivity, reducing unnecessary load.
  - [x] Utility methods added for adaptive benchmark scheduling and activity tracking.
  - [x] Manual benchmark trigger endpoint added: `POST /api/orchestrator/benchmarks/server` (triggers benchmark for a specific server or model).
  - [ ] Next: Expose benchmark/health data via API, document new orchestration logic in README and `docs/DECISION_LOG.md`.

---
