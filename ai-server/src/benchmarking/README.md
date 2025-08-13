# Benchmarking Utilities

This directory contains utilities and services for managing benchmarking operations in the AI server.

## Files

### `createAIServerNodes.ts`
Contains logic for creating nodes for AI servers.

### `createModelPerformanceNodes.ts`
Contains logic for creating nodes for model performance.

### `createAggregatedAIModelNode.ts`
Contains logic for creating aggregated nodes for AI models.

### `enhanced-updateRAGSystem.ts`
Implements the enhanced logic for updating the RAG system with new nodes.

### `benchmarkUtils.ts`
Provides utility functions for validating and logging benchmark data.

## Usage

- Import the required functions or classes from the respective files.
- Use `createAIServerNodes`, `createModelPerformanceNodes`, and `createAggregatedAIModelNode` to create nodes.
- Use `enhancedUpdateRAGSystem` to update the RAG system with new nodes.
- Use `benchmarkUtils` for validation and logging.

## Edge Cases

- Ensure that the input data is validated before calling the node creation functions.
- Handle errors gracefully when updating the RAG system.

## Examples

```ts
import { createAIServerNodes } from './createAIServerNodes';

const servers = [
  { id: '1', name: 'Server 1', metadata: { location: 'US' } },
  { id: '2', name: 'Server 2', metadata: { location: 'EU' } },
];

createAIServerNodes(servers).then(nodes => console.log(nodes));
```
