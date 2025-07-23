# Visualization Tab & Orchestrator Activity API Enhancement Plan

## Overview
This document outlines the steps, file/folder structure, and scaffolding required to add a live Visualization tab to the `/web` frontend, showing which models are being accessed by which servers, powered by a new `/api/orchestrator/activity` endpoint. This will require backend enhancements for real-time activity tracking and a React-based frontend visualization component.

---

## 1. Backend Enhancements


### 1.1. New Endpoints: `/api/orchestrator/activity` and `/api/orchestrator/activity/history`
- **Purpose:**
  - Expose real-time activity data: which models are being accessed, by which servers, and request/session counts.
  - Expose historical activity data for a given time range (e.g., last hour, day, custom range).
- **Live Updates:** Use WebSockets for push-based updates, or implement polling as a fallback.
- **Historical Data:** Provide a REST endpoint (e.g., `/api/orchestrator/activity/history?range=...`) to fetch activity snapshots or aggregates over time.


#### Files to Create/Update
- `ai-server/src/api/orchestrator/activity.ts` (new route/controller for live data)
- `ai-server/src/api/orchestrator/activity-history.ts` (new route/controller for historical data)
- `ai-server/src/orchestrator/activity-tracker.ts` (new: tracks live activity and stores history)
- `ai-server/src/orchestrator/index.ts` (update: export new tracker)
- `ai-server/src/api/index.ts` (update: register new routes)
- `ai-server/src/websockets/activity.ts` (new: WebSocket event emitter for activity)
- `ai-server/README.md` (update: document new endpoints)
- `ai-server/tests/orchestrator/activity-tracker.test.ts` (new: unit tests)


#### Data Shape Example (No PII, Task Type Included)
```json
{
  "timestamp": "2025-06-28T12:00:00Z",
  "servers": [
    {
      "id": "local",
      "name": "Local Ollama",
      "activeModels": [
        {
          "model": "llama3.2:1b",
          "activeRequests": 2,
          "taskType": "text-generation" // e.g., "typescript-coding", "text-generation", "summarization"
        }
      ]
    },
    // ...
  ]
}
```

---

## 2. Frontend Enhancements (`/web`)


### 2.1. Visualization Tab/Page
- **Purpose:** Display a live, interactive graph of servers and models, showing current activity, and allow switching to historical activity views.
- **Live Updates:** Connect to backend WebSocket or poll `/api/orchestrator/activity` for real-time data.
- **Historical Data:** Fetch from `/api/orchestrator/activity/history` with selectable time ranges (e.g., last 10 min, 1 hour, 24 hours, custom).
- **Visualization:** Use a React graph library (e.g., `recharts`, `vis-network`, `react-force-graph`, or `d3`).
- **UI Controls:** Add a toggle, dropdown, or tabs to switch between live and historical data modes. When in historical mode, allow the user to select the time range.


#### Files to Create/Update
- `ai-server/web/src/components/VisualizationTab/VisualizationTab.tsx` (main component, with mode switch UI)
- `ai-server/web/src/components/VisualizationTab/ModelServerGraph.tsx` (graph rendering)
- `ai-server/web/src/components/VisualizationTab/index.ts` (barrel)
- `ai-server/web/src/pages/Visualization.tsx` (page route)
- `ai-server/web/src/App.tsx` (update: add nav/tab)
- `ai-server/web/README.md` (update: usage)
- `ai-server/web/src/types/orchestrator.ts` (TypeScript types for both live and historical activity data)
- `ai-server/web/src/hooks/useActivityStream.ts` (hook for live updates)
- `ai-server/web/src/hooks/useActivityHistory.ts` (new: hook for fetching historical data)

---

## 3. Implementation Steps


### Backend
1. Implement `activity-tracker.ts` to track model/server activity in real time and store historical snapshots.
2. Add `/api/orchestrator/activity` REST endpoint for live data.
3. Add `/api/orchestrator/activity/history` REST endpoint for historical data.
4. Add WebSocket event emitter for live activity updates.
5. Register new routes and WebSocket in API entry points.
6. Write unit tests for activity tracking, history, and endpoints.
7. Update `README.md` with API docs and usage.

### Frontend
1. Scaffold `VisualizationTab` and supporting components, including mode switch UI (live/historical).
2. Implement `useActivityStream` hook for live data.
3. Implement `useActivityHistory` hook for historical data.
4. Render graph/network of servers and models for both live and historical data.
5. Add navigation/tab to main app.
6. Update `README.md` with screenshots and usage.

---

## 4. Folder Structure (New/Updated)

```
c:\Users\jzick\verseforge\ai-server\
  src\
    api\
      orchestrator\
        activity.ts         # New REST endpoint
    orchestrator\
      activity-tracker.ts   # New activity tracker
      index.ts              # Export tracker
    websockets\
      activity.ts           # WebSocket emitter
  tests\
    orchestrator\
      activity-tracker.test.ts
  README.md                 # Update docs

c:\Users\jzick\verseforge\frontend\
  src\
    components\
      VisualizationTab\
        VisualizationTab.tsx
        ModelServerGraph.tsx
        index.ts
    pages\
      Visualization.tsx
    types\
      orchestrator.ts
    hooks\
      useActivityStream.ts
    App.tsx                 # Update nav
  README.md                 # Update docs
```

---


## 5. Notes
- **Privacy:** Never store user queries, prompts, or any PII in logs or activity history. Only store non-PII metadata: model, server, timestamp, status, and task type (e.g., "typescript-coding", "text-generation").
- Use strict TypeScript typing throughout.
- Ensure all new modules have JSDoc and README updates.
- Add unit tests for all new backend logic.
- Use Tailwind CSS for frontend styling.
- Plan for future expansion: historical activity, orchestration decisions, analytics overlays.

---

## 6. References
- See `ai-server/README.md` for orchestrator architecture and API conventions.
- See `MODULAR_DIRECTORY_STRUCTURE.md` for project structure standards.
