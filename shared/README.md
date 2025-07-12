# Shared Directory

## Purpose

The `shared/` directory centralizes core utilities, types, and services used across the backend, ai-server, plugins, and other packages in the Universe Book Writer monorepo. This structure ensures consistency, reduces duplication, and streamlines maintenance for all cross-cutting concerns.

## What Belongs Here?

- **Node Services**: Core logic for node creation, retrieval, and management (e.g., `nodeService.ts`).
- **Types & Interfaces**: All TypeScript types and interfaces shared between backend, ai-server, and plugins (e.g., node types, metadata, analytics, health status, etc.).
- **Logging Utilities**: Centralized logging logic for consistent output and error handling.
- **Database Utilities**: Shared database helpers and services (e.g., API key management).
- **Encryption & Key Management**: Services and types for encryption, collaborative keys, and content key management.
- **Validation & Deduplication**: Utilities for data validation and deduplication.
- **Error Handling**: Custom error classes and error utilities.
- **Generic Helpers**: Utility functions used by multiple packages.

## Directory Structure

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

## Usage Guidelines

- **Import from `shared/`**: All packages (backend, ai-server, plugins) should import shared logic from this directory instead of duplicating code.
- **Barrel Files**: Each subfolder should include an `index.ts` to aggregate and re-export its modules for easier imports.
- **Strict Typing**: All shared types must use strict TypeScript typing. Avoid `any` unless absolutely necessary.
- **Documentation**: Each module or utility should include JSDoc comments and, where appropriate, a local README with usage examples.

## Migration & Maintenance

- When moving or creating shared utilities, update all import paths in dependent packages.
- Remove original files after successful migration to avoid duplication.
- Update `tsconfig.json` and project references to include `shared/`.
- Document all changes in `docs/DECISION_LOG.md` and update architectural diagrams as needed.

## Example: Node Creation Utility

```ts
import { ensureNode } from 'shared/node/nodeService';

const universeNode = await ensureNode({ type: 'universe', title: universeId, metadata: { universeId } });
const bookNode = await ensureNode({ type: 'book', title: bookTitle, parentId: universeNode.id, metadata: { universeId } });
const chapterNode = chapterTitle
  ? await ensureNode({ type: 'chapter', title: chapterTitle, parentId: bookNode.id, metadata: { universeId, bookId: bookNode.id } })
  : null;
```

## Contribution

- Follow the monorepo's code style and documentation standards.
- Add or update tests in the appropriate `__tests__/` subfolder.
- Update this README and related documentation when making significant changes.

---

By consolidating shared logic here, the project achieves greater maintainability, reliability, and developer efficiency across all universes and features.
