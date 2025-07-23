# Changes Required for Manual Post-Chunking Reprocessing Endpoint

This document outlines all code and documentation changes required to implement a new backend endpoint for manually re-running post-chunking pipeline steps on already-parsed books in the RAG system.

## 1. New Endpoint Implementation

- **Create a new Express route** (e.g., `src/routes/rag/manualPostChunking.ts`) to handle manual reprocessing requests.
- **Define a POST endpoint** (e.g., `/api/rag/manual-post-chunking`) that accepts parameters identifying the target book (e.g., universeId, bookId).
- **Add controller logic** in `src/controllers/ragTextController.ts`:
  - Implement a method (e.g., `manualPostChunking`) that:
    - Validates input (book/universe IDs).
    - Loads all chunk nodes for the specified book from the database.
    - Invokes all post-chunking pipeline steps (e.g., memory extraction, relationship mapping, embedding, etc.) on those chunks.
    - Streams or returns progress/results to the client.
- **Wire up the new route** in the main router (e.g., `src/routes/index.ts`).

## 2. Service Layer Changes

- **Expose post-chunking pipeline steps** as callable functions in the service layer (e.g., `textToRagParser/postChunkingPipeline.ts`).
- **Ensure idempotency**: Running post-chunking steps multiple times should not create duplicate data or corrupt state.
- **Add utility methods** to fetch all relevant chunk nodes for a given book.

## 3. Database Layer Changes

- **Verify** that chunk nodes and related data can be queried efficiently by book/universe ID.
- **Update** or **add indexes** if necessary for performance.

## 4. Testing

- **Write unit and integration tests** for:
  - The new endpoint (controller and route).
  - Service methods for post-chunking reprocessing.
  - Edge cases (e.g., missing book, no chunks, already-processed data).
- **Update test runner scripts** if new test files are added.

## 5. API Documentation

- **Document the new endpoint** in the API docs (Swagger/OpenAPI):
  - Path, method, parameters, request/response examples.
  - Describe expected behavior and error cases.

## 6. Frontend (Optional)

- **Add UI controls** to trigger manual reprocessing from the dashboard (e.g., button in the book/chapter management panel).
- **Display progress and results** to the user.

## 7. General Documentation

- **Update** this file and `docs/PROGRESS.md` upon completion.
- **Record architectural decisions** in `docs/DECISION_LOG.md` if the implementation introduces new patterns or changes existing ones.

---

**Last updated:** July 8, 2025
