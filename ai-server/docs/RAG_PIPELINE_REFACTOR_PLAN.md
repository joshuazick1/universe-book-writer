# RAG Text Ingestion Pipeline Refactor Plan

## Overview

This document outlines a comprehensive plan to refactor the RAG (Retrieval-Augmented Generation) text ingestion pipeline in the `ragTextController`. The goal is to improve modularity, maintainability, and AI context management by restructuring the workflow and codebase according to the new requirements and best practices.

---

## Objectives

- **Store full submitted text** to the appropriate chapter or book node, with versioning.
- **Chunk text** into small, manageable pieces for granular processing.
- **Generate brief AI summaries** for each chunk.
- **Group chunks** into larger super-chunks (3–5 chunks each) for broader context.
- **Generate robust summaries** for each super-chunk.
- **Leverage summaries and chunks** for downstream AI tasks (entity extraction, relationships, lore, dialogue, mood/theme, timeline, character memory).
- **Improve modularity** by separating each pipeline step into its own function/service.
- **Enhance testability** and maintain at least 80% test coverage.
- **Document** the new pipeline and update all related documentation.

---

## Proposed Pipeline Steps

1. **User Submission**
   - Accept text and metadata (universe, book, chapter, etc.) via API.

2. **Store Raw Text**
   - Save the full text to the chapter or book node in the knowledge graph.
   - Version the node for rollback/history.

3. **Chunking**
   - Split the text into small chunks (e.g., by paragraph or markdown block).
   - Store each chunk as a `source_chunk` node.

4. **Brief Summaries**
   - For each chunk, generate a brief AI summary.
   - Store the summary with the chunk node.

5. **Group Chunks into Super-Chunks**
   - Group every 3–5 chunks into a super-chunk.
   - Store grouping information (e.g., as a new node or as metadata on the parent node).

6. **Robust Summaries**
   - For each super-chunk, generate a more detailed summary (shorter than the super-chunk itself).
   - Store the robust summary with the super-chunk node or as metadata.


7. **Contextual AI Processing (Multi-Pass Approach)**
   - Perform downstream AI tasks in multiple, clearly defined passes. Each pass uses context specifically tailored for its purpose, maximizing both accuracy and efficiency. Example passes:

   **Pass 1: Entity Extraction**

   - **Context:** Full chunk text + brief chunk summary + robust super-chunk summary.
   - **Goal:** Identify and extract all entities (characters, places, objects, etc.) present in each chunk.

   **Entity Deduplication Step (after Pass 1, before Pass 2):**
   - **Context:** All extracted entities from all chunks are kept in memory until entity extraction is complete for the entire submission.
   - **Goal:** Deduplicate entities by comparing names, aliases, and key attributes (e.g., type, description). Merge or link duplicates, ensuring each unique entity is represented only once in the knowledge graph for this ingestion session.
   - **Implementation Notes:**
     - Use fuzzy matching and alias resolution to catch near-duplicates.
     - Retain references to all original mentions for traceability.
     - Only after deduplication are entities persisted and made available for relationship extraction and downstream passes.

   **Pass 2: Relationship Extraction**
   - **Context:** Chunk text + extracted entities from Pass 1 + both levels of summaries.
   - **Goal:** Detect relationships between entities (e.g., interactions, affiliations, conflicts) within and across chunks.

   **Pass 3: Lore Extraction**
   - **Context:** Chunk text + robust super-chunk summary + entity/relationship context from previous passes.
   - **Goal:** Extract lore, world-building facts, and universe-specific details.

   **Pass 4: Dialogue Extraction**
   - **Context:** Chunk text + brief summary + entity context (especially character nodes).
   - **Goal:** Identify dialogue, speakers, and targets, linking them to character entities.

   **Pass 5: Mood, Theme, and Timeline Extraction**
   - **Context:** Robust super-chunk summary + all brief summaries in the group + relevant entity/lore context.
   - **Goal:** Classify mood, theme, and extract timeline markers for narrative structure.

   **Pass 6: Character Memory Generation**
   - **Context:** Aggregated events (dialogue, lore, relationships) linked to each character from previous passes.
   - **Goal:** Generate character memories and perspectives for use in future story development.

   - **General Principle:**
     - Each pass should only use the minimum context required for its task, combining summaries and full text as needed.
     - Pass outputs are stored and made available for subsequent passes, enabling richer, more accurate downstream processing.
     - This modular, staged approach allows for easy extension, debugging, and targeted improvements.

8. **Cross-Chunk and Hierarchical Linking**
   - Link chunk, super-chunk, chapter, book, and universe nodes appropriately.
   - Set up relationships for entities, dialogue, lore, and timeline markers.

9. **Versioning and Rollback**
   - Ensure all major nodes (chapter, book, super-chunk) are versioned for auditability and rollback.

10. **Testing and Documentation**
    - Write unit tests for each pipeline step.
    - Update module and API documentation.
    - Maintain at least 80% test coverage.

---

## Implementation Plan

### 1. **Modularize Pipeline Steps**
- Create a `pipeline/` directory (or similar) to house each step as a separate function/service:
  - `storeRawText.ts`
  - `chunkText.ts`
  - `summarizeChunk.ts`
  - `groupChunks.ts`
  - `summarizeSuperChunk.ts`
  - `aiEntityExtraction.ts`
  - `aiRelationshipExtraction.ts`
  - `aiLoreExtraction.ts`
  - `aiDialogueExtraction.ts`
  - `aiMoodThemeClassification.ts`
  - `aiTimelineExtraction.ts`
  - `characterMemoryGeneration.ts`


### 1a. **Pipeline Step Interface & Context Standardization**
- Define a common TypeScript interface (e.g., `PipelineStep`) for all pipeline step modules, ensuring each step implements a standard method signature for input, output, and context.
- Introduce a `PipelineContext` object passed through all steps, containing submission metadata, knowledge graph accessors, job/step state, and logging utilities.
- This enables easier orchestration, testing, and future plugin support.

### 1b. **Test Utilities & Mocks**
- Create a `testUtils/` or `__mocks__/` directory with:
  - Mock pipeline step runners
  - Mock distributed queue/job objects
  - In-memory knowledge graph for fast, isolated tests

### 1c. **Plugin/Extension Points**
- Define clear extension points for universe-specific plugins (e.g., Star Trek, Star Wars).
- Use dependency injection or a plugin registry to allow dynamic loading of universe logic without modifying core pipeline code.

### 1d. **Error Handling & Retry Policy Abstraction**
- Move error handling and retry logic out of individual steps and into a shared utility or middleware for consistent error reporting, retry, and rollback across all steps.

### 1e. **API & Event Versioning**
- Add versioning to API endpoints and SSE events early to avoid breaking changes as the system evolves.

### 1f. **Documentation Automation**
- Add scripts or CI checks to ensure all pipeline steps and services have up-to-date `README.md` files and JSDoc comments.



### 2. **Controller Refactor & Distributed Queue Integration**

#### Step-by-Step Plan

1. **Controller Entry & Initial Validation**
   - Accept text and metadata via API (POST or SSE endpoint).
   - Validate input, parse metadata, and determine pipeline configuration (universe, book, chapter, etc.).
   - Generate a unique pipeline run/session ID for tracking.
   - Attach API/event version to all responses and events.

2. **Store Raw Text as Initial Job**
   - Enqueue a `storeRawText` job in BullMQ with the full submitted text and metadata.
   - Attach version info and pipeline/session ID to the job payload.
   - Stream an SSE event indicating job enqueued (include job ID, version, and session ID).

3. **Chunking Job**
   - On completion of `storeRawText`, orchestrator enqueues a `chunkText` job with the stored text node reference and chunking parameters.
   - Stream SSE event for chunking job enqueued and started.
   - When chunking completes, stream SSE event with chunk node IDs and metadata.

4. **Summarization Jobs (Parallelized)**
   - For each chunk node, enqueue a `summarizeChunk` job (can be parallelized).
   - Each job includes chunk node ID, text, and context.
   - Stream SSE events for each job enqueued, started, completed, failed, or retried.
   - Attach version and session info to all events.

5. **Super-Chunk Grouping & Summarization**
   - As soon as all chunk summaries for a group are complete, orchestrator enqueues a `groupChunks` job to group chunks into super-chunks.
   - For each super-chunk, enqueue a `summarizeSuperChunk` job as soon as its dependencies (all chunk summaries in the group) are complete.
   - Stream SSE events for grouping and super-chunk summarization jobs.

6. **Downstream AI Task Jobs (Entity, Relationship, Lore, etc.)**
   - As soon as required context is available (e.g., chunk summary, super-chunk summary), orchestrator enqueues jobs for:
     - `aiEntityExtraction` (per chunk)
     - `aiRelationshipExtraction` (per chunk or group)
     - `aiLoreExtraction`, `aiDialogueExtraction`, `aiMoodThemeClassification`, `aiTimelineExtraction`, etc.
   - Each job includes all required context, version, and session info.
   - Stream SSE events for each job state change.

7. **Job Dependency Management ("Depends On")**
   - When enqueuing jobs, specify dependencies using a `dependsOn` field (array of job IDs).
   - The orchestrator tracks job completion and only assigns jobs when all dependencies are resolved.
   - Example dependencies:
     - `summarizeChunk` jobs depend on their `chunkText` job.
     - `summarizeSuperChunk` jobs depend on all `summarizeChunk` jobs in their group.
     - `aiEntityExtraction` jobs depend on both `summarizeChunk` and `summarizeSuperChunk` jobs.
     - Downstream jobs (relationships, lore, dialogue, etc.) depend on entity extraction jobs.
   - If a dependency fails, orchestrator can retry or cancel dependent jobs as appropriate.

8. **Entity Deduplication & Cross-Chunk Linking**
   - After all entity extraction jobs complete, orchestrator runs deduplication logic (can be a dedicated job or orchestrator-internal).
   - Deduplicated entities are persisted and made available for downstream jobs.
   - Enqueue relationship extraction and other jobs that depend on deduplicated entities.
   - Stream SSE events for deduplication and linking steps.

9. **Character Memory Generation**
   - **Overview:**
     - After all relevant events (dialogue, lore, relationships, timeline markers) are linked, the orchestrator generates character memories to capture each character's perspective on the story so far.
     - Memories are generated as first-person, subjective summaries, and can include both individual and shared (multi-character) memories.

   - **Implementation Steps:**
     1. **Aggregate Context for Each Character:**
        - For every character node in the session/universe:
          - Gather all events where the character is involved, including:
            - Dialogue (as speaker or target)
            - Lore and world events (where character is an involved entity)
            - Relationships (e.g., alliances, conflicts, family ties)
            - Timeline markers (events the character participated in)
          - Collect relevant chunk and super-chunk summaries for narrative context.
          - Optionally, include the character's previous memories for continuity.

     2. **Identify Shared Events:**
        - For each event involving multiple characters (e.g., a conversation, battle, or group discovery):
          - Mark the event as a candidate for shared memory generation.

     3. **Create Shared Memory Nodes:**
        - For each shared event:
          - Create a `shared_memory` node containing:
            - Objective summary of the event
            - Metadata (event type, time, location, etc.)
            - Links to all involved character nodes
          - This node serves as the anchor for all personal memories of the event.

     4. **Generate Personalized Character Memories:**
        - For each character involved in an event (shared or solo):
          - Generate a `character_memory` node with:
            - First-person, subjective summary of the event from the character's perspective
            - Emotional state, thoughts, and possible biases
            - References to the `shared_memory` node (if applicable) and the character node
            - Optionally, links to related events or previous memories
          - Use a prompt template such as:
            > "As [Character Name], recall the following events and interactions from your perspective. Include your thoughts, feelings, and any details you would remember or misremember."

     5. **Link Memories in the Knowledge Graph:**
        - For each `character_memory` node:
          - Link to the corresponding character node
          - If part of a shared event, link to the `shared_memory` node
          - Link to related events, dialogue, or lore nodes as appropriate

     6. **Enqueue Memory Generation Jobs:**
        - After all relevant context is aggregated and linked:
          - Enqueue a `characterMemoryGeneration` job for each character (or for each shared event/character pair)
          - Attach all gathered context, event references, and prompt instructions to the job payload
          - Stream SSE events for job enqueuing, progress, and completion

     7. **Store and Version Memories:**
        - Persist all generated memory nodes in the knowledge graph
        - Version memory nodes for auditability and future updates


     8. **Expose Memories for Downstream Use:**
        - Make character and shared memories available for downstream AI tasks (e.g., story continuation, character-driven generation, reader queries)
        - Ensure memories are queryable by character, event, or time
        - **Implementation Note:**
            - The API and controller layers are now in place for querying both `character_memory` and `shared_memory` nodes by character, event, or time.
            - **To complete production readiness:**
                1. **Replace Database and Service Stubs:**
                    - Implement the actual MongoDB queries in `mongoGeneratorService` for:
                        - `getSharedMemoriesByEvent(eventId)`
                        - `getSharedMemoriesByTime(timestamp)`
                        - `getSharedMemoriesByCharacter(characterId)`
                    - Update `DatabaseManager` to use these real implementations.
                2. **Shared Memory Node Schema:**
                    - Ensure the `shared_memory` node type is stored in its own collection or is properly indexed for efficient querying by event, character, and time.
                3. **Testing:**
                    - Add unit and integration tests for all new query methods and endpoints.
                4. **Documentation:**
                    - Document the new endpoints and query patterns in the API docs and README files.
            - See the codebase for stub locations and replace all `TODO: Implement actual MongoDB query for shared_memory nodes` comments with production code.

   - **Benefits:**
     - Enables nuanced, character-driven storytelling with continuity and perspective
     - Supports unreliable narrator effects and cross-character memory comparison
     - Facilitates collaborative and AI-assisted writing workflows

10. **Error Handling, Retry, and Job Stealing**
    - All jobs use the shared error handling and retry abstraction.
    - On error, orchestrator retries jobs as per policy and streams SSE error/retry events.
    - If a job is stalled or slow, orchestrator supports job stealing (reassignment to another server).
    - All job state changes (retry, fail, steal, complete) are streamed via SSE with version and session info.

11. **Plugin/Extension Points**
    - At each pipeline step, check the plugin registry for universe-specific overrides or extensions.
    - If a plugin is registered for the current universe, delegate the step to the plugin implementation.
    - Stream plugin invocation and result events via SSE.

12. **Versioning and Metadata**
    - Attach API/event version and pipeline session ID to all job payloads and SSE events.
    - Ensure all jobs and events are traceable to a specific pipeline run and version.

13. **Completion and Finalization**
    - When all pipeline steps are complete, stream a final SSE event indicating pipeline completion.
    - Persist final state, update knowledge graph, and return summary to client.

**Note:**
All orchestration, job dependency management, and context passing are handled by the orchestrator and distributed queue, not by direct function calls. The controller is responsible for initial job enqueueing, SSE streaming, and responding to orchestrator events.

### 3. **Node and Relationship Management**
- Update `ragNodeService` to:
  - Support storing raw text, chunk, and super-chunk nodes.
  - Manage relationships between all node types (chunk, super-chunk, chapter, book, universe).
  - Version nodes as needed.
  - Update nodes as job results arrive from the distributed queue.

### 4. **Distributed Orchestration & Summarization Services**
  - Accept results from the distributed queue, not direct function calls.
  - Generate brief summaries for chunks and robust summaries for super-chunks as soon as their required context is available (e.g., enqueue group chunk summaries after all chunk summaries in the group are complete).
  - Allow flexible model selection and prompt templates per job, with the orchestrator assigning jobs to the best available model on each server.
  - Support retries for jobs that timeout or return invalid/incorrectly formatted results.
  - Integrate with the orchestrator's job stealing and dynamic assignment features for optimal throughput.


### 4a. **Automated Benchmark Scheduling & Execution**
- Implement an automated system to schedule and run quality benchmark jobs for each model.
- **Benchmark Job Scheduling:**
  - Track the last benchmark run time for each model (by model name and size).
  - For models **under 12B parameters**, schedule benchmarks **daily**.
  - For models **12B–30B**, schedule benchmarks **every 3–7 days** (configurable).
  - For models **over 30B**, schedule benchmarks **weekly or less** (configurable, e.g., every 7–14 days).
  - The larger the model, the less frequent the benchmarks, to conserve resources.
  - Only one benchmark job per model should be in flight at a time.
- **Server Selection:**
  - Always run the benchmark on the **slowest available server** that has the model loaded, to ensure quality is measured under worst-case conditions.
  - If no slow server is available, fall back to any available server with the model.
- **Orchestrator Integration:**
  - The orchestrator is responsible for tracking last run times, scheduling jobs, and ensuring only one benchmark per model is active.
  - Benchmark jobs are enqueued and assigned like any other job, but with special handling for server/model selection and frequency.
  - Retries and error handling should be robust, with failed benchmarks retried after a backoff period.
- **Quality Judger:**
  - Benchmark jobs use the quality judger to evaluate and score results, updating model/task quality scores for future job assignment.
  - Benchmark results should be logged and available for review.

---

### 5. **Grouping Logic & Downstream AI Tasks**
- Implement logic to group chunks into super-chunks (configurable group size).
- Store grouping information for traceability.
- Enqueue downstream AI task jobs (entity extraction, relationship extraction, etc.) as soon as their required context is available (e.g., after summaries are complete for the relevant chunks/super-chunks).
- Each downstream task is a distributed queue job, assigned to the best available model/server for the task type.

### 6. **Quality Judger & Result Handling**
- For benchmark jobs, use the quality judger to evaluate and score results, updating model/task quality scores for future job assignment.
- For all jobs, orchestrator should retry on timeouts or invalid/incorrectly formatted results, and reassign jobs as needed.
- On job completion, update the knowledge graph and enqueue the next pipeline step if its context is now available.

### 7. **Testing**
- Write unit and integration tests for distributed, asynchronous job flows.
- Use the enhanced test runner and maintain 80%+ coverage.

### 8. **Documentation**
- Update or create README.md files for each module/service.
- Document the new distributed, queue-driven pipeline and orchestration logic in the main backend and API docs.
- Add usage examples and edge cases.

### 9. **Migration and Rollout**
- Plan for a migration period where both old and new pipelines can be tested.
- Provide scripts or endpoints to migrate existing data if needed.
- Monitor and validate the new distributed pipeline in staging before full production rollout.

---

## Directory Structure Example

```
c:\Users\jzick\Universe_Book_Writer\ai-server\src\pipeline\
  storeRawText.ts
  chunkText.ts
  summarizeChunk.ts
  groupChunks.ts
  summarizeSuperChunk.ts
  ...
```

---

## Open Questions / Decisions

- Should super-chunks be represented as explicit nodes, or as metadata/groupings?
- How should we handle re-chunking or re-summarization if the source text changes?
- What is the optimal group size for super-chunks (configurable per universe/book)?
- How do we handle AI model selection and prompt customization per universe or book?

---

## Next Steps

1. Review and finalize this plan with the team.
2. Create issues/tasks for each pipeline step and service.
3. Begin modularization and refactor work.
4. Write and run tests for each new module.
5. Update documentation and communicate changes to all stakeholders.

---

**Prepared: July 10, 2025**
