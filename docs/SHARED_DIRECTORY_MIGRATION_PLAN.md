# Shared Directory Migration Plan: Node Creation and Cross-Package Utilities

## Purpose

This document outlines the steps and codebase changes required to migrate all cross-cutting utilities (including node creation, deduplication, validation, and shared types) into a top-level shared directory. This will enable true code sharing between backend, ai-server, plugins, and other packages, and ensure a single source of truth for core logic.

---

## 1. Create the Shared Directory

- Create a new directory at the project root: `shared/` or `packages/shared/`.
- Add a `README.md` to document its purpose and usage conventions.

---

## 2. Move Node Creation Utility

- Move `backend/src/services/nodeService.ts` (and related types/interfaces) to `shared/node/nodeService.ts` (or similar).
- Update all imports in backend, ai-server, and plugins to reference the new shared location.
- Move or refactor any related tests to `shared/node/__tests__/`.

---

## 3. Move and Consolidate Other Shared Utilities

- **Deduplication:**
  - Move any deduplication utilities (e.g., `entityDeduplication.ts`, `chunkDeduplication.ts`) to `shared/deduplication/`.
- **Validation:**
  - Move schema validators, type guards, and validation error classes (e.g., from `packages/core/src/validation/`) to `shared/validation/`.
- **Database Connection:**
  - If both backend and ai-server use similar MongoDB connection logic, move it to `shared/database/`.
- **Common Types:**
  - Move node/document types, relationship types, and any types/interfaces used in both backend and ai-server to `shared/types/`.
- **Helpers/Utilities:**
  - Move any helpers for chunking, text processing, or pipeline logic that are duplicated or referenced in both backend and ai-server to `shared/utils/`.
- **Error Handling/Logging:**
  - Move custom error classes or logging wrappers used in multiple packages to `shared/errors/` or `shared/logging/`.

---

## 4. Update TypeScript Configurations

- Add the shared directory to the `tsconfig.json` `include`/`references` for all relevant packages (backend, ai-server, plugins, etc.).
- Ensure all packages can import from the shared directory without path or module resolution errors.

---

## 5. Update All Imports

- Refactor all imports in backend, ai-server, and plugins to use the new shared paths.
- Remove any duplicate or now-obsolete utility files from their original locations.

---

## 6. Test and Validate

- Run all tests in backend, ai-server, and plugins to ensure the shared utilities work as expected.
- Add or update tests for any utilities moved to the shared directory.

---

## 7. Documentation

- Update module-level `README.md` files to reference the new shared utility locations.
- Document the migration and new import paths in `docs/DECISION_LOG.md` and `docs/NODE_CREATION_BACKEND_IMPLEMENTATION.md`.
- Update any architectural diagrams or directory trees to reflect the new shared structure.

---

## 8. Candidates for Shared Directory (from codebase review)

- Node creation utility (`ensureNode` and related types)
- Deduplication utilities (entity, chunk, etc.)
- Validation utilities (schema validators, type guards, error classes)
- Database connection logic (if shared)
- Common types/interfaces (node, relationship, etc.)
- Helper/utility functions (chunking, text processing, pipeline logic)
- Error handling and logging utilities

---

## 9. Example Shared Directory Structure

```
shared/
  node/
    nodeService.ts
    __tests__/
  deduplication/
    entityDeduplication.ts
    chunkDeduplication.ts
  validation/
    schemaValidator.ts
    errors.ts
  database/
    mongoConnection.ts
  types/
    nodeTypes.ts
    relationshipTypes.ts
  utils/
    textChunker.ts
    pipelineHelpers.ts
  errors/
    customErrors.ts
  logging/
    logger.ts
  README.md
```

---

## 10. Next Steps

- Assign owners for each migration step.
- Track progress in `docs/PROGRESS.md` and update `PROJECT_CHECKLIST.md`.
- Review and update all affected documentation and code references.

---

By following this plan, the codebase will be more maintainable, extensible, and consistent across all packages and services.
