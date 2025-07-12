# Shared Validation Utilities

This folder contains validation functions for use across all packages.

## Included Validators

- `validateRequired(field, value)`: Throws if value is null, undefined, or empty string
- `validateString(field, value)`: Throws if value is not a string
- `validateNumber(field, value)`: Throws if value is not a number

## Usage
```ts
import { validateRequired, validateString, validateNumber } from 'shared/validation';
validateRequired('title', value);
```

## Edge Cases
- Throws `ValidationError` on failure
- All functions are strictly typed

## Conventions
- All validators must be strictly typed and documented with JSDoc
- Add new validators here and export via `index.ts`

## See Also
- [shared/README.md](../README.md)
