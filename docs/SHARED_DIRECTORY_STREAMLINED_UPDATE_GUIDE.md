# Streamlined Update Guide: Shared Directory & Node Creation Utility

## Purpose

This guide provides a concise, actionable checklist for migrating node creation and shared utilities to a top-level shared directory, ensuring consistency and maintainability across backend, ai-server, and plugins.


## 1. Create the Shared Directory

---

## 11. Migration File Checklist

Below is a comprehensive list of files and directories to **create**, **update**, or **remove** as part of the shared directory migration. Adjust as needed for your codebase specifics.

### Files/Directories to **Create** (in `shared/`)


- `shared/README.md` — Purpose and usage of the shared directory.
- `shared/node/nodeService.ts` — Move from `backend/src/services/nodeService.ts`.
- `shared/tests/` — Move or create tests for node service.
- `shared/types/` — Consolidate all shared TypeScript interfaces and types:
  - **Node-related types (must be present):**
    - `NodeMetadata` — interface for arbitrary key-value metadata on nodes.
    - `NodeInput` — interface for the shape of data required to create or upsert a node.
    - `Node` — interface for the canonical node object, including id, type, title, parentId, metadata, createdAt, and updatedAt.
  - **If found elsewhere, also move:**
    - Node type enums or string literal unions (e.g., `type NodeType = 'universe' | 'chapter' | ...`)
    - Node relationship types (e.g., parent/child mapping interfaces)
    - Node validation result types (if validation logic is shared)
    - Node query/filter types (for searching or listing nodes)
    - Any shared error/result types related to node operations
  - Document shapes, options (from backend and ai-server)
  - Analytics, audit, generator, health status, etc.
- `shared/logging/logger.ts` — Move logging utilities from `ai-server/src/logger.ts`.
- `shared/utils/generateId.ts` — Move from `ai-server/src/utils/generateId.ts`.
- `shared/utils/pipelineTasks.ts` — Move from `ai-server/src/utils/pipelineTasks.ts`.
- `shared/database/apiKeyService.ts` — Move from `backend/src/services/database/apiKeyService.ts`.
- `shared/encryption/` — Move encryption/key management services and types:
  - `rag-node-encryption.service.ts`, `collaborative-key.service.ts`, `content-key-manager.service.ts`, `base-encryption.service.ts`
- `shared/errors/` — Move or create custom error classes/utilities from backend/ai-server.
- `shared/validation/` — Move or create validation utilities.
- `shared/deduplication/` — Move or create deduplication utilities.
- `shared/utils/` — Move or create other generic helpers.
- `shared/database/` — Move or create generic database utilities.
- Add `index.ts` barrel files in each shared subfolder for exports.

### Files/Directories to **Update**

- All import statements in backend, ai-server, and plugins referencing moved utilities/types (update to new `shared/` paths).
- All related test files (move or update imports as needed).
- `tsconfig.json` and project references in backend, ai-server, plugins, etc. (add `shared/` to `include`/`references`).
- Module `README.md` files to reference shared utilities.
- `docs/DECISION_LOG.md` — Document the migration and rationale.
- `docs/NODE_CREATION_BACKEND_IMPLEMENTATION.md` — Update to reflect new shared location.
- Architectural diagrams and directory trees in documentation.
- `docs/PROGRESS.md` and `PROJECT_CHECKLIST.md` — Track migration progress.

### Files/Directories to **Remove**

- Original files/directories after successful migration:
  - `backend/src/services/nodeService.ts`
  - `backend/src/services/database/apiKeyService.ts`
  - `ai-server/src/logger.ts`
  - `ai-server/src/utils/generateId.ts`
  - `ai-server/src/utils/pipelineTasks.ts`
  - `backend/src/services/encryption/` (after moving to shared)
  - Any duplicate types/interfaces now in `shared/types/`
  - Any duplicate helpers, validation, deduplication, error, or logging utilities now in `shared/`

---
- At project root, create: `shared/` (or `packages/shared/`).
- Add a `README.md` describing its purpose and usage.

---

## 2. Move Node Creation Utility
- Move `backend/src/services/nodeService.ts` to `shared/node/nodeService.ts`.
- Move related types/interfaces to `shared/node/` or `shared/types/`.
- Refactor all imports in backend, ai-server, and plugins to use the new shared path.
- Move or update related tests to `shared/node/__tests__/`.

---

## 3. Consolidate Other Shared Utilities
- Move deduplication, validation, database, types, helpers, and error/logging utilities to appropriate subfolders in `shared/`.
- Remove duplicates from original locations.

---

## 4. Update TypeScript Configs
- Add `shared/` to `tsconfig.json` `include`/`references` for backend, ai-server, plugins, etc.
- Ensure all packages can import from `shared/` without errors.

---

## 5. Refactor Imports
- Update all code to import shared utilities from the new paths.
- Remove obsolete/duplicate files.

---

## 6. Test & Validate
- Run all tests in backend, ai-server, and plugins.
- Add/update tests for moved utilities.

---

## 7. Documentation
- Update module `README.md` files to reference shared utilities.
- Document migration in `docs/DECISION_LOG.md` and `docs/NODE_CREATION_BACKEND_IMPLEMENTATION.md`.
- Update architectural diagrams and directory trees as needed.

---

## 8. Track Progress
- Assign owners for each step.
- Update `docs/PROGRESS.md` and `PROJECT_CHECKLIST.md` as you complete tasks.

---

## 9. Example Directory Structure
```
shared/
  node/
    nodeService.ts
    __tests__/
  deduplication/
  validation/
  database/
  types/
  utils/
  errors/
  logging/
  README.md
```

---

## 10. Node Creation Pattern (Usage Example)
```ts
const universeNode = await ensureNode({ type: 'universe', title: universeId, metadata: { universeId } });
const bookNode = await ensureNode({ type: 'book', title: bookTitle, parentId: universeNode.id, metadata: { universeId } });
const chapterNode = chapterTitle
  ? await ensureNode({ type: 'chapter', title: chapterTitle, parentId: bookNode.id, metadata: { universeId, bookId: bookNode.id } })
  : null;
```

---

By following this checklist, you will centralize core logic, reduce duplication, and enable robust code sharing across all packages.
