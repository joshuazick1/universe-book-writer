# Node Creation Backend Implementation

## Overview

This document outlines the recommended approach for consistently creating and managing universe, book, and chapter nodes in the backend for the Multi-Universe Book Series Writing Assistant. The goal is to ensure that all node creation logic is centralized, reusable, and decoupled from specific pipeline implementations (such as text-to-RAG ingestion).


## Why Centralize Node Creation?

- **Consistency:** Prevents duplication and ensures all nodes are created with the correct structure, relationships, and metadata.
- **Reusability:** Allows any backend feature (not just the text-to-RAG pipeline) to create or look up nodes in a standard way.
- **Separation of Concerns:** Keeps pipeline logic focused on processing, not entity management.

---


### System Nodes vs. Content Nodes: Collection Separation

**Important Architectural Note:**

System nodes (such as `ai-server`, `ai-model`, `model-performance`, etc.) should be stored in separate collections from content nodes (such as `universe`, `book`, `chapter`, etc.).

**Rationale:**
- System nodes represent infrastructure, models, or performance data, not story content.
- They have different lifecycles, access patterns, and often different schemas than content nodes.
- Keeping system and content data separate improves maintainability, clarity, and reduces risk of accidental cross-contamination.
- This separation allows for optimized indexing, querying, and access control for each type of data.

**How to implement:**
- Use dedicated collections (e.g., `systemNodes` or one per system node type) for system/infrastructure nodes.
- Use main collections (e.g., `universes`, `books`, `chapters`, etc.) for story/content nodes, partitioned by `universeId` or similar fields.

This separation should be reflected in your data models, service logic, and the `ensureNode` utility implementation.

---


### Query and API Updates for Collection Separation

With system and content nodes now stored in separate collections, you must update all queries and APIs to ensure they only access the correct collection for each node type.


**Required Changes:**
- **API Consistency:** Make sure all backend service and repository methods, as well as all API endpoints (including those used by the filter bar), query the correct collection for each node type. For example, endpoints that return universes must only query the `universes` collection, never system node collections.
- **Filter Logic:** The filter bar and any similar UI components must only query and display data from content node collections (e.g., `universes`, `books`, `chapters`), not system node collections. This ensures users only see real story content, not infrastructure/system nodes.
- Review and update any aggregation pipelines, joins, or lookups to reference the correct collections.
- Update frontend service calls (e.g., `ragService.getUniverses`) to expect and handle only content node data.
- Add or update tests to verify that APIs do not leak system nodes into content node results, and vice versa.

This is critical for features like the RAG filter bar, which should only display real universe nodes and not system/infrastructure nodes.

---


To implement the shared `ensureNode` pattern and ensure consistency across the codebase, the following files should be updated or created. **All functions, utilities, and services referenced below must be implemented as real, production-ready code—not stubs or mocks.**

**1. Shared Node Utility**
- `backend/src/services/nodeService.ts` (or similar): Implement the generic `ensureNode` utility for all node types (core, plugin, system).

**2. AI Server (System Node Creation)**
- `ai-server/src/services/modelPerformanceRAG.service.ts`: Refactor to use `ensureNode` for `ai-server`, `ai-model`, and `model-performance` nodes.
- `ai-server/src/services/ragNodeService.ts`: Refactor to use the shared utility if node creation/upsert logic exists here.
- `ai-server/src/rag/core/node.ts`: Update to delegate to the shared utility if node creation logic is present.

**3. Text-to-RAG Pipeline**
- `ai-server/src/services/textToRagParser/postChunkingPipeline.ts`
- `ai-server/src/services/textToRagParser/storage/databaseManager.ts`
- `ai-server/src/services/textToRagParser/ai/ollamaService.ts`
- `ai-server/src/services/textToRagParser/index.ts`
- Any other pipeline step files that create or upsert nodes.

**4. Backend RAG Services**
- `backend/src/services/rag-storage-adapter.service.ts`
- `backend/src/services/rag-integration.service.ts`
- `backend/src/services/rag-backend.service.ts`
- `backend/src/adapters/rag-storage.adapter.ts`
- `backend/src/database/rag-database.ts`
- Any other backend service that creates or upserts nodes.

**5. Plugin/Universe Extensibility**
- `ai-server/src/pipeline/pluginRegistry.ts`
- `backend/src/plugins/types/plugin.types.ts`
- Any plugin or universe-specific node creation logic to use the shared utility.

**6. Tests**
- `backend/tests/unit/services/nodeService.test.ts` (new or update)
- `ai-server/tests/services/modelPerformanceRAG.service.test.ts`
- Any test files covering node creation in the pipeline, backend, or plugins.

**7. Documentation**
- `docs/NODE_CREATION_BACKEND_IMPLEMENTATION.md` (already updated)
- Module-level `README.md` files for services or plugins that use node creation.

**8. Barrel Files**
- Any `index.ts` files in affected service directories to export the new/updated utility.

This list covers all major areas where node creation logic should be centralized and updated to use the new pattern, ensuring consistency across the text-to-RAG pipeline, AI server, backend, and plugins.

## Recommended Pattern

### 1. Node Creation Service/Utility (Generalized)

Implement a backend service or utility function, e.g. `ensureNode` or `ensureCoreNodes`, that:
- Checks if each node (universe, book, chapter, character, location, vessel, faction, lore, etc.) exists.
- Creates any missing nodes, establishing correct parent/child relationships and setting required metadata.
- Returns the node objects or IDs for downstream use.

#### Supporting Additional Node Types

- Extend the service to support all core node types in your world model (e.g., character, location, vessel, faction, lore, etc.).
- For universe-specific or plugin-specific nodes, provide extension points or allow plugins to register their own node creation logic using the same pattern.

#### Example: Generic Node Creation Utility (TypeScript/Node.js)
```ts
// services/nodeService.ts
export async function ensureNode({ type, title, parentId, metadata }) {
  let node = await findNode(type, title, parentId);
  if (!node) node = await createNode({ type, title, parentId, metadata });
  return node;
}

// Example usage for core types:
const universeNode = await ensureNode({ type: 'universe', title: universeId, metadata: { universeId } });
const bookNode = await ensureNode({ type: 'book', title: bookTitle, parentId: universeNode.id, metadata: { universeId } });
const chapterNode = chapterTitle
  ? await ensureNode({ type: 'chapter', title: chapterTitle, parentId: bookNode.id, metadata: { universeId, bookId: bookNode.id } })
  : null;

// Example usage for other types:
const characterNode = await ensureNode({ type: 'character', title: characterName, parentId: universeNode.id, metadata: { universeId } });
const locationNode = await ensureNode({ type: 'location', title: locationName, parentId: universeNode.id, metadata: { universeId } });
```

#### Plugin/Universe Extensibility
- Plugins or custom universes should use the same utility/service for their own node types.
- If special validation or relationships are needed, extend the utility or provide hooks for plugin logic.


---


## Implementation Plan: Refactoring AI Server Node Creation

To ensure consistency across the codebase, including the AI server, update node creation for system nodes (such as `ai-server`, `ai-model`, and `model-performance`) to use the shared `ensureNode` utility. This will align the AI server with the recommended backend pattern and make it easier to add new node types or plugin-specific nodes in the future.

### Steps:

1. **Create/Update the Shared Utility**
   - Implement or update a shared `ensureNode` utility (see example above) that handles upsert logic for all node types, including system nodes.
   - The utility should accept parameters for type, title, parentId, metadata, and any additional content or summaries needed.

2. **Refactor AI Server Node Creation**
   - In the AI server (e.g., `modelPerformanceRAG.service.ts`), replace direct node creation/upsert logic for `ai-server`, `ai-model`, and `model-performance` nodes with calls to `ensureNode`.
   - Remove duplicated upsert logic from individual sync methods and delegate to the shared utility.
   - Pass all required fields (content, summaries, embeddings, etc.) as arguments or options to `ensureNode`.

3. **Maintain Relationship Logic**
   - Keep relationship creation (e.g., linking server, model, and performance nodes) in specialized methods, but ensure all node creation flows through the shared utility.

4. **Test and Validate**
   - Add or update unit tests to cover the new utility and its use in the AI server.
   - Ensure all system nodes are created, updated, and deduplicated as expected.

5. **Document the Pattern**
   - Update this document and relevant module READMEs to reflect the new pattern for system node creation.

---

### Files to Update or Create

**1. Shared Node Utility**
- `backend/src/services/nodeService.ts` (or similar): Implement the generic `ensureNode` utility for all node types (core, plugin, system).

**2. AI Server (System Node Creation)**
- `ai-server/src/services/modelPerformanceRAG.service.ts`: Refactor to use `ensureNode` for `ai-server`, `ai-model`, and `model-performance` nodes.
- `ai-server/src/services/ragNodeService.ts`: Refactor to use the shared utility if node creation/upsert logic exists here.
- `ai-server/src/rag/core/node.ts`: Update to delegate to the shared utility if node creation logic is present.

**3. Text-to-RAG Pipeline**
- `ai-server/src/services/textToRagParser/postChunkingPipeline.ts`
- `ai-server/src/services/textToRagParser/storage/databaseManager.ts`
- `ai-server/src/services/textToRagParser/ai/ollamaService.ts`
- `ai-server/src/services/textToRagParser/index.ts`
- Any other pipeline step files that create or upsert nodes.

**4. Backend RAG Services**
- `backend/src/services/rag-storage-adapter.service.ts`
- `backend/src/services/rag-integration.service.ts`
- `backend/src/services/rag-backend.service.ts`
- `backend/src/adapters/rag-storage.adapter.ts`
- `backend/src/database/rag-database.ts`
- Any other backend service that creates or upserts nodes.

**5. Plugin/Universe Extensibility**
- `ai-server/src/pipeline/pluginRegistry.ts`
- `backend/src/plugins/types/plugin.types.ts`
- Any plugin or universe-specific node creation logic to use the shared utility.

**6. Tests**
- `backend/tests/unit/services/nodeService.test.ts` (new or update)
- `ai-server/tests/services/modelPerformanceRAG.service.test.ts`
- Any test files covering node creation in the pipeline, backend, or plugins.

**7. Documentation**
- `docs/NODE_CREATION_BACKEND_IMPLEMENTATION.md` (already updated)
- Module-level `README.md` files for services or plugins that use node creation.

**8. Barrel Files**
- Any `index.ts` files in affected service directories to export the new/updated utility.

This list covers all major areas where node creation logic should be centralized and updated to use the new pattern, ensuring consistency across the text-to-RAG pipeline, AI server, backend, and plugins.

### 2. Usage in Pipelines, Features, and Plugins

Any backend route, pipeline, or plugin that needs to work with nodes should call this utility at the start:

```ts
const { universeId, bookTitle, chapterTitle, characterName } = req.body.metadata;
const universeNode = await ensureNode({ type: 'universe', title: universeId, metadata: { universeId } });
const bookNode = await ensureNode({ type: 'book', title: bookTitle, parentId: universeNode.id, metadata: { universeId } });
const chapterNode = chapterTitle
  ? await ensureNode({ type: 'chapter', title: chapterTitle, parentId: bookNode.id, metadata: { universeId, bookId: bookNode.id } })
  : null;
const characterNode = characterName
  ? await ensureNode({ type: 'character', title: characterName, parentId: universeNode.id, metadata: { universeId } })
  : null;
// ...proceed with pipeline using these nodes
```

### 3. Node Creation Logic
- **Deduplication:** Always check for existing nodes before creating new ones, for all node types.
- **Relationships:** When creating a node, link it to its parent (e.g., book to universe, chapter to book, character to universe, etc.).
- **Metadata:** Ensure all required metadata (IDs, titles, owner, etc.) is set consistently for every node type.

## Benefits
- **Single Source of Truth:** All node creation logic is in one place.
- **Easier Maintenance:** Changes to node structure or relationships only need to be made in one location.
- **Robustness:** Reduces risk of orphaned or duplicate nodes.

## Example Flow
1. User submits text with universeId, bookTitle, chapterTitle, and (optionally) other node info (character, location, etc.).
2. Backend calls `ensureNode` or a similar utility to get or create all necessary nodes.
3. Pipeline, feature, or plugin proceeds using the returned node IDs.

## Frontend Implications
- The frontend only needs to send the relevant node information (e.g., universeId, bookTitle, chapterTitle, characterName, etc.) in the request metadata.
- No node creation logic is required in the frontend.

## Summary
- Always use a backend utility/service to create or look up all core and plugin node types.
- Call this utility at the start of any pipeline, feature, or plugin that needs these nodes.
- This approach ensures consistency, reusability, extensibility, and maintainability across the codebase.
