# Audit and Categorization of `src/routes` Files

This document provides a detailed audit of each route file in the `src/routes` directory, identifying the resources managed, endpoint types, and cross-cutting concerns. This will guide modularization and refactoring efforts.

---

## 1. `benchmarks.ts`
- **Resources:** Benchmarks for server/model pairs
- **Endpoints:**
  - `GET /api/orchestrator/benchmarks` — List all benchmark data
  - `POST /api/orchestrator/benchmarks/run` — Trigger benchmark runs
- **Cross-cutting:** Debug logging, orchestrator access

## 2. `characterChat.ts`
- **Resources:** Character chat, universes, character selection
- **Endpoints:**
  - `GET /api/chat/universes` — List universes for chat (and likely many more for chat, character, and universe selection)
- **Cross-cutting:** RAG DB integration, user filtering, possible auth

## 3. `characterMemory.ts`
- **Resources:** Character memory (gap-filling, retrieval, approval)
- **Endpoints:**
  - `GET /api/memory/characters/:characterId` — List memories for a character (and many more for memory management)
- **Cross-cutting:** DB access, approval workflows

## 4. `config.ts`
- **Resources:** Server/model configuration
- **Endpoints:**
  - `GET /api/config` — Get config
  - `POST /api/config` — Update config
- **Cross-cutting:** None (simple config)

## 5. `generate.ts`
- **Resources:** Model output generation
- **Endpoints:**
  - `POST /api/generate` — Generate model output
- **Cross-cutting:** Orchestrator, logging, error handling

## 6. `generators.ts`
- **Resources:** Character and universe generation (legacy)
- **Endpoints:**
  - Multiple endpoints for character/universe generation, validation, memory integration
- **Cross-cutting:** Validation, service integration, large file

## 7. `generatorsNew.ts`
- **Resources:** Character and universe generation (new)
- **Endpoints:**
  - Multiple endpoints for character/universe generation, validation, memory integration
- **Cross-cutting:** Validation, service integration, large file

## 8. `health.ts`
- **Resources:** Health checks
- **Endpoints:**
  - `GET /health` — Server health
  - `GET /orchestrator/health` — Orchestrator/servers health
- **Cross-cutting:** Orchestrator access

## 9. `modelMap.ts`
- **Resources:** Model-server mapping
- **Endpoints:**
  - `GET /model-map` — Mapping of models to servers
- **Cross-cutting:** Orchestrator, caching

## 10. `models.ts`
- **Resources:** Model management
- **Endpoints:**
  - `GET /` — (404 for Ollama compat)
  - `GET /:model` — Aggregated model info
- **Cross-cutting:** Orchestrator, error handling

## 11. `ollamaCompat.new.ts` & `ollamaCompat.ts`
- **Resources:** Ollama API compatibility
- **Endpoints:**
  - Model management: `/create`, `/pull`, `/push`, `/delete`, `/copy`, `/convert`, `/stop`
  - Info: `/version`, `/ps`, `/tags`, `/show`
- **Cross-cutting:** Middleware, debug logging

## 12. `openaiCompat.ts`
- **Resources:** OpenAI API compatibility
- **Endpoints:**
  - Implements OpenAI v1 API endpoints (model inference, etc.)
- **Cross-cutting:** Middleware, debug logging, placeholder auth

## 13. `orchestrator.ts`
- **Resources:** Model/server management
- **Endpoints:**
  - Add/remove/upload models, manage servers, list versions, etc.
- **Cross-cutting:** Orchestrator, application layer, large file

## 14. `orchestratorConfig.ts`
- **Resources:** Orchestrator configuration
- **Endpoints:**
  - `GET /` — Get orchestrator config
  - `POST /` — Update orchestrator config
- **Cross-cutting:** Orchestrator, status update

## 15. `performance.ts`
- **Resources:** Model performance (RAG-enhanced)
- **Endpoints:**
  - `GET /models` — Performance overview
  - (Likely more for querying/searching performance)
- **Cross-cutting:** Orchestrator, RAG, logging, large file

## 16. `qualityBenchmarks.ts`
- **Resources:** Quality assessment/benchmarking
- **Endpoints:**
  - `GET /api/quality/report` — Quality report
  - (Likely more for running/retrieving benchmarks)
- **Cross-cutting:** BenchmarkManager, error handling

## 17. `servers.ts`
- **Resources:** Server management
- **Endpoints:**
  - `GET /` — List servers
  - `POST /` — Add servers
- **Cross-cutting:** Orchestrator, error handling

## 18. `tags.ts`
- **Resources:** Tag management
- **Endpoints:**
  - Multiple endpoints for CRUD on tags
- **Cross-cutting:** Validation, orchestrator, merging logic

## 19. `textToRag.ts`
- **Resources:** Text-to-RAG parsing
- **Endpoints:**
  - `POST /parse` — Parse text to RAG nodes
  - (Likely more for job status, results, etc.)
- **Cross-cutting:** Service integration, logging, large file

---

**Notes:**
- Files flagged as large or handling multiple concerns: `characterChat.ts`, `characterMemory.ts`, `generators.ts`, `generatorsNew.ts`, `orchestrator.ts`, `performance.ts`, `textToRag.ts`.
- Many files mix route definitions with business logic and should be refactored to use controllers/services.
- Compatibility and generation routes are good candidates for subdirectory grouping.

This audit should be used as a reference for the modularization plan and for tracking refactoring progress.
