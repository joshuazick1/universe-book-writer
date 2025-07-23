# Multi-Pass AI RAG Ingestion & Entity Extraction Pipeline

## Overview
This document describes the step-by-step process for ingesting narrative/story text into the Multi-Universe Book Series Writing Assistant. The pipeline is designed to:
- Chunk and store story text as RAG nodes in the selected universe.
- Use the user-selected AI model for all analysis passes.
- Extract a rich set of entities (characters, organizations, locations, objects, events, etc.) and relationships.
- Generate and store character memories as if the user was conversing with them.
- Build a knowledge graph for world-building, consistency, and advanced querying.

---

## Entity Types Detected

| Entity Type         | Description                                                      | Key Fields                                                      |
|---------------------|------------------------------------------------------------------|-----------------------------------------------------------------|
| character           | Named beings (leaders, gods, soldiers, spirits, etc.)            | name, title, affiliation, role, description, location, quote     |
| organization        | Groups, factions, guilds, alliances                              | name, type, members, goal, rivalries, description, location      |
| location            | Places (cities, ruins, planets, realms, etc.)                    | name, type, parent_location, importance, events, description     |
| object              | Artifacts, items, relics, weapons, books, etc.                   | name, type, owner, origin, powers, description                   |
| event               | Historical/upcoming occurrences (wars, treaties, etc.)           | name, date, location, participants, outcome, description         |
| timeline_marker     | Ages, cycles, years, eras                                        | name, sequence, calendar, description                            |
| lore                | Myths, prophecies, rumors, religion, legends                     | name, source, involved_entities, truth_status, description       |
| dialogue            | Quoted speech or thought by characters                           | speaker, quote, location, target, tone, context                  |
| relationship        | Directed connection between two entities                         | from, to, type, confidence, source_text                          |
| theme               | Motifs (destiny, betrayal, redemption, etc.)                     | label, supporting_text                                           |
| mood                | Descriptive mood of a scene or passage                           | tone, scene_reference                                            |
| unresolved_question | Mysteries raised by the narrative                                | question, context, related_entities                              |
| source_chunk        | Segment of input text mapped to entities                         | chunk_id, text, entities, summary                                |

---

## Multi-Pass AI Analysis Pipeline

### 1. Chunk Summarization (Required)
- **Purpose:** Generate summaries for each text chunk to anchor indexing and topic identification.
- **Inputs:** text_chunk
- **Outputs:** chunk_summary
- **Method:** LLM summarization per chunk using the user-selected model.

### 1b. Intelligent Chunk Grouping & Higher-Level Summarization (Recommended)
- **Purpose:** Group related or consecutive chunks into larger narrative units (e.g., scenes, chapters, arcs) and generate broader, context-aware summaries.
- **Inputs:** chunk_summaries, chunk_nodes
- **Outputs:** grouped_chunk, group_summary
- **Method:** Use semantic similarity, narrative structure, or user hints to cluster chunks. LLM generates a summary for each group, capturing overarching themes, plot developments, and major entity interactions.

> **Downstream Context:**
> For all subsequent analysis passes, the LLM should be provided with the current chunk (or group) and the broad summaries of all previous chunks/groups as additional context. This enables better continuity, reference resolution, and narrative understanding.

### 2. Named Entity Recognition (NER) (Required)
- **Purpose:** Extract named entities (characters, locations, organizations, objects, events).
- **Inputs:** text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** character, location, organization, object, event
- **Method:** LLM entity extraction with entity typing and optional confidence scoring. **(Update: Use prior summaries for context.)**

### 3. Entity Linking & Relationship Mapping (Required)
- **Purpose:** Establish relationships and contextual metadata between entities (affiliations, roles, rivals, ownership, etc.).
- **Inputs:** entities, text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** relationship, entity_metadata
- **Method:** Follow-up LLM queries to resolve cross-entity associations. **(Update: Use prior summaries for context.)**

### 4. Lore and Timeline Extraction (Required)
- **Purpose:** Extract historical lore, cycles, prophecies, calendar markers, and major timeline events.
- **Inputs:** text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** lore, timeline_marker
- **Method:** LLM prompting for 'myth', 'legend', 'prophecy', 'age', and temporal markers. **(Update: Use prior summaries for context.)**

### 5. Dialogue Attribution (Optional)
- **Purpose:** Extract character dialogue, inner thoughts, and attributed quotations with tone/context.
- **Inputs:** text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** dialogue
- **Method:** Quote detection with LLM attribution (who spoke, to whom, in what tone). **(Update: Use prior summaries for context.)**

### 6. Unresolved Question Detection (Optional)
- **Purpose:** Extract mysteries, hints, foreshadowing, and narrative breadcrumbs for future plot advancement.
- **Inputs:** text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** unresolved_question
- **Method:** Prompt LLM: "What remains unexplained or unresolved in this scene?" **(Update: Use prior summaries for context.)**

### 7. Mood and Theme Classification (Optional)
- **Purpose:** Classify tone, mood, and thematic elements in each chunk for storytelling structure analysis.
- **Inputs:** text_chunk **plus prior group/chunk summaries as context**
- **Outputs:** mood, theme
- **Method:** LLM classification using genre/theme/tone prompt templates. **(Update: Use prior summaries for context.)**

### 8. Character Memory Generation (Final Step)
- **Purpose:** Build out each extracted character with a set of memories derived from their experiences, dialogue, and narrative events.
- **Inputs:** character nodes, all related events, dialogue, and context (including prior summaries)
- **Outputs:** character_memory
- **Method:** For each character, aggregate their actions, dialogue, and experiences across all processed chunks/groups. Use the LLM to generate a set of memory objects (knowledge, experiences, relationships, and dialogue) as if the character were reflecting on their own story. These memories are attached to the character node and can be queried or updated by both automated and user-driven interactions.

---

## Character Memory Generation
- When a character is detected, their "memories" (knowledge, experiences, and dialogue) are generated and stored in the same way as if the user was having a direct conversation with them.
- This ensures consistency between AI-driven extraction and interactive user sessions.
- Memories are attached to character nodes and can be queried or updated by both automated and user-driven interactions.

---

## Implementation Notes
- **All AI passes must use the user-selected model** (from the frontend) for every LLM operation.
- Each pass can be run sequentially or in parallel, but required passes must always complete.
- Entity and relationship nodes are created only if they do not already exist in the universe.
- All extracted data is linked back to the originating chunk for traceability.
- The pipeline is extensible: new passes or entity types can be added as needed.
- **Context-Aware Analysis:** All downstream passes (entity extraction, relationship mapping, lore, dialogue, etc.) should include the broad summaries of all previous chunks/groups as context in their LLM prompts for improved accuracy and narrative coherence.

---

## Example Workflow
1. User submits story text and selects an AI model.
2. Text is chunked and each chunk is stored as a RAG node in the selected universe.
3. Each chunk is summarized (Pass 1).
4. Entities are extracted from each chunk (Pass 2).
5. Relationships between entities are mapped (Pass 3).
6. Lore, timeline markers, dialogue, questions, mood, and themes are extracted (Passes 4-7).
7. Character memories are generated and stored as if in a conversation.
8. All nodes and relationships are linked and available for querying, editing, and visualization.

---

## Extending the Pipeline
- To add a new entity type or analysis pass, define its schema and add a new LLM prompt template.
- Update the extraction and node creation logic to handle the new type.
- Document the new pass in this file and update the API documentation as needed.

---

## Concise Implementation Checklist

Use this checklist to implement or update the RAG pipeline. For each step, see the referenced files for where to add or modify logic.

1. **Chunking**
   - [x] Smart chunking logic (paragraph/sentence boundaries)
   - **File:** [`textChunker.ts`](../../src/services/textToRagParser/utils/textChunker.ts)

2. **Chunk Summarization**
   - [x] Per-chunk summary using selected model
   - **File:** [`ragTextController.ts`](../../src/controllers/ragTextController.ts)

3. **Entity Extraction (NER)**
   - [x] Extract entities with type, rich description, aliases/nicknames
   - [x] Store in entity node fields
   - **File:** [`entityExtractor.ts`](../../src/services/entityExtractor.ts), [`ragTextController.ts`](../../src/controllers/ragTextController.ts)

4. **Entity Deduplication & Linking**
   - [x] Check for existing nodes by name/alias before creating new
   - [x] Use hybrid (AI + fuzzy + manual) deduplication
   - [x] Update nodes with new aliases/descriptions as needed
   - **File:** [`ragNodeService.ts`](../../src/services/ragNodeService.ts), [`entityExtractor.ts`](../../src/services/entityExtractor.ts)

5. **Relationship Mapping**
   - [x] Extract and store relationships (affiliations, rivalries, etc.)
   - **File:** [`relationshipExtractor.ts`](../../src/services/relationshipExtractor.ts), [`ragTextController.ts`](../../src/controllers/ragTextController.ts)



6. **Lore, Timeline, Dialogue, Theme Extraction**
   - [x] Extract and store lore, timeline markers, dialogue, mood, themes
   - **Files:** [`loreExtractor.ts`](../../src/services/loreExtractor.ts), [`dialogueExtractor.ts`](../../src/services/dialogueExtractor.ts), [`ragTextController.ts`](../../src/controllers/ragTextController.ts)

---

## Robust Temporal Reasoning & Timeline Visualization Plan

### 1. Backend: Temporal Reasoning & Retroactive Timeline Anchoring

- **Maintain a Temporal Context Stack/Sequence:**
  - For each chunk/chapter, keep a running list/stack of timeline_marker nodes (both relative and absolute) as you process the narrative.
  - When a new absolute marker is found, traverse backward through the stack to find relative markers that have not yet been anchored to an absolute date.

- **Retroactive Update Logic:**
  - For each unanchored relative marker before the new absolute marker:
    - Infer its absolute date (if possible) based on the relative expression and the new absolute date.
    - Update the timeline_marker node with the inferred date and create a `temporal` relationship to the absolute marker.
    - Mark these as "inferred" for traceability in the knowledge graph.

- **Knowledge Graph Update:**
  - Store both explicit and inferred dates in timeline_marker nodes.
  - Add a field (e.g., `inferred: true`) to distinguish inferred dates.
  - Ensure all such links are traceable for frontend visualization.

- **Example:**
  - Chapter 1: "A few days passed." (relative)
  - Chapter 2: "On the 5th of Frostfall..." (absolute)
  - System links Chapter 1’s marker to Chapter 2’s, inferring Chapter 1 occurred shortly before the 5th of Frostfall.

---

### 2. Frontend: Timeline Visualization in RAGTab

- **Data Model:**
  - Fetch timeline_marker nodes, including both explicit and inferred dates, and their relationships.
  - Each marker should indicate if its date is explicit or inferred.

- **Visualization:**
  - Use a timeline library (e.g., vis-timeline or d3-timeline) to render the timeline.
  - Use different icons/colors for explicit vs. inferred dates.
  - Allow clicking on a marker to see its source chunk, related events/entities, and whether its date was inferred.

- **Traceability:**
  - Show the chain of inference (e.g., "This event’s date was inferred from Chapter 2’s absolute date").

---

### 3. Character Chat Interface: Character-Centric Timeline

- **Data Model:**
  - For each character, aggregate all related timeline_marker nodes (events, memories, etc.).
  - Include both explicit and inferred dates.

- **Visualization:**
  - Render a timeline (vertical or horizontal) in CharacterChatInterface.tsx.
  - Highlight events that are inferred vs. explicit.
  - Allow filtering by event type, time period, or relationship.

---

### 4. Testing & Documentation

- Add unit tests for the new temporal reasoning logic (retroactive anchoring, inference, etc.).
- Update documentation and relevant READMEs to document:
  - The retroactive anchoring process.
  - How inferred dates are handled and visualized.
  - Example API responses and UI screenshots (if possible).

---

### 5. References

- See: "Handling Relative and Absolute Timeline Markers Across Chunks", "Temporal Reasoning & Timeline Visualization" in this file.
- See: PHASE_A2_6_FINAL_POLISH_AND_DEFERRED_TASKS.md ("Timeline view", "Character-centric timeline", "Temporal relationship mapping").
- See: PLUGIN_ARCHITECTURE_DEEP_DIVE.md (for plugin-specific timeline logic).

   ---

   ### Handling Relative and Absolute Timeline Markers Across Chunks

   When a general sense of elapsed time is given in one chunk (e.g., "a few days later") and a specific date or timeline marker is introduced in a subsequent chunk, the pipeline should:

   1. **Contextual Linking:**
      - When a timeline_marker (e.g., a specific date) is extracted in a later chunk, the system searches previous chunks for relative time references ("a few days later", "the next morning").
      - The pipeline links these relative references to the absolute marker using a `temporal` or `reference` relationship in the knowledge graph.

   2. **Temporal Reasoning:**
      - The backend maintains a temporal context stack or sequence for each chunk/chapter.
      - When an absolute date is introduced, the system can retroactively assign or update timeline_marker nodes for previous events/chapters, anchoring their relative times to the new absolute reference.

   3. **Knowledge Graph Update:**
      - The knowledge graph will contain both relative and absolute timeline markers, linked together.
      - This enables timeline visualizations to show both inferred and explicit dates, and allows for retroactive adjustment as more information is revealed.

   4. **Traceability:**
      - All such links are traceable, so users can see which events/chapters had their times inferred or updated based on later information.

   **Example:**

   - Chapter 1: "A few days passed." (no date)
   - Chapter 2: "On the 5th of Frostfall, the council met." (absolute date)
   - The system links Chapter 1’s events to Chapter 2’s timeline_marker, inferring that Chapter 1 occurred shortly before the 5th of Frostfall.

   **Implementation Steps:**

   - Enhance the temporal parser to recognize and link relative time expressions to absolute markers when they appear.
   - Update the cross-chunk linking logic to support retroactive timeline anchoring.
   - Visualize inferred vs. explicit dates in the timeline UI, with clear indicators.

7. **Character Memory Generation**
   - [x] Aggregate events/dialogue for each character
   - [x] Generate and attach memory objects
---

## Next Steps: Advanced Enhancements & Visualization

### 1. Contextual Cross-Chunk Linking
- **Goal:** Link lore, timeline markers, and dialogue to related entities/events across multiple chunks.
- **Steps:**
  1. Track entity/event references during extraction.
  2. Update the backend to create cross-links in the knowledge graph.
  3. Expose these links in the API for frontend visualization.

### 2. Temporal Reasoning & Timeline Visualization
- **Goal:** Normalize and visualize narrative time (dates, ages, sequence markers).
- **Steps:**
  1. Integrate a temporal parser in the backend to extract/normalize time expressions.
  2. Store structured timeline data in timeline_marker nodes.
  3. Add a timeline visualization component to `RAGTab.tsx` (e.g., using vis-timeline or d3-timeline).

### 3. Dialogue Attribution Confidence & Review
- **Goal:** Add confidence scores for speaker attribution and flag ambiguous dialogue.
- **Steps:**
  1. Update dialogue extraction to include confidence scores.
  2. Mark low-confidence dialogue for manual review in the UI.
  3. Add a review/approval UI in `RAGTab.tsx` for flagged dialogue.

### 4. Theme & Mood Evolution Tracking
- **Goal:** Visualize how themes and moods evolve across the narrative.
- **Steps:**
  1. Aggregate theme/mood data per chunk/chapter in the backend.
  2. Expose this data via the API.
  3. Add a theme/mood evolution chart to `RAGTab.tsx` (e.g., line or area chart).

### 5. Advanced Lore Deduplication
- **Goal:** Merge or flag duplicate/conflicting lore entries.
- **Steps:**
  1. Use semantic similarity to detect similar lore nodes in the backend.
  2. Present possible duplicates for manual review in the UI.
  3. Allow merging or flagging of lore entries in `RAGTab.tsx`.

### 6. Unresolved Question Extraction
- **Goal:** Systematically extract and track unresolved questions/mysteries.
- **Steps:**
  1. Add a dedicated extraction pass for unresolved questions in the backend.
  2. Store and link these to relevant entities/events.
  3. Display unresolved questions in a dedicated section in `RAGTab.tsx`.

### 7. User Feedback Loop
- **Goal:** Allow users to review, correct, and enrich extracted data.
- **Steps:**
  1. Add UI controls in `RAGTab.tsx` for editing/approving extracted lore, dialogue, and themes.
  2. Feed corrections back to the backend for future runs.

### 8. Plugin Hooks for Universe-Specific Rules
- **Goal:** Support custom extraction/validation logic per universe.
- **Steps:**
  1. Define plugin hook interfaces in the backend.
  2. Allow plugins to register custom extraction/validation logic.
  3. Document plugin API and usage.

### 9. Automated Consistency Checks
- **Goal:** Detect contradictions/inconsistencies in extracted data.
- **Steps:**
  1. Implement consistency checks in the backend (e.g., timeline conflicts, character contradictions).
  2. Surface detected issues in `RAGTab.tsx` for user review.

### 10. Rich Visualization
- **Goal:** Visualize lore, timelines, dialogue networks, and theme arcs interactively.
- **Steps:**
  1. Add interactive graph/timeline components to `RAGTab.tsx` (e.g., vis-network, d3, recharts).
  2. Integrate with backend APIs to fetch and display graph/timeline data.
  3. Allow users to explore, filter, and interact with the knowledge graph.
   - **File:** [`aiGenerateCharacterMemories.ts`](../../src/services/aiGenerateCharacterMemories.ts), [`ragTextController.ts`](../../src/controllers/ragTextController.ts)

8. **Traceability & Knowledge Graph**
   - [ ] Link all nodes/relationships back to originating chunk(s)
   - [ ] Maintain graph structure for querying/visualization
   - **File:** [`ragNodeService.ts`](../../src/services/ragNodeService.ts)

9. **Review & Iteration**
   - [ ] Regularly review output for accuracy and completeness
   - [ ] Update prompt templates and logic as needed
   - **Files:** [`entityExtractor.ts`](../../src/services/entityExtractor.ts), [`ragTextController.ts`](../../src/controllers/ragTextController.ts), [`aiGenerateCharacterMemories.ts`](../../src/services/aiGenerateCharacterMemories.ts)

---

**Tip:** For new passes or entity types, create a new file in `src/services/` and update the controller and documentation accordingly.
