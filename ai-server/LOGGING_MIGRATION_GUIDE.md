# Migrating Console Output to the Shared Logging Service


This document outlines the recommended steps for migrating all direct `console.log`, `console.error`, `console.warn`, and related output in the `ai-server` package to the centralized logging service provided in the `shared/` directory. This migration will improve consistency, enable advanced log management, and support future enhancements such as log aggregation, filtering, and external monitoring.

**Note:** Basic startup and shutdown logs (such as "AI Server started on port ..." or "Server shutting down...") should be sent to both the shared logger and the console (e.g., using both `logger.info(...)` and `console.log(...)`). This ensures visibility in containerized or cloud environments where console output is required for health checks or orchestration.

## Why Migrate?
- **Consistency:** Enforces a single logging interface across all packages.
- **Extensibility:** Enables log level control, structured logging, and integration with external systems.
- **Maintainability:** Centralizes log formatting, filtering, and output destinations.
- **Compliance:** Aligns with project guidelines for zero duplication and shared utility usage.

## Migration Steps

### 1. Review and Inventory All Console Output
- Use a code search (e.g., `grep`, VS Code search) for `console.log`, `console.error`, `console.warn`, `console.info`, and `console.debug` in `ai-server/`.
- Document each occurrence by file and line number.
- Example:
  - `src/routes/generate.ts:169` — `console.log('[DEBUG/generate] tryRequestWithFailover threw:', err);`
  - `src/compat/openai/chat.ts:183` — `console.error('[chat] Failed to track usage:', usageErr);`

### 2. Locate or Implement the Shared Logging Service
- Confirm the existence of a logging utility in `shared/logging/` (e.g., `shared/logging/logger.ts`).
- If missing, implement a logger that supports at least: `info`, `warn`, `error`, `debug` methods, log level filtering, and context tagging.
- Ensure the logger is exported via a barrel file (`shared/logging/index.ts`).


### 3. Update Imports in All Affected Files
- Replace all direct `console` usage with imports from the shared logger:
  ```typescript
  // Before
  // console.error('Failed to connect:', err);

  // After
  import { logger } from 'shared/logging';
  logger.error('Failed to connect:', err);
  ```
- Use the appropriate log level (`info`, `warn`, `error`, `debug`) for each message.
- Add context tags or metadata where helpful (e.g., `logger.error('Failed to connect', { module: 'database', err })`).
- For startup and shutdown events, log to both the shared logger and the console:
  ```typescript
  logger.info('AI Server started on port 5000');
  console.log('AI Server started on port 5000');
  ```

### 4. Refactor and Test
- Refactor each file, replacing all `console` statements with the shared logger.
- Run all tests using the enhanced test runner:
  ```powershell
  npm test
  # or for targeted runs
  npx tsx scripts/run-tests-with-output.ts ai-server --pattern "logger"
  ```
- Ensure that log output appears as expected and that no direct `console` calls remain.

### 5. Remove or Update Comments
- Remove any comments referencing direct `console` usage.
- Update documentation and code comments to reference the shared logger.

### 6. Document the Migration
- Update module and root `README.md` files to reflect the new logging approach.
- Record the migration in `docs/DECISION_LOG.md` with context, rationale, and affected modules.
- If new features or interfaces were added to the logger, document them in `shared/logging/README.md`.

### 7. Enforce via Linting (Optional)
- Add or update lint rules to disallow direct `console` usage outside the shared logger (e.g., using ESLint's `no-console` rule).

## Example Migration
**Before:**
```typescript
console.warn('RAG system not available, using fallback data:', ragError);
```
**After:**
```typescript
import { logger } from 'shared/logging';
logger.warn('RAG system not available, using fallback data:', { error: ragError });
```

**Startup/Shutdown Example:**
```typescript
import { logger } from 'shared/logging';
logger.info('AI Server started on port 5000');
console.log('AI Server started on port 5000');
```

## Edge Cases
- For debug-only or development logs, use the `debug` method and ensure log level filtering is respected.
- For logs inside catch blocks, always include error objects for stack traces.
- For logs in async code, ensure logger calls are non-blocking.

## Final Checklist
- [ ] All `console` output replaced with shared logger
- [ ] Imports updated and deduplicated
- [ ] Tests pass and logs appear as expected
- [ ] Documentation updated
- [ ] Decision log entry created

---

**References:**
- `shared/logging/README.md`
- `docs/DECISION_LOG.md`
- Project coding standards in `.github/copilot-instructions.md`
