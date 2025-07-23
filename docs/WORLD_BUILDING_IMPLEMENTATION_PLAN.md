# Universe Book Writer: Enhanced Worldbuilding Implementation Plan

## Objective

Expand the dev frontend and ai-server to support rich, linked worldbuilding nodes for Universe, Book, and Chapter, with advanced metadata, content, and cross-node linkage. Enable AI-powered retrieval, editing, and semantic search.

---

## 1. Shared Types Expansion

**Location:** `shared/types/nodeTypes.ts`

**Migration Implementation Plan (ai-server/src and ai-server/web/src only):**

1. **Expand Shared Types**
   - In `shared/types/nodeTypes.ts`, expand the `Universe`, `Book`, and `Chapter` interfaces to include all required metadata, content, and linkage fields (e.g., genres, themes, magic_system, technology_level, timeline, embeddings, etc.).
   - Add new interfaces for all node types to be supported: `Character`, `Location`, `Item`, `Lore`, `Species`, `Faction`, `TimelineEvent`, etc. Ensure each type is strictly typed and documented with JSDoc, including usage examples and edge cases.
   - Update the `NodeType` union to include all new node types.
   - Add/expand shared types for node relationships, metadata, and content as needed for cross-node linkage and semantic features.

2. **Update ai-server/src Imports and Usages**
   - Search all files in `ai-server/src` for imports of node types (e.g., `Universe`, `Book`, `Chapter`, `Character`, etc.) from local model/type files.
   - Replace these imports with imports from `shared/types/nodeTypes.ts`.
   - Update all function signatures, type annotations, and usages to use the shared types.
   - Remove any duplicate or legacy type definitions in `ai-server/src/models/` that are now covered by shared types.
   - Refactor repository, service, pipeline, and controller logic to use the expanded shared types for all node operations.
   - Ensure all CRUD, linkage, and semantic operations use the new shared types.

3. **Update ai-server/web/src Imports and Usages**
   - Search all files in `ai-server/web/src` for imports of node types from local type files.
   - Replace these imports with imports from `shared/types/nodeTypes.ts`.
   - Update all usages, props, and function signatures to use the shared types for node data.
   - Remove any duplicate or legacy type definitions in `ai-server/web/src` that are now covered by shared types.

4. **Testing and Validation**
   - Run all unit and integration tests in `ai-server/src` and `ai-server/web/src` to ensure compatibility and correctness after migration.
   - Add/expand tests for new node types and edge cases.

5. **Documentation**
   - Document all new and updated shared types with JSDoc in `shared/types/nodeTypes.ts`.
   - Update module-level README files in `shared/types/`, `ai-server/src/models/`, and any affected areas to reflect the migration and provide usage examples.
   - Note any architectural decisions or migration notes in `docs/DECISION_LOG.md`.

## 2. Backend Model & Repository Updates
- **Location:** `ai-server/src/models/`, `ai-server/src/repositories/`
- **Action:**
  - Update MongoDB schema and repository logic to persist and retrieve all new fields.
  - Ensure CRUD operations for universes, books, chapters, and linked entities.
  - Add endpoints for cross-node queries and linkage (e.g., chapters to characters, books to universes).
  - Support semantic vector storage for AI retrieval.

## 3. REST API Enhancements
- **Location:** `ai-server/src/routes/`, `ai-server/src/services/`
- **Action:**
  - Expand API endpoints to accept and return the full node structures.
  - Add endpoints for linked entities and semantic search.
  - Document all endpoints in OpenAPI/Swagger, including request/response examples.

## 4. Frontend Dashboard & UI
- **Location:** `ai-server/web/src/components/Dashboard.tsx`
- **Action:**
  - Update dashboard to support creation and editing of all new fields for universes, books, chapters.
  - Add forms for metadata, content, and linkage (e.g., select species, add timeline events, link chapters to characters).
  - Display summaries, links, and allow navigation between nodes.
  - Integrate semantic search and AI-powered suggestions.

## 5. Linkage & Embeddings
- **Location:** Shared types, backend, frontend
- **Action:**
  - Store and display links between nodes (e.g., chapters to characters, books to universes).
  - Add fields for semantic vectors and tags for AI retrieval.
  - Show related entities and allow navigation (e.g., click a species to view details).

## 6. AI Integration
- **Location:** `ai-server/`, shared types
- **Action:**
  - Expose endpoints for embedding generation and similarity search.
  - Allow the frontend to trigger AI-powered suggestions, completions, or rewrites using the semantic vectors and linked data.

## 7. Documentation & Examples
- **Location:** All relevant modules
- **Action:**
  - Update JSDoc and README files for all new types and endpoints.
  - Provide example payloads and UI screenshots for each node type.
  - Document cross-node linkage and retrieval strategies.

---

## Milestones & Sequence
1. Expand shared types and document all new fields.
2. Update backend models, repositories, and API endpoints.
3. Refactor frontend dashboard to support new node structures and linkage.
4. Implement linkage and semantic vector storage.
5. Integrate AI-powered retrieval and editing features.
6. Update documentation and provide usage examples.

---

## Notes
- All changes must be unit tested and documented.
- Maintain strict typing and zero duplication across layers.
- Ensure all new endpoints are covered in OpenAPI/Swagger docs.
- Update architectural diagrams and README files after major changes.

---

## References
- See requirements in user prompt above.
- Existing code in `shared/types/nodeTypes.ts`, `ai-server/src/models/`, `ai-server/web/src/components/Dashboard.tsx`.
- For API standards, see `backend/docs/API_DOCUMENTATION.md`.

---

_Last updated: July 22, 2025_
