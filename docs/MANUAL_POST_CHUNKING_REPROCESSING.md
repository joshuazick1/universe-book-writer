# Manual Re-Processing of Post-Chunking Pipeline Steps for Already-Parsed Books

## Overview
This document outlines all required changes to enable manual re-processing of post-chunking pipeline steps on books that have already been parsed and ingested into the system. This is necessary for scenarios where downstream processing (e.g., node linking, memory extraction, metadata updates) needs to be re-run without re-ingesting the raw text.

---

## 1. Backend API Changes

### 1.1. New Endpoint
- **Route:** `/api/rag/reprocess/post-chunking`
- **Method:** `POST`
- **Purpose:** Triggers post-chunking pipeline steps for a specified book (or set of books) that have already been parsed and stored in the database.
- **Request Body:**
  - `universeId` (string, required)
  - `bookId` (string, required)
  - `steps` (optional, array of strings): Specify which post-chunking steps to re-run (e.g., `['linkNodes', 'extractMemories']`). If omitted, all steps are re-run.
- **Response:**
  - Streaming or JSON response indicating progress and results of each step.

### 1.2. Controller/Service Logic
- Implement a controller method to:
  - Validate input and check that the book exists and is already parsed.
  - Load the parsed book data (from MongoDB or other storage).
  - Sequentially execute the requested post-chunking steps (or all, if not specified):
    - Node linking
    - Memory extraction
    - Metadata updates
    - Any other relevant downstream processing
  - Stream or return progress/results to the client.

### 1.3. Error Handling
- Return clear error messages for:
  - Book not found
  - Book not yet parsed (raw text only, no chunks)
  - Invalid or missing parameters
  - Step failures (with partial progress if possible)

---

## 2. Frontend Changes (Optional)
- Add a UI control (e.g., button or menu) in the RAG dashboard to trigger manual re-processing for a selected book.
- Allow selection of specific steps to re-run (advanced option).
- Display progress and results to the user (streamed or as a summary).

---

## 3. Documentation & Tracking
- Document the new endpoint in the API docs (Swagger/OpenAPI):
  - Include request/response examples, parameter descriptions, and error cases.
- Update `docs/PROGRESS.md` and `PROJECT_CHECKLIST.md` to reflect this feature.
- If any architectural decisions are made, record them in `docs/DECISION_LOG.md`.

---

## 4. Testing
- Add unit and integration tests for the new endpoint and service logic.
- Test edge cases: missing/invalid parameters, partial failures, re-running on already-processed books, etc.
- Ensure test coverage remains above 80%.

---

## 5. Example Request
```http
POST /api/rag/reprocess/post-chunking
Content-Type: application/json

{
  "universeId": "star-trek",
  "bookId": "voyager-01",
  "steps": ["linkNodes", "extractMemories"]
}
```

---

## 6. Summary of Required Changes
- [ ] Implement new POST endpoint for manual post-chunking re-processing
- [ ] Add controller/service logic to execute post-chunking steps on existing books
- [ ] Update API documentation
- [ ] (Optional) Add frontend controls for manual re-processing
- [ ] Add tests for new functionality
- [ ] Update project documentation and tracking files

---

**Last updated:** July 8, 2025
