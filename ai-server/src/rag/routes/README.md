# RAG Update Routes

This module provides REST API endpoints for managing encrypted updates, batch operations, and version history for RAG (Retrieval-Augmented Generation) content.

## Endpoints

- `GET /api/rag/updates/history/:nodeId` — Get update history for a specific node
- `GET /api/rag/updates/universe/:universeId` — Query update history for a universe
- `GET /api/rag/updates/statistics/:universeId` — Get update statistics for a universe
- `POST /api/rag/updates/rollback/:nodeId` — Rollback a node to a previous version
- `POST /api/rag/updates/transaction` — Create an update transaction (batch)
- `POST /api/rag/updates/cleanup/:universeId` — Clean up old updates for a universe
- `GET /api/rag/updates/batch/:batchId` — Get details of an update batch
- `GET /api/rag/updates/:updateId` — Get details of a specific update

## Access Control

- All endpoints require authentication (`requireAuth` middleware).
- Batch and update details endpoints enforce universe-level RBAC: only users with access to the relevant universe can view details.
- The `filterAccessibleUpdates` utility ensures users only see updates they are permitted to access.

## Example Usage

```typescript
import { createRAGUpdateRoutes } from './update.routes.js';
import { RAGUpdateStorageService, RAGUpdateEncryptionService } from '../services';

const app = express();
app.use('/api/rag/updates', createRAGUpdateRoutes({
  updateStorage: new RAGUpdateStorageService(...),
  updateEncryption: new RAGUpdateEncryptionService(...),
  ragStorage: ...
}));
```

## Testing

- Unit tests: `update.routes.test.ts` (Jest + supertest)
- Run: `npm run test:ai-server` or see monorepo test runner

## Implementation Notes

- Batch and update details endpoints are fully implemented with RBAC stubs (replace with real universe permission checks).
- All endpoints return appropriate HTTP status codes for authentication, authorization, and not found errors.
- See `src/rag/services/update-storage.service.ts` for storage logic.

## Related Docs
- [RAG System README](../README.md)
- [Update Encryption README](../encryption/README-update-encryption.md)
