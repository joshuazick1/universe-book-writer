# Shared Encryption Services

This folder contains encryption and key management services for use across all packages.

## Included Services

### BaseEncryptionService
- Abstract base class for encryption services (interface for encrypt/decrypt).

### RagNodeEncryptionService
- AES-256-GCM encryption for RAG nodes.
- Usage:
  ```ts
  import { RagNodeEncryptionService } from 'shared/encryption';
  const service = new RagNodeEncryptionService();
  const encrypted = await service.encrypt('data', key);
  const decrypted = await service.decrypt(encrypted, key);
  ```

### CollaborativeKeyService
- Generates random 256-bit keys for collaborative encryption.
- Usage:
  ```ts
  import { CollaborativeKeyService } from 'shared/encryption';
  const key = CollaborativeKeyService.generateKey();
  ```

### ContentKeyManagerService
- In-memory mapping of content IDs to keys (demo; replace for production).
- Usage:
  ```ts
  import { ContentKeyManagerService } from 'shared/encryption';
  ContentKeyManagerService.setKey('id', key);
  const key = ContentKeyManagerService.getKey('id');
  ContentKeyManagerService.removeKey('id');
  ```

## Conventions
- All services must be strictly typed and documented with JSDoc.
- Add new services here and export via `index.ts`.

## See Also
- [shared/README.md](../README.md)
