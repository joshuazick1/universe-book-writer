# Shared Error Classes

This folder contains custom error classes for use across all packages.

## Included Errors

- `NotFoundError`: Resource not found
- `ValidationError`: Input validation failed
- `UnauthorizedError`: Authentication/authorization failure
- `ConflictError`: Resource conflict (e.g., duplicate)
- `InternalServerError`: Generic server error

## Usage
```ts
import { NotFoundError, ValidationError } from 'shared/errors';
throw new NotFoundError('Node not found');
```

## Edge Cases
- All errors extend `Error` and include a name and optional details.
- Safe for serialization and logging.

## Conventions
- All errors must be strictly typed and documented with JSDoc.
- Add new errors here and export via `index.ts`.

## See Also
- [shared/README.md](../README.md)
