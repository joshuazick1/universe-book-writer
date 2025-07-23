# Changes Required for Entity Deduplication Before Relationship Extraction

This document outlines the code and documentation changes required to enable entity deduplication before relationship extraction in the post-chunking pipeline, including special handling for unnamed groups of characters.

## 1. Pipeline Changes

- **Insert entity deduplication step** immediately after entity extraction and before relationship extraction in the post-chunking pipeline (e.g., in `textToRagParser/postChunkingPipeline.ts`).
- **Deduplication logic:**
  - Merge entities that refer to the same character or object, combining their summaries and attributes.
  - When merging, generate a new summary that incorporates information from all duplicates.
  - Ensure that deduplication is idempotent and does not remove distinct entities (e.g., avoid merging generic groups with named characters).

## 2. Handling Unnamed Groups

- **Detection:**
  - Identify entities that represent unnamed groups (e.g., "a group of people", "a large crowd", "the audience").
  - Use heuristics or a list of common group descriptors to flag such entities.
- **Memory Generation:**
  - Exclude unnamed group entities from character memory generation steps.
  - Only generate memories for named or uniquely identified characters.
- **Deduplication:**
  - Do not merge unnamed groups with named characters, even if they appear in similar contexts.
  - Optionally, merge similar unnamed groups if they are clearly the same (e.g., "the audience" and "the crowd" in the same scene).

## 3. Service Layer Changes

- **Expose deduplication utility** as a function in the service layer (e.g., `entityDeduplication.ts`).
- **Update pipeline function signatures** to accept and return deduplicated entities.
- **Add tests** for deduplication logic, especially for edge cases involving unnamed groups and near-duplicates.

## 4. Documentation

- **Update pipeline documentation** to describe the new deduplication step and its position in the process.
- **Document heuristics** for detecting unnamed groups and rules for memory generation.
- **Add usage examples** and edge cases to the relevant module README files.

## 5. API and UI (Optional)

- **Expose deduplication results** in API responses for transparency.
- **Allow manual review and linking** of entities in the UI, especially for cases where automated deduplication is uncertain (e.g., a generic character later receives a name).

---

**Last updated:** July 8, 2025
