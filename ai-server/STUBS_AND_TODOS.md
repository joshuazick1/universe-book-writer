# Stubbed Implementations and TODOs in ai-server

This document lists all remaining stubbed implementations, TODOs, and not-yet-implemented features in the `ai-server` backend as of July 2025. Use this as a reference for technical debt, prioritization, and future development.

---

## Implementation Plan: Replacing Stubs and TODOs

### General Approach
- **Prioritize core features** that block user-facing functionality or integration.
- **Replace all stubbed logic** with robust, production-ready code, following the modularization and architecture plans.
- **Write unit/integration tests** for all new logic.
- **Update documentation and API specs** as features are completed.
- **Remove or update all comments referencing stubs, TODOs, or 'not yet implemented'.**

---

## Controllers

### `src/controllers/ragTextController.ts`
- **Action:**
  - Remove all stub comments and wire all endpoints to real service logic.
  - Implement rollback and migration endpoints using the real file/chunk versioning and migration logic.
  - Add error handling and validation for all file/chunk operations.
  - Write tests for all endpoints.

---

## Services

### `src/services/ragNodeService.ts`
- **Action:**
  - Remove all stub comments.
  - Ensure all file/chunk versioning, diff, rollback, and migration logic is robust and fully integrated.
  - Add tests for all workflows (versioning, diff, rollback, migration).

---

## Core

### `src/rag/core/fileStorage.ts`
- **Action:**
  - Remove all stub comments and update documentation to reflect real implementation.
  - Implement real migration logic: apply migrationData to file content and record as a new version (e.g., update chunk parentage, split/merge content, etc.).
  - Add tests for migration and rollback workflows.

### `src/rag/core/chunkDiff.ts`
- **Action:**
  - Remove all stub comments and update documentation.
  - Implement logic to generate node update instructions (e.g., return actionable instructions for the node graph: add, remove, update, keep chunks).
  - Add tests for diff and update instruction generation.

### `src/rag/core/types.ts`
- **Action:**
  - No action needed for the 'task' type label.

---

## RAG System, Benchmark, and Routes

### `src/rag/index.ts`
- **Action:**
  - Implement the RAG system factory for production and testing.
  - Implement a mock RAG system for testing and CI.
  - Remove all stub comments and error throws for unimplemented features.
  - Add tests for system instantiation and mock/test modes.

### `src/rag/services/context-assembly.service.ts`
- **Action:**
  - Implement proper access control (e.g., RBAC, universe/user permissions).
  - Add tests for access control logic.

### `src/rag/services/storage.service.ts`
- **Action:**
  - Implement caching for storage queries.
  - Implement suggestions for user queries/content.
  - Implement full sync logic for distributed/replicated storage.
  - Implement sophisticated ranking for search/results.
  - Add tests for all new features.

### `src/rag/routes/rag.routes.ts`
- **Action:**
  - Get ownerId from auth context (implement authentication middleware if needed).
  - Add tests for authenticated/unauthenticated access.

### `src/rag/routes/update.routes.ts`
- **Action:**
  - Implement batch and update details endpoints.
  - Implement sophisticated access control based on universe permissions.
  - Implement proper authentication middleware.
  - Add tests for all new endpoints and access control.

### `src/rag/services/update-storage.service.ts`
- **Action:**
  - Implement node reconstruction and current node retrieval logic.
  - Add tests for node reconstruction and retrieval.


### `src/routes/openaiCompat.ts` and API Key Management

- **Goal:**
  - Implement secure, production-ready API key management and OpenAI endpoint authentication, with seamless frontend integration.

- **Required Steps:**
  1. **API Key Service:**
     - Ensure `src/services/database/apiKeyService.ts` supports: create, list (metadata only), revoke, and validate keys.
     - Only return the full key at creation time; never expose it again.
  2. **API Key Management Endpoints:**
     - Create `src/routes/userApiKey.routes.ts` (new) for:
       - `POST /user/api-keys` (create, returns full key once)
       - `GET /user/api-keys` (list metadata)
       - `POST /user/api-keys/:id/revoke` (revoke)
     - Add `src/controllers/userApiKeyController.ts` (new) for endpoint logic.
     - Register endpoints in main app.
  3. **OpenAI Endpoint Authentication:**
     - In `src/routes/openaiCompat.ts`, add middleware to accept either:
       - A valid backend JWT (preferred for user context)
       - A valid API key (for automation/service use)
     - Use backend’s JWT secret/public key for validation.
     - Attach user info to `req.apiUser` for downstream use.
     - Update error handling and logging for clarity.
     - (Optional) Move shared logic to `src/middleware/auth.ts` (new).
 4. **Frontend Integration:**
     - **UI:** In `frontend/src/components/user/pages/UserSettingsPage.tsx`, implement a user-facing API key management panel:
         - List all API keys (metadata only: label, created, last used, status).
         - Allow users to create a new API key (show full key only once, with a copy warning and security notice).
         - Allow users to revoke (delete) an API key with confirmation.
         - Display clear warnings: "API keys are shown only once. Copy and store securely."
         - Show last-used timestamp and status (active/revoked) for each key.
         - UI must be accessible and responsive, using Tailwind CSS.
     - **API Integration:** Use `frontend/src/services/apiKey.service.ts` for all API key operations:
         - `listApiKeys()`: Fetches metadata for all keys.
         - `createApiKey()`: Creates a new key, returns full key string once.
         - `revokeApiKey(id)`: Revokes a key by ID.
         - Handle and display API/server errors gracefully.
     - **Security:**
         - Never store API keys in local storage or persistent browser storage.
         - Only display the full key immediately after creation.
         - Use HTTPS for all API calls.
     - **Testing:**
         - Add/expand unit and integration tests for the API key UI and service.
         - Test edge cases: duplicate creation, network errors, revoked keys, etc.
     - **Documentation:**
         - Update `frontend/README.md` with usage instructions and screenshots for API key management.
         - Document all API methods in `frontend/src/services/apiKey.service.ts` with JSDoc and usage examples.
  5. **Testing:**
     - Add/expand tests for all new endpoints and service logic:
       - `src/routes/userApiKey.routes.test.ts` (new)
       - `src/services/database/apiKeyService.test.ts`
       - `src/routes/openaiCompat.test.ts` (new)
  6. **Documentation:**
     - Document endpoints and flows in `docs/API_KEY_MANAGEMENT.md` (new).
     - Update frontend and backend READMEs as needed.

**Security Notes:**
- Never return the full API key except at creation.
- Never store API keys in frontend local storage.
- Use HTTPS for all communication.
- (Optional) Store only a hash of the key in MongoDB for maximum security.

**Summary Table of Required Files:**

| File/Location                                         | Purpose                                      |
|-------------------------------------------------------|----------------------------------------------|
| src/services/database/apiKeyService.ts                | API key storage, validation, and logic       |
| src/routes/userApiKey.routes.ts (new)                 | Express router for user API key endpoints    |
| src/controllers/userApiKeyController.ts (new)         | Controller for API key actions               |
| src/routes/openaiCompat.ts                            | Accept JWT or API key for OpenAI endpoints   |
| src/middleware/auth.ts (new, recommended)             | Shared JWT/API key validation middleware     |
| src/config/database.config.ts                         | Register api_keys collection                 |
| src/routes/userApiKey.routes.test.ts (new)            | Endpoint tests                               |
| src/services/database/apiKeyService.test.ts           | Service tests                                |
| src/routes/openaiCompat.test.ts (new)                 | Auth tests                                   |
| frontend/src/components/user/pages/UserSettingsPage.tsx| API key management UI                        |
| frontend/src/services/apiKey.service.ts               | API key API integration                      |
| docs/API_KEY_MANAGEMENT.md (new)                      | Documentation                                |

---

## Prioritization & Milestones
1. **Critical Path:**
   - Complete all file/chunk versioning, diff, rollback, and migration logic (core + controller + service).
   - Implement all authentication and access control stubs.
2. **Integration:**
   - Wire up all endpoints to real logic and remove stub comments.
   - Implement model selection and benchmarking logic.
3. **Advanced Features:**
   - Add caching, suggestions, full sync, and sophisticated ranking.
   - Implement mock/test RAG system for CI/testing.
4. **Testing & Documentation:**
   - Write/expand tests for all new logic.
   - Update documentation and API specs.
   - Remove all references to stubs, TODOs, and 'not yet implemented'.

---

## Summary
- Most core file/chunk versioning, diffing, and storage logic is now implemented, but some comments and migration logic are still stubbed.
- Many TODOs remain in other parts of the backend, especially for access control, authentication, advanced RAG system features, and some endpoints.
- Some error messages and comments still reference "not yet implemented" or "stub".

**This list and plan should be reviewed and updated as features are completed.**
