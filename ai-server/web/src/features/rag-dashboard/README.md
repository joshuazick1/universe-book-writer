
# RAG System Feature Showcase Dashboard

This directory contains the main dashboard and all feature panels for the AI RAG system rewrite. Each file is a modular, demo-ready React component. See the implementation plan for details.

---

## Manual Post-Chunking UI Integration

This update adds a UI button to the RAG Dashboard for manually running post-chunking pipeline steps on the entities selected in the filter bar (universe, book, chapter, character).

### Usage

- Select a universe, book, chapter, or character using the filter bar at the top of the dashboard.
- Click the **"Run Post-Chunking Steps"** button (enabled when a universe or book is selected).
- The button triggers a POST request to `/api/rag/manual-post-chunking` with the selected filter values.
- Progress and results are displayed next to the button.

### Implementation Details

- The logic is implemented in `RAGDashboard.tsx` using the `runManualPostChunking` helper from `services/manualPostChunkingService.ts`.
- The button is disabled while processing or if no universe/book is selected.
- Errors and results are shown inline for user feedback.

### Example

```tsx
<RAGFilterBar />
<div>
  <button onClick={handleManualPostChunking}>Run Post-Chunking Steps</button>
  {processError && <span>{processError}</span>}
  {processResult && <span>{processResult}</span>}
</div>
```

### Backend Requirement

This feature requires the backend endpoint `/api/rag/manual-post-chunking` to be implemented as described in the backend documentation.

---

_Last updated: July 8, 2025_
