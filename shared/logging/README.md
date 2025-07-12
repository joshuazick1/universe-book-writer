# Shared Logger Utility

This module provides a consistent, environment-aware logging interface for all packages in the Universe Book Writer monorepo.

## Usage

```ts
import { logger } from 'shared/logging';

logger.info('Server started', { context: 'api-server' });
logger.error('Failed to connect', { error: err, context: 'db' });
```

## Features
- Strict TypeScript types
- Log level filtering via `NODE_ENV` or `LOG_LEVEL`
- Context and error support
- Safe for backend, ai-server, and plugins

## Edge Cases
- Handles both string and object messages
- Serializes errors and additional context

## Log Levels
- `debug`, `info`, `warn`, `error`

## Environment
- Set `LOG_LEVEL` or `NODE_ENV` to control verbosity

## Example
```
LOG_LEVEL=debug node myscript.js
```

## See Also
- [shared/README.md](../README.md)
