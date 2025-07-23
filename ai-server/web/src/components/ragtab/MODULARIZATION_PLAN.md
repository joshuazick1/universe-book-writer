# RAG System Feature Showcase Dashboard: Full Rewrite Plan

This document describes a full rewrite of the RAGTab UI as a modern, feature-rich dashboard that demonstrates all major features of the AI RAG system. The new dashboard will be visually impressive, highly interactive, and ready for demos or onboarding new users.

---

## Vision

Create a single-page, highly interactive dashboard that:
- Visually demonstrates all RAG pipeline features (timeline, lore, dialogue, themes, etc.)
- Provides real-time feedback and traceability for every AI extraction pass
- Allows deep exploration, editing, and cross-linking of all knowledge graph entities
- Is beautiful, accessible, and ready for demos or onboarding

---

## Key Features to Showcase

1. **Timeline Visualization**
   - Vertical and horizontal timeline views
   - Explicit vs. inferred dates (color/icon distinction)
   - Clickable markers: show source text, related events/entities, traceability chain

2. **Lore & Mythology Browser**
   - List and search all lore nodes
   - Show relationships to timeline, characters, and events
   - Inline editing and tagging

3. **Dialogue Explorer**
   - Filterable list of all extracted dialogue
   - Attribution confidence, speaker/target, tone, context
   - Flag ambiguous/low-confidence dialogue for review

4. **Theme & Mood Evolution**
   - Chart/graph showing theme and mood changes over time
   - Filter by theme, mood, or narrative arc

5. **Node Management**
   - Create, edit, delete, and tag nodes (character, event, location, etc.)
   - Bulk import/export
   - Node detail drawer with all relationships and history

6. **Advanced Search & Filtering**
   - Full-text and property-based search
   - Filter by type, tag, time, relationship, confidence, etc.
   - Save and share search queries

7. **Traceability & Provenance**
   - For any node, show the originating chunk, extraction pass, and all cross-links
   - Visualize inference chains (e.g., how a date was inferred)

8. **Real-Time Pipeline Feedback**
   - Live log of AI extraction passes
   - Progress bars, error/warning display, and step-by-step breakdown

9. **Knowledge Graph Visualization**
   - Interactive graph/network view of all entities and relationships
   - Obsidian-style force-directed graph: nodes as cards, edges as links
   - Click to expand/collapse, filter by type or tag
   - Drag to pan/zoom, click to focus, highlight related nodes/edges
   - Show backlinks and bidirectional relationships visually

10. **Plugin/Universe Support**
    - Show universe-specific rules, plugins, and custom fields
    - Theme switching for different universes

---

## Proposed File Structure

```
ai-server/web/src/features/rag-dashboard/
├── RAGDashboard.tsx           # Main orchestrator
├── TimelineView.tsx           # Timeline visualization
├── LoreBrowser.tsx            # Lore/mythology explorer
├── DialogueExplorer.tsx       # Dialogue listing and review
├── ThemeMoodChart.tsx         # Theme/mood evolution chart
├── NodeManager.tsx            # Node CRUD and detail drawer
├── NodeSearch.tsx             # Advanced search/filter UI
├── TextParserPanel.tsx        # Text-to-RAG pipeline UI (input, chunking, progress, results)
├── TraceabilityPanel.tsx      # Provenance and inference chain
├── PipelineLog.tsx            # Real-time pipeline feedback
├── KnowledgeGraphView.tsx     # Interactive graph/network (classic)
├── ObsidianGraphView.tsx      # Obsidian-style force-directed relationship graph
├── UniversePluginPanel.tsx    # Plugin/universe-specific UI
├── hooks/
│   ├── useRAGNodes.ts
│   ├── useTimeline.ts
│   ├── useLore.ts
│   ├── useDialogue.ts
│   ├── useThemes.ts
│   ├── usePipelineLog.ts
│   └── ...
├── index.ts
└── README.md
```

---

## Example: Main Dashboard Layout

```tsx
// RAGDashboard.tsx (pseudo-code)
import TimelineView from './TimelineView';
import LoreBrowser from './LoreBrowser';
import DialogueExplorer from './DialogueExplorer';
import ThemeMoodChart from './ThemeMoodChart';
import NodeManager from './NodeManager';
import NodeSearch from './NodeSearch';
import TraceabilityPanel from './TraceabilityPanel';
import PipelineLog from './PipelineLog';
import KnowledgeGraphView from './KnowledgeGraphView';
import UniversePluginPanel from './UniversePluginPanel';

const RAGDashboard = () => (
  <div className="flex flex-col h-full">
    <header className="p-4 bg-blue-900 text-white flex justify-between items-center">
      <h1 className="text-2xl font-bold">RAG System Dashboard</h1>
      <UniversePluginPanel />
    </header>
    <main className="flex flex-1 overflow-hidden">
      <aside className="w-80 bg-gray-50 p-4 overflow-y-auto">
        <NodeSearch />
        <NodeManager />
        <PipelineLog />
      </aside>
      <section className="flex-1 p-6 overflow-y-auto">
        <TimelineView />
        <ThemeMoodChart />
        <LoreBrowser />
        <DialogueExplorer />
        <KnowledgeGraphView />
        <TraceabilityPanel />
      </section>
    </main>
  </div>
);
export default RAGDashboard;
```

---

## Implementation Steps

1. **Scaffold the new directory and files.**
2. **Implement TimelineView** with explicit/inferred markers, click-to-expand, and traceability.
3. **Build LoreBrowser** and DialogueExplorer with search, filter, and inline editing.
4. **Add ThemeMoodChart** using a charting library (e.g., recharts, nivo).
5. **Develop NodeManager** for CRUD, tagging, and detail view.
6. **Integrate NodeSearch** with advanced filters and saved queries.
7. **Preserve and enhance Text-to-RAG (Text Parser) feature:**
   - Add a dedicated TextParserPanel.tsx for text-to-RAG pipeline
   - Allow users to input, chunk, and process text into RAG nodes
   - Show real-time pipeline log, progress, and results
   - Integrate with the rest of the dashboard (nodes, timeline, graph, etc.)

---

### 7a. **Integrate Canonical Book Text File Storage, Chunk Diffing, and Intelligent Chunk Update Workflow**

**Overview:**
To support robust, scalable, and versioned ingestion of book/chapter text, we will implement a file-backed canonical text storage system, with intelligent chunk diffing and update logic. This enables efficient updates, traceability, and seamless integration with the RAG pipeline and knowledge graph.

**Relevant Files to Update or Create:**

**Frontend:**
- [`ai-server/web/src/features/rag-dashboard/TextParserPanel.tsx`](../../features/rag-dashboard/TextParserPanel.tsx) — Add file upload/edit controls, chunk diff preview, and versioning UI.
- [`ai-server/web/src/features/rag-dashboard/FileStoragePanel.tsx`](../../features/rag-dashboard/FileStoragePanel.tsx) *(new)* — Dedicated panel for file management, versioning, diff/rollback, and migration workflows.
- [`ai-server/web/src/features/rag-dashboard/hooks/useFileStorage.ts`](../../features/rag-dashboard/hooks/useFileStorage.ts) *(new)* — Custom hook for file upload, versioning, diff preview, rollback, and migration logic.
- [`ai-server/web/src/services/ragService.ts`](../../services/ragService.ts) — Extend API client for file version CRUD, diffing, rollback, and migration endpoints.
- [`ai-server/web/src/features/rag-dashboard/RAGDashboard.tsx`](../../features/rag-dashboard/RAGDashboard.tsx) — Integrate new/updated panels and controls into dashboard layout, including versioning/migration UI.
- [`ai-server/web/src/features/rag-dashboard/NodeManager.tsx`](../../features/rag-dashboard/NodeManager.tsx) — Ensure node CRUD supports file/chunk references, versioning, and migration.
- [`ai-server/web/src/features/rag-dashboard/TimelineView.tsx`](../../features/rag-dashboard/TimelineView.tsx) — Show chunk update events, file version history, and migration events if relevant.
- [`ai-server/web/src/features/rag-dashboard/TraceabilityPanel.tsx`](../../features/rag-dashboard/TraceabilityPanel.tsx) — Show provenance, rollback, and migration history for file/chunk changes.
- [`ai-server/web/src/features/rag-dashboard/README.md`](../../features/rag-dashboard/README.md) — Document new workflow and UI.

**Backend:**
- [`ai-server/src/controllers/ragTextController.ts`](../../../src/controllers/ragTextController.ts) — Add endpoints for file upload, diff, versioning, and chunk update.
- [`ai-server/src/services/ragNodeService.ts`](../../../src/services/ragNodeService.ts) — Implement chunk diffing, partial re-chunking, and version management logic.
- [`ai-server/src/rag/core/types.ts`](../../../src/rag/core/types.ts) — Update types for file/chunk versioning and metadata.
- [`ai-server/src/rag/core/fileStorage.ts`](../../../src/rag/core/fileStorage.ts) *(new)* — File storage and versioning utilities.
- [`ai-server/src/rag/core/chunkDiff.ts`](../../../src/rag/core/chunkDiff.ts) *(new)* — Chunk diffing and update logic.
- [`ai-server/src/rag/core/chunking.ts`](../../../src/rag/core/chunking.ts) — Ensure chunking logic supports partial updates and stable IDs.
- [`ai-server/README.md`](../../../README.md) — Document backend workflow and API changes.

**API Documentation:**
- [`ai-server/openapi.yaml`](../../../openapi.yaml) or [`ai-server/docs/api/`](../../../docs/api/) — Add/extend OpenAPI docs for new endpoints.

**General:**
- [`docs/DECISION_LOG.md`](../../../../../docs/DECISION_LOG.md) — Record architectural decisions and workflow rationale.
- [`docs/PROGRESS.md`](../../../../../docs/PROGRESS.md) — Update progress tracking for new features.

*Update these links as files are created or moved. See also the Proposed File Structure above for context.*

**Frontend Integration:**
- Add file upload and edit controls to the dashboard (in TextParserPanel or a new FileStoragePanel).
- Allow users to upload, view, and edit canonical book/chapter text files (support .txt, .md, etc.).
- Display file version history and enable undo/rollback for previous versions.
- Show a preview of chunk updates before applying them (diff view: added/removed/modified chunks).
- Provide UI for confirming chunk updates and triggering re-chunking/re-ingestion.
- Link file storage UI to universe/book/chapter hierarchy (ensure correct association).

**Backend Integration:**
- Store canonical text files in a dedicated storage location (filesystem or object storage, e.g., /data/book-text/ or S3 bucket).
- Reference file paths/IDs in RAG node metadata (book/chapter nodes reference their canonical text file).
- On file upload/edit:
  - Compute a diff between the new and previous file versions.
  - Identify which text chunks are added, removed, or modified (using a chunking/diffing algorithm).
  - Only update affected chunks in the RAG node graph (partial re-chunking, preserve stable chunk IDs where possible).
  - Update relationships and provenance for new/changed chunks.
  - Maintain a version history for each file and associated chunk set.
- Expose API endpoints for:
  - Uploading/replacing canonical text files
  - Fetching file metadata, version history, and diff previews
  - Triggering chunk diffing and update workflows
  - Rolling back to previous file/chunk versions

**Chunk Diffing & Update Workflow:**

**Book-to-Chapter Migration Workflow:**
- When a user wants to add chapters to a book that previously had no chapters:
  1. Provide a UI to create chapters for the book and select which book-level chunks to move.
  2. For each selected chunk:
     - Remove the chunk→book relationship.
     - Add a chunk→chapter relationship (and update the chunk’s `chapterId` in metadata).
     - Ensure the new chapter is linked to the book (chapter→book).
  3. Optionally, allow splitting book-level content into multiple chapters (e.g., by selecting ranges or using chunk metadata).
  4. After migration, all chunks should be linked to chapters, and chapters to the book. The book node should no longer have direct chunk children unless some content is intentionally left unassigned to a chapter.
  5. The backend should expose an endpoint or mutation to reassign chunk parentage and update relationships/metadata accordingly.
  6. No data is lost; the knowledge graph is simply reorganized to reflect the new structure.

**Chunk Diffing & Update Workflow:**
- When a file is edited or replaced:
  1. Retrieve the previous version and chunk set.
  2. Run a diffing algorithm to detect added, removed, and changed text regions.
  3. Re-chunk only the changed regions, preserving stable chunk IDs for unchanged text.
  4. Update the RAG node graph:
     - Add new chunk nodes for new/changed text
     - Remove or archive nodes for deleted text
     - Update relationships (chapter/book/universe, knowledge graph links)
  5. Log all changes for traceability and allow undo/rollback.

**Versioning & Traceability:**
- Every file and chunk set is versioned; all changes are logged.
- UI and API support for viewing, comparing, and rolling back versions.
- Provenance chains are updated to reflect chunk/file history.

**Testing & Documentation:**
- Add unit and integration tests for file upload, diffing, chunk update, and rollback.
- Document the workflow in the dashboard and backend README files.
- Update API docs (Swagger/OpenAPI) for new endpoints.

**Benefits:**
- Efficient, scalable updates for large book/chapter files
- Accurate traceability and provenance for all text and RAG nodes
- User-friendly UI for managing canonical text and chunk updates
- Robust versioning and undo support

---
8. **Create TraceabilityPanel** to show provenance and inference chains.
9. **Add PipelineLog** for real-time feedback.
10. **Implement KnowledgeGraphView** with interactive graph visualization.
11. **Add ObsidianGraphView** for force-directed, Obsidian-style relationship graph:
    - Use a library like d3-force, react-force-graph, or cytoscape.js
    - Nodes as draggable cards, edges as lines
    - Show backlinks, bidirectional links, and allow node focus/expansion
    - Integrate with rest of dashboard for context and filtering
12. **Support UniversePluginPanel** for plugin/universe-specific features.
13. **Write custom hooks** for all data fetching and state management.
14. **Document all components and add unit tests.**
15. **Polish UI with Tailwind, accessibility, and responsive design.**

---

## Demo/Showcase Features

- Pre-populate with sample data for all entity types.
- Include tooltips, onboarding hints, and example queries.
- Add a "Demo Mode" toggle to highlight key features.

---

## Next Steps

- Review and approve this plan.
- Scaffold the new dashboard and migrate features incrementally.
- Use this as the new flagship UI for the RAG system.

---

**This rewrite will provide a best-in-class, demo-ready interface that fully demonstrates the power and flexibility of your AI RAG backend.**
If you want a code starter for any of these components, just ask!
