
# Text-to-RAG Parser Consistency & Entity Deduplication Plan

## Overview
This document details the requirements, design, and step-by-step plan for robust, scalable, and consistent handling of universe, book, chapter, document, section, and character nodes in the Text-to-RAG parser pipeline. It focuses on in-memory candidate aggregation, deduplication, canonical node structure, section/document relationships, and update handling. Backend API/caching and frontend refactor steps have been removed as they are complete.

---

## 1. Canonical Node Structure & Relationships

All nodes created by the Text-to-RAG parser must adhere to a strict, canonical structure to ensure consistency, integrity, and compatibility with downstream consumers. This includes universe, book, chapter, document, section, and character nodes.


### Canonical Node Types & Required Fields

All core node types must follow a strict, canonical structure. This ensures data integrity, enables reliable querying/filtering, and supports future extensibility. Below are the canonical structures for each node type:

#### Universe Node
```typescript
{
  id: string; // UUID v4 or deterministic hash
  type: 'universe';
  title: string;
  description?: string;
  // ...additional metadata
}
```

#### Book Node
```typescript
{
  id: string;
  type: 'book';
  universeId: string;
  title: string;
  description?: string;
  // ...additional metadata
}
```

#### Chapter Node
```typescript
{
  id: string;
  type: 'chapter';
  universeId: string;
  bookId: string;
  title: string;
  description?: string;
  // ...additional metadata
}
```

#### Document Node
```typescript
{
  id: string;
  type: 'document';
  universeId: string;
  bookId?: string;
  chapterId?: string;
  title: string;
  fullText: string;
  description?: string;
  // ...additional metadata
}
```

#### Section Node
```typescript
{
  id: string;
  type: 'section';
  documentId: string;
  startOffset: number;
  endOffset: number;
  text?: string;
  summary?: string;
  tags?: string[];
  // ...additional metadata
}
```

#### Character Node
```typescript
{
  id: string;
  type: 'character';
  universeId: string;
  title: string;
  aliases?: string[];
  description?: string;
  appearanceBookIds: string[];
  appearanceChapterIds: string[];
  appearanceSectionIds: string[];
  // ...additional metadata
}
```

#### Notes/Comment Node (Unstructured)
```typescript
{
  id: string;
  type: 'note';
  parentId?: string; // Can be attached to any node
  universeId?: string;
  bookId?: string;
  chapterId?: string;
  documentId?: string;
  sectionId?: string;
  author?: string;
  text: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
  tags?: string[];
  // ...additional metadata
}
```

#### Other/Plugin/Experimental Node Types
- For nodes like Faction, Location, Lore, Vessel, TimelineEvent, Relationship, or plugin-provided types, define a canonical structure as soon as they become important for filtering, querying, or UI. Until then, allow more flexibility, but document any experimental schemas in the codebase.

---

#### Example Node Structures

```typescript
// Universe node
{
  id: 'uuid-universe-1',
  type: 'universe',
  title: 'Star Trek',
  // ...metadata
}

// Book node
{
  id: 'uuid-book-1',
  type: 'book',
  universeId: 'uuid-universe-1',
  title: 'The Next Generation',
  // ...metadata
}

// Chapter node
{
  id: 'uuid-chapter-1',
  type: 'chapter',
  universeId: 'uuid-universe-1',
  bookId: 'uuid-book-1',
  title: 'Encounter at Farpoint',
  // ...metadata
}

// Document node
{
  id: 'uuid-document-1',
  type: 'document',
  universeId: 'uuid-universe-1',
  bookId: 'uuid-book-1',
  chapterId: 'uuid-chapter-1',
  title: 'Encounter at Farpoint - Full Text',
  fullText: '...',
  // ...metadata
}

// Section node
{
  id: 'uuid-section-1',
  type: 'section',
  documentId: 'uuid-document-1',
  startOffset: 1200,
  endOffset: 1800,
  text: 'The quick brown fox jumps over the lazy dog.',
  // ...metadata
}

// Character node (universe-level)
{
  id: 'uuid-character-1',
  type: 'character',
  universeId: 'uuid-universe-1',
  title: 'Jean-Luc Picard',
  aliases: ['Picard', 'Captain Picard'],
  appearanceBookIds: ['uuid-book-1', 'uuid-book-2'],
  appearanceChapterIds: ['uuid-chapter-1', 'uuid-chapter-5'],
  appearanceSectionIds: ['uuid-section-1', 'uuid-section-7'],
  // ...metadata
}
```

#### Validation & Edge Cases

- All required fields must be present and valid before persistence.
- Character nodes must be universe-level and reference all appearances via arrays.
- Orphaned nodes (e.g., chapters without a valid parent) must not be persisted.
- IDs must be unique and deterministic if possible.
- Use `section` instead of `chunk` throughout the codebase.

---

## 2. Document & Section Update Handling

When a document node’s `fullText` is updated:

1. **Invalidate and Recompute Sections**
   - Mark all associated section nodes as stale.
   - Re-chunk the new `fullText` to generate new section nodes with updated offsets and text.
   - Remove/archive old section nodes; replace with new ones.
2. **Update Relationships**
   - Update all references (e.g., `appearanceSectionIds` in character nodes) to point to new section IDs.
   - Optionally, re-run entity extraction and appearance mapping.
3. **Section Node Structure**
   - Each section node must include: `id`, `type: 'section'`, `documentId`, `startOffset`, `endOffset`, `text` (optional), and metadata.
4. **Versioning & Audit Trail (Recommended)**
   - Optionally keep previous versions for audit/history.
   - Store update metadata (timestamp, user, reason).
5. **Cache & API Invalidation**
   - Invalidate caches for affected document, sections, and related nodes.
   - Notify clients if using real-time collaboration.
6. **Testing**
   - Add tests to ensure all section nodes and references are correctly regenerated and mapped after updates.

**Summary:**
Always treat the document’s `fullText` as the source of truth. On update, re-chunk, regenerate section nodes, and update all relationships and references to maintain consistency and data integrity.

---

## 3. In-Memory Candidate Aggregation & Deduplication Pipeline

### 3.1. In-Memory Aggregation
- During parsing, character candidates are collected in memory (array or map), not immediately persisted.
- Each candidate includes all available metadata (name, aliases, context, source section, etc.).
- Track source universe/book/chapter for each candidate.

### 3.2. Deduplication & Merging
- After parsing, pass the in-memory candidate list to a deduplication module.
- **Heuristic pass**: Merge candidates with identical/highly similar names or clear alias relationships.
- **AI-powered pass**: Use AI to analyze context, dialogue, and references to cluster candidates (including pronouns and ambiguous references).
- Only after deduplication, persist canonical character nodes.
- Enables future features: user review/approval, plugin enrichment, advanced pronoun/entity linking.

### 3.3. Future: Pronoun & Reference Linking
- Extend AI deduplication to link pronouns and ambiguous references to character nodes using context and co-reference resolution.
- Store these links for downstream tasks (memory, timeline, relationship extraction).

---

## 4. Step-by-Step Refactor Plan

### Step 1: Preparation & Baseline

**Checklist: Files to Update or Create**

- [ ] `ai-server/src/services/textToRagParser/core/parserEngine.ts` (main parser pipeline, in-memory candidate aggregation)
- [ ] `ai-server/src/services/textToRagParser/parsers/primaryParser.ts` (entity extraction, node creation validation)
- [ ] `ai-server/src/services/textToRagParser/core/entityTypes.ts` (entity type definitions and registry)
- [ ] `ai-server/src/services/textToRagParser/utils/textChunker.ts` (chunking logic, ensure entity boundaries)
- [ ] `ai-server/src/services/characterService.ts` (deduplication, upsert logic, AI-powered merging)
- [ ] `ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts` (AI-powered deduplication helpers, new or update)
- [ ] `ai-server/src/repositories/ragNodeRepository.ts` (node storage, retrieval, cache invalidation)
- [ ] `ai-server/src/models/Universe.ts` (model definition)
- [ ] `ai-server/src/models/Book.ts` (model definition)
- [ ] `ai-server/src/models/Chapter.ts` (model definition)
- [ ] `ai-server/src/models/Character.ts` (model definition)
- [ ] `ai-server/src/routes/characterRoutes.ts` (character API endpoint)
- [ ] `ai-server/src/infrastructure/cache/cacheProvider.ts` (in-memory/distributed cache logic)
- [ ] `ai-server/src/api/swagger.yaml` (API documentation)
- [ ] `ai-server/src/services/textToRagParser/core/parserEngine.test.ts` (unit/integration tests)
- [ ] `ai-server/src/services/characterService.test.ts` (unit/integration tests)
- [ ] `ai-server/src/routes/characterRoutes.test.ts` (API tests)
- [ ] `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md` (architecture documentation)
- [ ] `docs/DECISION_LOG.md` (decision log)
- [ ] `ai-server/src/api/swagger.yaml` (API documentation)

Review and document all locations where character nodes are created or persisted in these files before proceeding with code changes.


### Step 2: In-Memory Candidate Aggregation

**Checklist: Files to Create/Update**

- [ ] `ai-server/src/services/textToRagParser/core/parserEngine.ts`  
  Refactor the main parser pipeline to aggregate character candidates in memory (array or map) during parsing, not immediately persisting. Design the aggregation system to be extensible for other entity types (e.g., location, item, lore) in the future if deduplication or review is needed.
- [ ] `ai-server/src/services/textToRagParser/parsers/primaryParser.ts`  
  Update entity extraction logic to collect all available metadata and source references for each candidate. Ensure the logic is compatible with future extensibility for other entity types.
- [ ] `ai-server/src/services/textToRagParser/core/entityTypes.ts`  
  Update or add types/interfaces for in-memory candidate aggregation, ensuring all metadata and references are included. Make types generic or extensible for future entity types.
- [ ] `ai-server/src/services/textToRagParser/utils/textChunker.ts`  
  Ensure chunking/sectioning logic does not break entity boundaries and supports accurate source referencing for candidates.
- [ ] `ai-server/src/services/textToRagParser/core/parserEngine.test.ts`  
  Add or update unit/integration tests to verify in-memory candidate aggregation, metadata completeness, and correct referencing. Include tests for extensibility (e.g., mock another entity type).
- [ ] `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`  
  Update architecture documentation to reflect the new in-memory aggregation step, its extensibility for other entity types, and any changes to the parser pipeline.
- [ ] `docs/DECISION_LOG.md`  
  Record the rationale, approach, and any architectural decisions made during this step, including the extensibility of the in-memory aggregation system.

**Summary:**
Refactor the parser to collect character candidates in memory during parsing, ensure each candidate includes all available metadata and source references, and update types/interfaces as needed. Design the aggregation system to be extensible for other entity types in the future. Update the above files to implement and document these changes.

**Summary:**
Refactor the parser to collect character candidates in memory during parsing, ensure each candidate includes all available metadata and source references, and update types/interfaces as needed. Update the above files to implement and document these changes.

### Step 3: AI-Assisted Deduplication & Merging

**Files to Update or Create:**

- `ai-server/src/services/characterService.ts`  
  Implement two-stage deduplication (heuristic, then AI-powered) and upsert logic for canonical character nodes.
- `ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts` (new or update)  
  AI-powered deduplication helpers, context analysis, clustering, and pronoun/ambiguous reference resolution.
- `ai-server/src/services/textToRagParser/core/entityTypes.ts`  
  Update types/interfaces to support deduplication pipeline and candidate metadata.
- `ai-server/src/services/textToRagParser/core/parserEngine.ts`  
  Integrate deduplication step after in-memory candidate aggregation.
- `ai-server/src/services/textToRagParser/parsers/primaryParser.ts`  
  Ensure entity extraction logic is compatible with deduplication pipeline.
- `ai-server/src/repositories/ragNodeRepository.ts`  
  Update logic for canonical node creation after deduplication.
- `ai-server/src/models/Character.ts`  
  Ensure model supports all required fields for deduplication and canonical node structure.
- `ai-server/src/routes/characterRoutes.ts`  
  Update endpoints if needed to support deduplication status, review, or batch upsert.
- `ai-server/src/infrastructure/cache/cacheProvider.ts`  
  Ensure cache invalidation logic supports deduplication and canonical node updates.
- `ai-server/src/services/characterService.test.ts`  
  Add/extend unit and integration tests for heuristic and AI-powered deduplication, and canonical node creation.
- `ai-server/src/services/textToRagParser/core/parserEngine.test.ts`  
  Add/extend tests to verify deduplication integration in the parser pipeline.
- `ai-server/src/routes/characterRoutes.test.ts`  
  Add/extend API tests for deduplication-related endpoints and round-trip validation.
- `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`  
  Document the deduplication pipeline, service boundaries, and extensibility.
- `docs/DECISION_LOG.md`  
  Record rationale, approach, and architectural decisions for the deduplication system.
- `ai-server/src/api/swagger.yaml`  
  Update API documentation for any new/changed endpoints related to deduplication.

_(Optional)_
- `ai-server/src/services/textToRagParser/utils/contextAnalysisHelper.ts` (if needed)  
  For advanced context/pronoun resolution logic.

**Summary:**
- Implement two-stage deduplication (heuristic, then AI-powered) in `characterService`.
- Optionally, add helpers for AI-powered deduplication.

### Step 4: Canonical Node Creation via Service

**Detailed List of Files to Update or Create:**

- **`ai-server/src/services/characterService.ts`**  
  - Implement logic to persist canonical character nodes after deduplication.
  - Add/extend validation to ensure all required fields are present before persistence.
  - Expose an upsert method for canonical nodes.

- **`ai-server/src/repositories/ragNodeRepository.ts`**  
  - Update logic to support canonical node creation and validation.
  - Ensure repository methods enforce canonical structure and relationships.

- **`ai-server/src/models/Character.ts`**  
  - Ensure the model matches the canonical structure (all required fields, correct types).
  - Add/extend validation logic if not already present.

- **`ai-server/src/routes/characterRoutes.ts`**  
  - Update endpoints to use the new service logic for canonical node creation.
  - Add/extend validation and error handling for required fields.

- **`ai-server/src/services/characterService.test.ts`**  
  - Add/extend unit and integration tests for canonical node creation, validation, and persistence.

- **`ai-server/src/routes/characterRoutes.test.ts`**  
  - Add/extend API tests to verify canonical node creation and validation via endpoints.

- **`ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`**  
  - Document the updated service and repository boundaries for canonical node creation.

- **`docs/DECISION_LOG.md`**  
  - Record the rationale, approach, and any architectural decisions made for this step.

- **`ai-server/src/api/swagger.yaml`**  
  - Update API documentation to reflect any changes to endpoints, request/response schemas, and validation requirements.

**(Optional, as needed):**
- Any helper modules for validation or persistence.

All changes must be tracked in the decision log and progress documentation as per project guidelines.

### Step 5: Parser Consistency & Validation
- Validate that all created nodes conform to canonical structure.
- Prevent duplicate or orphaned nodes.
- Ensure chunking/sectioning does not break entity boundaries.

### Step 6: Testing & Verification
- Add/extend unit and integration tests for:
  - In-memory candidate aggregation
  - Deduplication logic (heuristic and AI-powered)
  - Service-based node creation
  - API round-trip: parse text → deduplicate → create nodes → fetch via API → verify structure
- Achieve at least 80% test coverage for all new/changed modules.

### Step 7: Documentation & Architecture Updates
- Update this document and `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md` to reflect the new pipeline and service boundaries.
- Document deduplication and AI-assistance approach in `docs/DECISION_LOG.md`.
- Update API documentation and relevant frontend usage notes.

### Step 8: Future Enhancements
- Plan for user review/approval of deduplication results.
- Extend AI-powered linking to handle pronouns, ambiguous references, and relationship extraction.
- Support plugin-based enrichment and validation for universe-specific rules.

---

## 5. Detailed List of Files to Update

**Core Parser & Entity Extraction:**
- `ai-server/src/services/textToRagParser/core/parserEngine.ts`
- `ai-server/src/services/textToRagParser/parsers/primaryParser.ts`
- `ai-server/src/services/textToRagParser/core/entityTypes.ts`
- `ai-server/src/services/textToRagParser/utils/textChunker.ts`

**Character Deduplication & Service Layer:**
- `ai-server/src/services/characterService.ts`
- `ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts` (new or update)

**Persistence & Repository:**
- `ai-server/src/repositories/ragNodeRepository.ts`

**Model Definitions:**
- `ai-server/src/models/Universe.ts`
- `ai-server/src/models/Book.ts`
- `ai-server/src/models/Chapter.ts`
- `ai-server/src/models/Character.ts`

**API & Caching:**
- `ai-server/src/routes/characterRoutes.ts`
- `ai-server/src/infrastructure/cache/cacheProvider.ts`
- `ai-server/src/api/swagger.yaml`

**Testing:**
- `ai-server/src/services/textToRagParser/core/parserEngine.test.ts`
- `ai-server/src/services/characterService.test.ts`
- `ai-server/src/routes/characterRoutes.test.ts`

**Documentation:**
- `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`
- `docs/DECISION_LOG.md`
- `ai-server/src/api/swagger.yaml`

**(Optional):**
- Any helper modules for context analysis, pronoun linking, or plugin-based enrichment

---

## 6. Implementation Checklist

- [ ] Refactor text-to-RAG parser for in-memory candidate aggregation
- [ ] Implement AI-powered deduplication and canonical node creation
- [ ] Enforce node type/id/parent consistency
- [ ] Add/extend tests for node creation and API round-trip
- [ ] Update all relevant documentation

---

## 7. References
- `docs/archive/TEXT_TO_RAG_BACKEND_MIGRATION_PLAN.md`
- `docs/archive/UNIVERSAL_AI_FRAMEWORK_IMPLEMENTATION_CHECKLIST.md`
- `ai-server/src/services/textToRagParser/core/parserEngine.ts`
- `backend/src/services/rag-integration.service.ts`

---

**All changes must be tracked in the decision log and progress documentation.**

All universe, book, chapter, and character nodes created by the Text-to-RAG parser **must** adhere to the following requirements to ensure consistency, integrity, and compatibility with the backend API and frontend consumers. Character nodes should be universe-level entities, not tied to a single book or chapter, and should reference their appearances via arrays of IDs. Additionally, chunk output naming and document-level context are addressed below.

- **Canonical Type:**
  - Each node must have a canonical `type` property, set to one of: `'universe'`, `'book'`, `'chapter'`, or `'character'`.
  - The `type` property must be a string and match the expected value for the node's entity.


- **Parent/Relationship Fields:**
  - Nodes must include the appropriate parent/relationship fields:
    - `universeId` for all nodes (except universes themselves)
    - `bookId` for books and chapters (if applicable)
    - `chapterId` for chapters (if applicable)
  - For **character nodes**:
    - Only `universeId` is required.
    - Add `appearanceBookIds: string[]` and `appearanceChapterIds: string[]` to track all books/chapters where the character appears.
    - Add `appearanceSectionIds: string[]` (see below for naming) to track all outputted text sections/chunks where the character is referenced.
  - These fields must reference valid, existing parent or related node IDs.

- **ID Generation:**
  - All nodes must have a unique `id` field.
  - IDs should be generated using a consistent strategy (UUID v4 or deterministic hash based on content and parent IDs).
  - The same input should always produce the same ID if deterministic generation is used.


- **Title and Metadata:**
  - Each node must include a `title` property (string) representing its canonical name/title.
  - Additional metadata fields (e.g., `aliases`, `description`, `context`, `sectionRefs`) should be included as available and relevant.
  - **Chunk/Section Naming:**
    - Replace the term `chunk` with `section` throughout the codebase and output, for clarity and extensibility (e.g., `sectionId`, `sectionRefs`, `appearanceSectionIds`).
    - Each outputted text section should have a unique `sectionId` and be referenced by nodes as needed.

- **Validation:**
  - The parser **must not** create or persist nodes with missing or inconsistent `type`, `id`, or required parent fields.
  - Nodes failing validation should be logged and excluded from persistence.


- **Example Node Structure:**

```typescript
// Universe node
{
  id: 'uuid-universe-1',
  type: 'universe',
  title: 'Star Trek',
  // ...additional metadata
}

// Book node
{
  id: 'uuid-book-1',
  type: 'book',
  universeId: 'uuid-universe-1',
  title: 'The Next Generation',
  // ...additional metadata
}

// Chapter node
{
  id: 'uuid-chapter-1',
  type: 'chapter',
  universeId: 'uuid-universe-1',
  bookId: 'uuid-book-1',
  title: 'Encounter at Farpoint',
  // ...additional metadata
}

// Character node (universe-level, agnostic to book/chapter)
{
  id: 'uuid-character-1',
  type: 'character',
  universeId: 'uuid-universe-1',
  title: 'Jean-Luc Picard',
  aliases: ['Picard', 'Captain Picard'],
  appearanceBookIds: ['uuid-book-1', 'uuid-book-2'],
  appearanceChapterIds: ['uuid-chapter-1', 'uuid-chapter-5'],
  appearanceSectionIds: ['uuid-section-1', 'uuid-section-7'],
  // ...additional metadata
}
```


- **Edge Cases:**
  - If a character appears in multiple books/chapters/sections, ensure the node structure supports cross-references via `appearanceBookIds`, `appearanceChapterIds`, and `appearanceSectionIds`.
  - If a node cannot be assigned a valid parent (e.g., orphaned chapter), it must not be persisted.
  - All IDs and types must be validated before persistence.



These requirements must be enforced in both the parser logic and the service layer responsible for node creation and persistence.

---

### Handling Document Text Updates and Section Relationships

When the `fullText` of a document node is updated, the following process must be followed to maintain consistency and integrity across all related nodes:

1. **Invalidate and Recompute Sections:**
   - Detect when the `fullText` property of a document node changes.
   - Mark all associated section nodes (those with `documentId` referencing this document) as stale.
   - Re-run the sectioning/chunking process on the new `fullText` to generate new section nodes with updated `startOffset`, `endOffset`, and `text` fields.
   - Remove or archive the old section nodes and replace them with the new ones.

2. **Update Relationships:**
   - For all nodes that reference section IDs (e.g., character nodes’ `appearanceSectionIds`), update these arrays to point to the new section IDs that correspond to the updated text.
   - Optionally, re-run entity extraction and appearance mapping to ensure character/section relationships are still valid in the new text.

3. **Section Node Structure:**
   - Each section node should include:
     - `id` (e.g., `sectionId`)
     - `type: 'section'`
     - `documentId`: The parent document node’s ID
     - `startOffset`: The character index in the full document text where this section begins
     - `endOffset`: The character index where this section ends (exclusive)
     - `text`: The actual text content of the section (optional, but useful for direct access)
     - Any additional metadata (e.g., summary, tags, etc.)

   **Example:**
   ```typescript
   {
     id: 'uuid-section-1',
     type: 'section',
     documentId: 'uuid-document-1',
     startOffset: 1200,
     endOffset: 1800,
     text: 'The quick brown fox jumps over the lazy dog.',
     // ...additional metadata
   }
   ```

4. **Versioning and Audit Trail (Recommended):**
   - Optionally, keep previous versions of the document and its sections for audit/history.
   - Store metadata about the update (timestamp, user, reason) for traceability.

5. **Cache and API Invalidation:**
   - Invalidate any in-memory or distributed caches for the affected document, sections, and related nodes.
   - If using real-time collaboration or live UIs, notify clients that the document and its sections have changed.

6. **Testing:**
   - Add tests to ensure that after a document update:
     - All section nodes are regenerated and correctly mapped.
     - All references (e.g., in character nodes) are updated.
     - No stale or orphaned section references remain.

**Summary:**
Always treat the document’s `fullText` as the source of truth. On update, re-chunk, regenerate section nodes, and update all relationships and references to maintain consistency and data integrity.

---

### Additional Processing Step: Document-Level Node

Before chunking/sectioning the document, the entirety of the input document should be added as a dedicated node (e.g., `type: 'document'`). This node should include:

- `id`: Unique document ID
- `type: 'document'`
- `universeId` (and `bookId`/`chapterId` if applicable)
- `title`: Document title or filename
- `fullText`: The complete, unchunked text of the document
- Any relevant metadata (e.g., source, import date)

This enables full-document context for downstream processing, search, and reference. All section nodes should reference their parent document node via `documentId`.

### 3.2. Character Deduplication Pipeline
- When parsing text, extracted character candidates should be held in memory (not immediately persisted).
- After parsing, run a deduplication/merging process:
  - Use heuristics (name similarity, context, aliases) and AI-powered entity resolution to merge likely duplicates.
  - Optionally, use AI to analyze context (dialogue, pronouns, relationships) to cluster references (e.g., "He", "She", "the captain") to canonical character nodes.
- Only after deduplication, call the `characterService` to create or update canonical character nodes in the database.
- This enables future features like user review/approval, plugin enrichment, and advanced pronoun/entity linking.

### 3.3. Future: Pronoun & Reference Linking
- Extend the AI deduplication step to:
  - Link every pronoun ("he", "she", "they", etc.) and ambiguous reference to a character node, using context and co-reference resolution.
  - Store these links for downstream tasks (e.g., memory, timeline, relationship extraction).

### 3.4. Parser Code Changes
- `ai-server/src/services/textToRagParser/core/parserEngine.ts`: Refactor to hold character candidates in memory, deduplicate, then persist via service.
- `ai-server/src/services/textToRagParser/parsers/primaryParser.ts`: Validate entity extraction and candidate creation.
- `ai-server/src/services/textToRagParser/core/entityTypes.ts`: Update/validate entity type registry.
- `ai-server/src/services/textToRagParser/utils/textChunker.ts`: Ensure chunking does not break entity boundaries.
- `ai-server/src/services/characterService.ts`: Add deduplication and upsert logic.

### 3.5. Testing
- Add/extend tests to verify that text-to-RAG always produces nodes with correct type/id/parent fields.
- Test round-trip: parse text → deduplicate → create nodes → fetch via new API → verify structure.
- Add tests for AI-powered deduplication and pronoun/reference linking.

---

## 4. Documentation & Tracking

- Update `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md` with new API/caching layers
- Update `MODULAR_DIRECTORY_STRUCTURE.md` if new files/dirs are added
- Update `docs/DECISION_LOG.md` with rationale for backend-cached endpoints
- Update `docs/PROGRESS.md` upon completion
- Update `backend/api/swagger.yaml` for new endpoints
- Update `ai-server/web/src/features/rag-dashboard/README.md` for new filter bar logic

---

## 5. Additional Caching Opportunities

---

## Step-by-Step Refactor Plan: Text-to-RAG Parser Pipeline & Character Deduplication

This section provides a concrete, step-by-step plan for refactoring the text-to-RAG parser pipeline to support in-memory character candidate aggregation, AI-powered deduplication, and service-based persistence, ensuring full consistency with the new backend API and caching layers.


### Step 1: Preparation & Baseline
- Review the current parser pipeline in `ai-server/src/services/textToRagParser/core/parserEngine.ts` and `ai-server/src/services/textToRagParser/parsers/primaryParser.ts`.
- Identify all locations where character nodes are created or persisted.
- Ensure all relevant types are defined in `ai-server/src/services/textToRagParser/core/entityTypes.ts`.
- Review utility and helper modules used for text chunking and entity extraction, such as `ai-server/src/services/textToRagParser/utils/textChunker.ts`.
- Review the character service logic in `ai-server/src/services/characterService.ts` for deduplication and persistence.
- Review the RAG node repository in `ai-server/src/repositories/ragNodeRepository.ts` for node storage and retrieval.
- Review model definitions for Universe, Book, Chapter, and Character in `ai-server/src/models/Universe.ts`, `ai-server/src/models/Book.ts`, `ai-server/src/models/Chapter.ts`, and `ai-server/src/models/Character.ts`.
- Review cache provider logic in `ai-server/src/infrastructure/cache/cacheProvider.ts` if parser interacts with cache.


### Step 2: In-Memory Candidate Aggregation
- Refactor `ai-server/src/services/textToRagParser/core/parserEngine.ts` and `ai-server/src/services/textToRagParser/parsers/primaryParser.ts` so that character candidates are collected in an in-memory array or map during parsing, rather than being immediately persisted to the database.
- Ensure each candidate includes all available metadata (name, aliases, context, source chunk, etc.).
- Track the source universe/book/chapter for each candidate.
- Update or add types/interfaces in `ai-server/src/services/textToRagParser/core/entityTypes.ts` as needed.


### Step 3: AI-Assisted Deduplication & Merging
- After parsing, pass the in-memory candidate list to a new deduplication module in `ai-server/src/services/characterService.ts`.
- Implement a two-stage deduplication:
  1. **Heuristic pass**: Merge candidates with identical or highly similar names, or clear alias relationships.
  2. **AI-powered pass**: Use an AI model to analyze context, dialogue, and references to cluster candidates that are likely the same character (including pronouns and ambiguous references).
- Optionally, expose this step for user review/approval in the future.
- Update or add helper modules for AI-powered deduplication if needed (e.g., `ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts`).


### Step 4: Canonical Node Creation via Service
- After deduplication, call `characterService.upsertCharacters()` in `ai-server/src/services/characterService.ts` to persist canonical character nodes to the database.
- Ensure each node has correct `type`, `id`, and parent fields (`universeId`, `bookId`, `chapterId`).
- Only persist nodes that pass validation (no missing or inconsistent fields).
- Update `ai-server/src/repositories/ragNodeRepository.ts` as needed to support new node creation logic.


### Step 5: Integration with Backend API & Caching
- Ensure that all new/updated character nodes are available via the new `/api/characters` endpoint in `ai-server/src/routes/characterRoutes.ts`.
- Invalidate or update the backend cache as needed when nodes are created/updated (see `ai-server/src/infrastructure/cache/cacheProvider.ts`).
- Update `ai-server/src/repositories/ragNodeRepository.ts` to support efficient queries and cache invalidation.
- Update or add API documentation in `ai-server/src/api/swagger.yaml`.


### Step 6: Parser Consistency & Validation
- Update `ai-server/src/services/textToRagParser/parsers/primaryParser.ts` to validate that all created nodes conform to the canonical structure.
- Add checks to prevent duplicate or orphaned nodes.
- Update `ai-server/src/services/textToRagParser/utils/textChunker.ts` to ensure chunking does not break entity boundaries.


### Step 7: Testing & Verification
- Add/extend unit and integration tests for:
  - In-memory candidate aggregation (`ai-server/src/services/textToRagParser/core/parserEngine.test.ts`)
  - Deduplication logic (heuristic and AI-powered) (`ai-server/src/services/characterService.test.ts`)
  - Service-based node creation (`ai-server/src/services/characterService.test.ts`)
  - API round-trip: parse text → deduplicate → create nodes → fetch via API → verify structure (`ai-server/src/routes/characterRoutes.test.ts`)
- Achieve at least 80% test coverage for all new/changed modules.


### Step 8: Documentation & Architecture Updates
- Update this document and `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md` to reflect the new pipeline and service boundaries.
- Document the deduplication and AI-assistance approach in `docs/DECISION_LOG.md`.
- Update API documentation in `ai-server/src/api/swagger.yaml` and relevant frontend usage notes.

### Step 9: Future Enhancements
- Plan for user review/approval of deduplication results.
- Extend AI-powered linking to handle pronouns, ambiguous references, and relationship extraction.
- Support plugin-based enrichment and validation for universe-specific rules.
- Characters (if used in filter bar or frequently queried)
- Factions, Locations, Lore, Vessels (if used in similar UIs)
- Plugin-provided node types (if universes are extended via plugins)
- User permissions/roles (if access control is complex)
- User permissions/roles (if access control is complex)
---
## Detailed List of Files to Update for Text-to-RAG Parser Refactor

The following files will need to be updated or reviewed as part of the Text-to-RAG parser consistency and character deduplication refactor:

**Core Parser & Entity Extraction:**
- `ai-server/src/services/textToRagParser/core/parserEngine.ts` — Main parser pipeline, in-memory candidate aggregation
- `ai-server/src/services/textToRagParser/parsers/primaryParser.ts` — Entity extraction, node creation validation
- `ai-server/src/services/textToRagParser/core/entityTypes.ts` — Entity type definitions and registry
- `ai-server/src/services/textToRagParser/utils/textChunker.ts` — Chunking logic, ensure entity boundaries

**Character Deduplication & Service Layer:**
- `ai-server/src/services/characterService.ts` — Deduplication, upsert logic, AI-powered merging
- `ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts` (new or update) — AI-powered deduplication helpers

**Persistence & Repository:**
- `ai-server/src/repositories/ragNodeRepository.ts` — Node storage, retrieval, cache invalidation

**Model Definitions:**
- `ai-server/src/models/Universe.ts`
- `ai-server/src/models/Book.ts`
- `ai-server/src/models/Chapter.ts`
- `ai-server/src/models/Character.ts`

**API & Caching:**
- `ai-server/src/routes/characterRoutes.ts` — Character API endpoint
- `ai-server/src/infrastructure/cache/cacheProvider.ts` — In-memory/distributed cache logic
- `ai-server/src/api/swagger.yaml` — API documentation

**Testing:**
- `ai-server/src/services/textToRagParser/core/parserEngine.test.ts`
- `ai-server/src/services/characterService.test.ts`
- `ai-server/src/routes/characterRoutes.test.ts`

**Documentation:**
- `ai-server/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`
- `docs/DECISION_LOG.md`
- `ai-server/src/api/swagger.yaml`

**(Optional, as needed):**
- Any helper modules for context analysis, pronoun linking, or plugin-based enrichment

**Note:**
All changes must be tracked in the decision log and progress documentation as per project guidelines.

## 6. Implementation Checklist

- [ ] Implement backend API endpoints for universes/books/chapters
- [ ] Add in-memory caching with invalidation
- [ ] Refactor frontend service and filter bar to use new endpoints
- [ ] Update text-to-RAG parser to enforce node type/id/parent consistency
- [ ] Add/extend tests for node creation and API round-trip
- [ ] Update all relevant documentation

---

## 7. References
- `docs/archive/TEXT_TO_RAG_BACKEND_MIGRATION_PLAN.md`
- `docs/archive/UNIVERSAL_AI_FRAMEWORK_IMPLEMENTATION_CHECKLIST.md`
- `ai-server/src/services/textToRagParser/core/parserEngine.ts`
- `backend/src/services/rag-integration.service.ts`

---

**All changes must be tracked in the decision log and progress documentation.**
