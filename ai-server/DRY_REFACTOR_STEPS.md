# Making ai-server DRY (Don't Repeat Yourself)

This guide outlines steps to refactor the `ai-server` codebase to maximize code reuse, minimize duplication, and align with project standards from `.github/copilot-instructions.md`.

## 1. Centralize Shared Logic
- **Move all cross-cutting logic** (types, node creation, logging, validation, encryption, helpers) to `shared/`.
- **Import from `shared/`** in all ai-server modules. Remove any local copies after migration.
- **Update barrel files** (`index.ts`) in each shared directory for easy imports.

## 2. Refactor Routers and Controllers
- **Decompose large routers/controllers** into smaller, focused modules (<200 lines each).
- **Extract common middleware** (e.g., error handling, JSON parsing) into reusable functions in `shared/express/` or similar.
- **Use barrel files** for route and controller exports.

## 3. Error Handling
- **Create a shared error handler** in `shared/express/errorHandler.ts`.
- **Replace inline error handlers** in each file with the shared version.
- **Document edge cases and usage in JSDoc and README.**

## 4. Async Initialization Patterns
- **Abstract repeated async initialization** (RAG, Performance RAG, Character Memory) into a generic utility in `shared/async/initService.ts`.
- **Parameterize service-specific logic.**
- **Document with examples and edge cases.**

## 5. Strict Typing
- **Move all interfaces/types** to `shared/types/`.
- **Replace local type definitions** with imports from shared.
- **Update all affected imports.**

## 6. Logging
- **Use the shared logger** from `shared/logging/logger.ts` everywhere.
- **Remove any local logger implementations.**

## 7. Documentation
- **Add JSDoc to all shared utilities.**
- **Update module and root README.md** with usage, edge cases, and migration notes.
- **Document architectural changes in `docs/DECISION_LOG.md`.**

## 8. Testing
- **Write unit tests for all shared logic.**
- **Use the enhanced TypeScript test runner.**
- **Ensure >80% coverage.**

## 9. Plugin SDK Compliance
- **Ensure all universe-specific logic is in plugins.**
- **Core ai-server remains agnostic.**
- **Document plugin integration points.**

## 10. Remove Duplication
- **Audit for duplicate functions, types, or logic.**
- **Remove old copies after migration to shared.**
- **Update all imports and references.**


## Files to Create/Move to `shared/`

Below is a full list of files that should be created or moved into the `shared/` directory to maximize code reuse and eliminate duplication:

### Shared Types & Interfaces
- `shared/types/index.ts` (barrel)
- `shared/types/rag.ts`
- `shared/types/model.ts`
- `shared/types/character.ts`
- `shared/types/universe.ts`
- `shared/types/book.ts`
- `shared/types/node.ts`
- `shared/types/benchmark.ts`
- `shared/types/performance.ts`
- `shared/types/api.ts`

### Shared Services & Utilities
- `shared/node/nodeService.ts` (node creation, ensureNode)
- `shared/logging/logger.ts`
- `shared/validation/validator.ts`
- `shared/encryption/encryptionService.ts`
- `shared/helpers/asyncUtils.ts`
- `shared/helpers/objectUtils.ts`
- `shared/helpers/errorUtils.ts`
- `shared/express/errorHandler.ts`
- `shared/express/middleware.ts`
- `shared/async/initService.ts` (generic async initialization)
- `shared/database/database.config.ts`

### Barrel Files
- `shared/node/index.ts`
- `shared/logging/index.ts`
- `shared/validation/index.ts`
- `shared/encryption/index.ts`
- `shared/helpers/index.ts`
- `shared/express/index.ts`
- `shared/async/index.ts`
- `shared/database/index.ts`

### Documentation
- `shared/README.md`
- `shared/node/README.md`
- `shared/types/README.md`
- `shared/logging/README.md`
- `shared/validation/README.md`
- `shared/encryption/README.md`
- `shared/helpers/README.md`
- `shared/express/README.md`
- `shared/async/README.md`
- `shared/database/README.md`

---

**References:**
- `.github/copilot-instructions.md`
- `shared/README.md`
- `MODULAR_DIRECTORY_STRUCTURE.md`
- `docs/DECISION_LOG.md`

**Next Steps:**
1. Identify duplicate logic and local-only utilities in `ai-server`.
2. Move to `shared/`, update imports, and document changes.
3. Refactor routers/controllers for modularity and reuse.
4. Update documentation and test coverage.
