# Shared Prompts

Centralized prompt storage for all system, plugin, and universe-specific prompts used by the AI helper and orchestration workflows.

## Structure
- `systemPrompts.ts`: System-level prompts for core AI workflows.
- `pluginPrompts.ts`: Prompts contributed by plugins for universe-specific logic.
- `universePrompts.ts`: Prompts for specific universes, books, or chapters.
- `index.ts`: Barrel file for unified imports.

## Metadata
Each prompt includes metadata for discoverability, versioning, and RAG integration:
- `name`: Unique name for the prompt
- `type`: 'system' | 'plugin' | 'universe'
- `tags`: Array of tags for search/filter
- `version`: Semantic version string
- `description`: Brief description of the prompt

## RAG Integration
- All prompts are synced into RAG as nodes for semantic search and context enrichment.
- Embeddings are generated via the orchestrator embedding controller and attached to RAG nodes.
- Prompt context is provided to the intent detector for dynamic selection and downstream task routing.

## Usage Example
```ts
import { systemPrompts, pluginPrompts, universePrompts } from './prompts';

const allPrompts = [
  ...systemPrompts,
  ...pluginPrompts,
  ...universePrompts
];
```

## Edge Cases
- Handles missing or partial metadata gracefully.
- Prompts can be extended by plugins or user input.

## Updating Prompts
- Add new prompts to the appropriate file and update metadata.
- Document changes in this README and in architectural logs if structure changes.

---

For more details, see the implementation plan in `docs/AI_HELPER_PARALLEL_QUEUE_IMPLEMENTATION_PLAN.md`.
