# Backend Implementation Plan: Canonical File Storage, Chunk Diffing, Versioning, Rollback, and Migration

## Overview
This document details the step-by-step plan to replace all stub logic in the backend for canonical file storage, chunk diffing, versioning, rollback, and migration, as required by the RAGTab dashboard modularization plan.

---

## 1. File Storage & Versioning (`fileStorage.ts`)
### Goals
- Store uploaded files in `/data/book-text/` with versioned metadata.
- List all versions for a file, including metadata.
- Retrieve file buffer for a specific version.
- Rollback a file to a previous version (copy/restore).
- Migrate file content (apply migration data to a version).

### Steps
1. **Directory Structure**: Ensure `/data/book-text/{fileId}/` exists for each file.
2. **Versioning**: On upload, save file as `{versionId}-{originalName}` and record metadata (timestamp, size, etc.) in a JSON index per file.
3. **Retrieval**: Implement lookup for all versions and for a specific version's buffer.
4. **Rollback**: Copy/restore a previous version as the new latest version, update metadata.
5. **Migration**: Apply migration data (e.g., chunk parentage changes) and record as a new version.
6. **Atomicity**: Ensure all file and metadata operations are atomic and recoverable.

---

## 2. Chunking Logic (`chunking.ts`)
### Goals
- Chunk text into paragraphs, sentences, or custom units.
- Support stable chunk IDs for unchanged text (hash-based or content-defined chunking).
- Allow partial re-chunking on file edits.
- Integrate with diff and file storage modules.

### Steps
1. **Stable IDs**: Use a hash (e.g., SHA-1) of chunk content as the chunk ID.
2. **Chunking Modes**: Support paragraph, sentence, and custom block chunking.
3. **Partial Re-chunking**: On file edit, only re-chunk changed regions, preserving IDs for unchanged chunks.
4. **API**: Expose chunking as a utility for use by diff and ingestion workflows.

---

## 3. Chunk Diffing (`chunkDiff.ts`)
### Goals
- Compute diffs between two file versions (by chunk).
- Identify added, removed, changed, and unchanged chunks.
- Prepare update instructions for the RAG node graph.

### Steps
1. **Diff Algorithm**: Implement Myers or LCS diff for chunk arrays (by ID or content).
2. **Classification**: Mark chunks as added, removed, changed, or unchanged.
3. **Update Instructions**: Output instructions for node graph updates (add, remove, update, keep).
4. **Integration**: Use chunking utility to get chunk arrays for both versions.

---

## 4. Service Layer (`ragNodeService.ts`)
### Goals
- Wire up to real file storage, chunking, and diffing logic.
- Expose robust APIs for frontend integration.

### Steps
1. **getFileVersions**: Use `fileStorage.getFileVersions`.
2. **getFileDiffPreview**: Use `chunkDiff.diffChunks` on previous and new version.
3. **getFileDiffBetweenVersions**: Use `chunkDiff.diffChunks` on any two versions.
4. **rollbackFileToVersion**: Use `fileStorage.rollbackToVersion` and update node graph as needed.
5. **migrateFileVersion**: Use `fileStorage.migrateFileVersion` and update relationships/metadata.
6. **Chunk Update Workflow**: On file update, run diff, re-chunk changed regions, update node graph.

---

## 5. Controller Layer (`ragTextController.ts`)
### Goals
- Connect controller endpoints to real service/utilities.
- Ensure correct request/response handling and error management.

### Steps
1. **GET /api/rag/files/versions/:fileId**: Call `ragNodeService.getFileVersions`.
2. **GET /api/rag/files/diff-preview/:versionId**: Call `ragNodeService.getFileDiffPreview`.
3. **GET /api/rag/files/diff/:versionA/:versionB**: Call `ragNodeService.getFileDiffBetweenVersions`.
4. **POST /api/rag/files/rollback/:versionId**: Call `ragNodeService.rollbackFileToVersion`.
5. **POST /api/rag/files/migrate/:versionId**: Call `ragNodeService.migrateFileVersion`.
6. **POST /api/rag/files/upload**: Store file, chunk, diff, and update node graph.

---

## 6. Types & Metadata (`types.ts`)
### Goals
- Update types for file/chunk versioning and metadata.

### Steps
1. **FileVersionMeta**: Add fields for parentage, provenance, and migration.
2. **ChunkMeta**: Add stable ID, parent file/chapter/book, and version info.
3. **Relationship Types**: Support chunk→chapter, chunk→book, etc.

---

## 7. Testing & Documentation
- Add unit/integration tests for all new logic.
- Update backend README and OpenAPI docs.
- Document all new endpoints and workflows.

---

## 8. Migration & Rollback Workflows
- Implement book-to-chapter migration as described in the modularization plan.
- Ensure all changes are versioned and traceable.

---

## 9. Timeline & Milestones
1. Implement file storage/versioning (1-2 days)
2. Implement chunking with stable IDs (1 day)
3. Implement chunk diffing (1 day)
4. Integrate service/controller layers (1 day)
5. Update types and metadata (0.5 day)
6. Add tests and docs (1 day)
7. Final review and polish (0.5 day)

---

## 10. References
- See `MODULARIZATION_PLAN.md` for requirements and file links.
- See `ai-server/README.md` for backend architecture.
- See `openapi.yaml` for API documentation.

---

**This plan ensures a robust, maintainable, and fully integrated backend for canonical file storage, chunk diffing, versioning, rollback, and migration in the Multi-Universe Book Series Writing Assistant.**
