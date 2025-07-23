# AI Helper Implementation Plan with Parallel Queue Support

## Overview

This document outlines the steps required to implement an AI helper for Universe Book Writer, leveraging the orchestrator's parallel queue system for scalable, responsive AI interactions. The AI helper will support conversational and command-based workflows, context-aware form filling, and plugin-driven universe logic.

---

## Files to Create/Update

### Backend

- `ai-server/src/api/aiHelper.ts` (new): Express route/controller for `/api/ai/helper` endpoint.
- `ai-server/src/orchestrator.ts`: Update to ensure queue logic, request routing, and plugin integration.
- `ai-server/src/services/characterChat/MessageProcessor.ts`: Update for multi-pass workflow and context handling.
- `ai-server/src/services/modelPerformanceRAG.service.ts`: Update for usage tracking and model selection insights.
- `packages/plugin-sdk/` (update): Ensure plugin hooks for context gathering and suggestion generation.
- `shared/types/nodeTypes.ts` (update): Add/extend types for universe/book/chapter suggestions.
- `shared/context/` (update): Utility functions for context assembly.
- `ai-server/tests/api/aiHelper.test.ts` (new): Unit tests for new API endpoint and orchestration.

### Frontend

- `ai-server/web/src/components/Dashboard.tsx`: Update to send form state/context to backend, display AI responses, and apply suggestions.
- `ai-server/web/src/components/ChatBox.tsx` (new or update): Modular chat UI for AI helper.
- `ai-server/web/src/state/formState.ts` (new or update): Centralized form state management.
- `ai-server/web/src/api/aiHelper.ts` (new): Frontend API utility for communicating with backend endpoint.
- `ai-server/web/tests/aiHelper.test.tsx` (new): Frontend tests for chat-AI integration and form suggestion application.
- `ai-server/web/src/components/DiffDisplay.tsx` (new): Inline diff viewer for text suggestions with accept/retry/disapprove controls.
- `ai-server/web/src/components/ContextScopeIndicator.tsx` (new): UI component to show current context scope (e.g., selected universe).

### Documentation

- `docs/AI_HELPER_PARALLEL_QUEUE_IMPLEMENTATION_PLAN.md` (this file): Update as implementation progresses.
- `docs/API_DOCUMENTATION.md`: Document new endpoints and request/response formats.
- `docs/PROGRESS.md`: Track milestones and progress.
- `docs/DECISION_LOG.md`: Log architectural decisions.
- `README.md` (root and relevant modules): Add usage examples and architectural notes.

---

## 1. Requirements & Goals

- Enable users to interact with the AI helper via chat and natural language.
- Support AI-driven form filling for universes, books, and chapters.
- Ensure context-awareness: AI sees current form state and related entities.
- Use the orchestrator's parallel queue system for concurrent, fair request handling.
- Maintain plugin-first architecture for universe-specific logic.

---

## 2. Backend Steps

### 2.1. API Endpoints

- Create `/api/ai/helper` endpoint for chat and form suggestions.
- Accept user prompt, dashboard context, and form state in the request body.
- Return both creative chat responses and structured JSON suggestions.
- When the AI suggests changes to a text field, return both the full suggestion and a diff object for frontend display.
- Support accept/retry/disapprove actions for each suggestion.
- If a universe is selected, restrict AI context and responses to only that universe’s data.
- For global queries, allow the AI to access all universes unless a specific one is selected.

### 2.2. Orchestrator Integration

- Use `AIOrchestrator.tryRequestWithFailover()` to route requests to the best available server/model.
- Ensure requests are queued and processed in parallel, respecting concurrency limits.
- Handle queue overflow (429 errors) gracefully in the API response.

### 2.3. Multi-Pass Workflow

- **Pass 1:** Detect intent (command vs. conversation).
- **Pass 2:** Gather relevant context (form state, selected universe/book/chapter, plugin logic).
- **Pass 3a-c:** For each form (universe, book, chapter), generate suggestions as needed.
- **Pass 4:** Compose chat response, including reasoning and summary of changes.

### 2.4. Plugin SDK Support

- Route context and requests through the plugin SDK for universe-specific rules and validation.
- Ensure plugins can contribute to context gathering and suggestion generation.

---

## 3. Frontend Steps

### 3.1. Chat UI Integration

- Update chat box to send both user prompt and current form state/context to the backend.
- Display AI responses and suggestions in the chat.
- Offer "Apply" buttons for suggested form values.
- Show AI text suggestions as inline diffs with accept/retry/disapprove controls.
- On accept, update the field; on retry, request a new suggestion; on disapprove, dismiss the suggestion.
- Always show the context scope in the chat UI (e.g., “You are asking about: [Universe Name]”).
- If the user wants to broaden the scope, offer a “Search all universes” option.

### 3.2. Form State Management

- Ensure all form fields (universe, book, chapter) are tracked in state and passed to the AI helper.
- Allow partial or full form filling based on AI suggestions.

### 3.3. Error & Queue Feedback

- Handle 429 (queue overflow) errors by informing the user and suggesting retry/wait.
- Show progress indicators for queued requests.

---

## 4. Testing & Validation

- Write unit tests for backend orchestration, queue handling, and plugin logic.
- Add frontend tests for chat-AI integration and form suggestion application.
- Achieve >80% coverage for all new logic.

---

## 5. Documentation & Examples

- Document API endpoints and request/response formats in OpenAPI.
- Add usage examples to module and root README files.
- Update architectural diagrams to show parallel queue flow.

---

## 6. Edge Cases & Considerations

- Handle queue overflow and server/model failures gracefully.
- Support both natural language and command-style prompts.
- Ensure plugin logic does not block or slow down queue processing.
- Maintain strict typing and shared code usage as per project conventions.

---

## 7. Progress Tracking

- Update `docs/PROGRESS.md` and `PROJECT_CHECKLIST.md` as milestones are completed.
- Log architectural decisions in `docs/DECISION_LOG.md`.

---

## References

- `ai-server/src/orchestrator.ts`
- `shared/types/`
- `packages/plugin-sdk/`
- `ai-server/web/src/components/Dashboard.tsx`

---

**Last updated:** July 23, 2025
