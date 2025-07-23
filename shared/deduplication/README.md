# Shared Deduplication Utilities

This module provides reusable deduplication helpers for node creation, data import, and plugin operations across the Universe Book Writer monorepo.

## Purpose

- Centralize deduplication logic for nodes, types, and plugin data.
- Ensure consistent deduplication rules across backend, ai-server, and plugins.
- Facilitate unit testing and code reuse.

## Usage

Import the deduplication helpers from the shared package:

```ts
import { deduplicateNodes, deduplicateByKey } from 'shared/deduplication';

const uniqueNodes = deduplicateNodes(nodesArray);
const uniqueByTitle = deduplicateByKey(nodesArray, 'title');
```

## API

### `deduplicateNodes(nodes: Node[]): Node[]`
- Removes duplicate nodes by id.

### `deduplicateByKey<T>(items: T[], key: keyof T): T[]`
- Removes duplicates from an array based on a specified key.

## Edge Cases
- If input is empty or contains only one item, returns input as-is.
- If key is missing on an item, that item is included only once.

## Extending
- Add new deduplication functions for other shared types as needed.
- All new deduplication helpers must be unit tested in `shared/deduplication/__tests__/`.

---

See `shared/types/` for canonical type definitions.
