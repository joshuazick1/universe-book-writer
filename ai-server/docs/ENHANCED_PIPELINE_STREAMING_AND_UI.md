# Enhanced RAG Pipeline Streaming & Frontend Task Visualization

## Overview
This document outlines the planned updates to the RAG pipeline's streaming API and frontend UI to provide clearer, more user-friendly real-time feedback on pipeline progress. The goal is to:
- Stream task status updates (queued, in progress, completed, not yet queued) for each pipeline step.
- Emit a pipeline overview at the start, showing all tasks and their initial statuses.
- Use friendly, human-readable task names in the frontend instead of raw node IDs.
- Update the frontend to visualize the pipeline as a series of tasks with live status updates.

---

## Backend (API) Updates

### 1. Define Pipeline Task List
- Create a canonical list of all pipeline tasks (e.g., `storeRawText`, `chunkText`, `summarizeChunkMeta`, etc.) with dependencies and friendly names.

### 2. Emit Task Status Events
- As each job is enqueued, emit an SSE event:
  - `sendSSE(res, 'task_status', { task: 'storeRawText', status: 'queued', friendlyName: 'Store Raw Text' })`
- When a job starts processing, emit:
  - `sendSSE(res, 'task_status', { task: 'storeRawText', status: 'in_progress', friendlyName: 'Store Raw Text' })`
- When a job completes, emit:
  - `sendSSE(res, 'task_status', { task: 'storeRawText', status: 'completed', friendlyName: 'Store Raw Text' })`
- For tasks not yet queued, emit their status at the start.

### 3. Emit Pipeline Overview
- At the start of the stream, emit a `pipeline_overview` event with all tasks and their initial statuses:
  - `sendSSE(res, 'pipeline_overview', { tasks: [{ task: 'storeRawText', status: 'not_queued', friendlyName: 'Store Raw Text' }, ...] })`

### 4. Use Friendly Names
- Maintain a mapping of task keys to friendly names for use in all SSE events.
- When emitting events related to nodes (e.g., chunk creation), include a `friendlyName` property (e.g., `Chunk 1`, `Book`, `Chapter`).

---

## Frontend (Web UI) Updates

### 1. Pipeline Visualization
- Display the pipeline as a list or flow of tasks, using friendly names.
- Show each task's status (not queued, queued, in progress, completed) with clear visual indicators (e.g., color, icons).

### 2. Real-Time Updates
- Listen for `pipeline_overview` and `task_status` SSE events.
- Update the UI in real time as task statuses change.

### 3. Friendly Names
- Use the `friendlyName` property from SSE events for display.
- For chunk nodes, display as `Chunk 1`, `Chunk 2`, etc., instead of node IDs.
- For universe/book/chapter nodes, display their type or title.

---

## Steps to Complete

### Backend Plan
- Update or create:
  - `ai-server/src/controllers/ragTextController.ts` (streaming logic)
  - `ai-server/src/utils/pipelineTasks.ts` (canonical task list & friendly names)
  - `ai-server/src/routes/rag/ingestTextStream.ts` (route wiring, if needed)
  - (Optional) `ai-server/src/services/ragNodeService.ts` (friendly names for nodes)
  - (Optional) `ai-server/tests/` (test coverage)
- Steps:
  1. Define canonical pipeline task list and friendly names.
  2. Emit `pipeline_overview` at stream start.
  3. Emit `task_status` events as jobs are queued, started, completed.
  4. Include `friendlyName` in all SSE events.
  5. (Optional) Refactor node creation events for friendly names.

### Frontend Plan
- Update or create:
  - `frontend/src/components/PipelineStatus.tsx` (visualization component)
  - `frontend/src/pages/ingest/[...].tsx` (SSE event handling)
  - `frontend/src/utils/pipelineFriendlyNames.ts` (friendly name mapping)
  - `frontend/src/types/pipeline.ts` (pipeline event types)
  - (Optional) `frontend/src/tests/` (UI/SSE tests)
- Steps:
  1. Handle `pipeline_overview` and `task_status` SSE events.
  2. Build pipeline visualization UI.
  3. Display friendly names for all tasks/nodes.
  4. Test with various pipeline runs.

---

## Example SSE Event Payloads

```json
// Pipeline overview
{
  "event": "pipeline_overview",
  "data": {
    "tasks": [
      { "task": "storeRawText", "status": "not_queued", "friendlyName": "Store Raw Text" },
      { "task": "chunkText", "status": "not_queued", "friendlyName": "Chunk Text" },
      // ...
    ]
  }
}

// Task status update
{
  "event": "task_status",
  "data": {
    "task": "chunkText",
    "status": "completed",
    "friendlyName": "Chunk Text"
  }
}
```

---

## Notes
- Ensure all new events are documented for frontend consumption.
- Consider extensibility for future pipeline steps or custom universe plugins.
