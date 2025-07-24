# Hybrid Agent Implementation Plan: Universe Book Writer AI Helper

## Overview

This system uses a hybrid agent architecture:
- **Logic-based tools** (TypeScript modules) for deterministic, fast, and testable operations.
- **Generative tasks** (e.g., creative writing, title suggestions) are handled by large language models (LLMs) via orchestrated AI prompts.
- The **intent parser (planner)** analyzes user requests, decomposes them into subtasks, and routes each to the appropriate tool or model.
- **Context gathering**: Before planning, the backend collects all relevant context (current universe, book, chapter, user, recent actions, available forms, etc.) and passes it to the planner.
- **Forms awareness**: The frontend sends a list of available forms (with brief descriptions) to the backend/planner, enabling the agent to suggest form changes.
- **Structured edit responses**: For text editing, the agent returns edits in a structured format, including overlap for robust application.

---

## 1. Request Flow

1. **User submits a request** via chat or form.
2. **Context is gathered**: Backend collects all relevant context and available forms.
3. **Intent parser (planner) receives the request**, context, and available tools/forms.
4. **Task decomposition**:
   - Identifies which subtasks are logic-based (e.g., counting universes, fetching metadata).
   - Identifies which subtasks require generative AI (e.g., “suggest a better title”).
   - Identifies which subtasks involve form changes or text edits.
5. **Plan output**:
   - Returns a structured plan, e.g.:
     ```json
     {
       "tasks": [
         { "type": "tool", "toolName": "countUniverses", "args": {} },
         { "type": "aiPrompt", "prompt": "Suggest a better title for my universe: 'Galactic Saga'", "context": { "universe": "Galactic Saga" } },
         { "type": "formSuggestion", "form": "UniverseForm", "fields": { "title": "Galactic Legends" } },
         { "type": "textEdit", "form": "ChapterForm", "field": "description", "before": "The crew landed on the planet.", "after": "The crew landed on the mysterious planet.", "overlap": "The crew landed" }
       ]
     }
     ```
6. **Orchestration engine**:
   - Executes logic tool calls directly.
   - For AI prompt tasks, routes the prompt/context to the model selection/orchestration system (RAG, retry logic, etc.).
   - For form suggestions and text edits, returns structured instructions to the frontend for application.
7. **Aggregates results** and returns them to the user/frontend.

---

## 2. Tool Definition & Registry

- Tools are TypeScript modules with strict input/output types and JSDoc.
- Registered in a central registry (`toolRegistry.ts` or service).
- Only logic-based tasks are handled by tools; generative tasks are handled by AI prompt orchestration.
- Form suggestions and text edits are handled by the planner/AI and returned in structured format.

---

## 3. Intent Parser (Planner) Design

- Receives:
  - User request
  - List of available tools (name, description, input/output schema)
  - Current context (universe, book, chapter, etc.)
  - List of available forms (with brief descriptions)
- Returns:
  - A JSON plan with tool calls, AI prompt tasks, form suggestions, and text edit instructions.
  - Optionally, reasoning for debugging.
- Example prompt for planner:
  ```
  You are an agent for a book writing platform. Here are the available forms:
  - UniverseForm: Create or edit universe details.
  - ChapterForm: Add or edit chapters.
  - CharacterForm: Manage character info.
  Given the user's request, break it down into logic tool calls, generative AI prompt tasks, form suggestions, and text edit instructions. Return a JSON plan.
  ```

---

## 4. Orchestration Engine

- Validates and executes each task in the plan.
- Handles errors, retries, and fallback logic for both tool and AI prompt tasks.
- Aggregates results for the user.
- For form suggestions and text edits, ensures structured instructions are returned to the frontend for robust application.

---

## 5. Extensibility & Testing

- New tools can be added and registered for logic tasks.
- Planner can be improved to generate better prompts and decompose more complex requests.
- All logic tools and orchestration logic are unit tested.
- End-to-end tests for the full request flow.
- Form suggestion and text edit handling are covered by integration tests.

---

## 6. Model Selection for the Planner

- The planner (intent parser) does not need to be a large model.
- **Recommended minimum:** A small, fast LLM (e.g., 3B–7B parameter models like TinyLlama, Phi-3, or even GPT-3.5-turbo for cloud).
- **Why:** The planner’s job is mostly classification, extraction, and decomposition—not creative writing. Small models are sufficient and much faster/cheaper.
- **For best results:** Use a model with strong instruction-following and JSON output capabilities. If using Ollama, try Phi-3, TinyLlama, or similar.

---

## 7. Documentation & Progress Tracking

- Document the hybrid flow in your implementation plan and architecture docs.
- Update READMEs and developer guides to reflect the new agent/planner approach.
- Track progress and architectural decisions in `DECISION_LOG.md`.
- Document form suggestion and text edit formats for frontend/backend integration.

---

## 8. Example Plan Output

```json
{
  "tasks": [
    { "type": "tool", "toolName": "countUniverses", "args": {} },
    { "type": "aiPrompt", "prompt": "Suggest a better title for my universe: 'Galactic Saga'", "context": { "universe": "Galactic Saga" } },
    { "type": "formSuggestion", "form": "UniverseForm", "fields": { "title": "Galactic Legends" } },
    { "type": "textEdit", "form": "ChapterForm", "field": "description", "before": "The crew landed on the planet.", "after": "The crew landed on the mysterious planet.", "overlap": "The crew landed" }
  ]
}
```

---

## References

- [LangChain Agents](https://python.langchain.com/docs/modules/agents/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- Your project’s types, `toolRegistry.ts`, and orchestration modules.
- Frontend/backend integration patterns for form and text edit instructions.

---

**Summary:**  
- Use a small, fast LLM for the planner/intent parser.
- Gather context and available forms before planning.
- Decompose requests into logic tool calls, generative AI prompt tasks, form suggestions, and text edit instructions.
- Route each subtask to the appropriate handler.
- Return structured form suggestions and text edit instructions for robust frontend integration.
- Maintain strict typing and documentation for all logic tools.