# Shared Utils

This folder contains generic utility functions for use across all packages.

## Included Utilities


### generateId
- Generates a cryptographically strong, URL-safe unique identifier string.
- Usage:
  ```ts
  import { generateId } from 'shared/utils';
  const id = generateId();
  ```
- Edge cases: Throws if length is not a positive integer.

### pipelineTasks
- Composes and runs async tasks in sequence (pipeline pattern).
- Usage:
  ```ts
  import { pipelineTasks } from 'shared/utils';
  const pipeline = pipelineTasks([
    async (x) => x + 1,
    async (x) => x * 2,
  ]);
  const result = await pipeline(3); // 8
  ```
- Edge cases: Throws if tasks is not an array of functions; rejects if any task throws.

## Conventions
- All utilities must be strictly typed and documented with JSDoc.
- Add new utilities here and export via `index.ts`.

## See Also
- [shared/README.md](../README.md)
