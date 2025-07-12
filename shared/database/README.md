# Shared Database Utilities

This folder contains database-related utilities for use across all packages.

## Included Utilities

### apiKeyService
- Provides basic API key management (validate, add, revoke, list).
- Usage:
  ```ts
  import { apiKeyService } from 'shared/database';
  const valid = await apiKeyService.validateKey(key);
  ```
- Edge cases: Handles missing/invalid keys, supports extension for persistent storage.

## Conventions
- All utilities must be strictly typed and documented with JSDoc.
- Add new utilities here and export via `index.ts`.

## See Also
- [shared/README.md](../README.md)
