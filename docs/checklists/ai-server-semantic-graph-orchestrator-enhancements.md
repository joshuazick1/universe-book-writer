# AI Server Enhancement Checklist: Semantic Graph & Orchestrator Upgrades

> **This file is the canonical source for requirements, status, and planning for this phase.**

## Overview
This checklist outlines the steps required to implement a semantic graph system with zoom-level abstraction, changelog tracking, peripheral context expansion, and agent-guided relevance selection, as well as advanced orchestrator features for the AI server. The goal is to enable real-time, context-aware, and agent-driven creative/coding environments.

---


## 0. Foundational Enhancements & Cross-Cutting Concerns

### 0.1. Security & Access Control
- [ ] Integrate all new APIs and features with the existing authentication/authorization layer.
- [ ] Enforce role-based access control for graph/orchestrator endpoints using the project’s auth system.
- [ ] Add audit logging for sensitive actions (node/edge changes, model routing, plugin hooks).

### 0.2. Data Validation & Integrity
- [ ] Add validation schemas (e.g., Zod/Joi) for all API payloads.
- [ ] Implement optimistic concurrency control or versioning for graph edits.

### 0.3. Performance & Scalability
- [ ] Plan for sharding/partitioning large graphs in MongoDB.
- [ ] Add caching for frequent graph/model queries and metadata.

### 0.4. Observability & Monitoring
- [ ] Integrate metrics collection (e.g., Prometheus) for API usage, latency, and error rates.
- [ ] Add health checks and alerting for orchestrator/model failures.

### 0.5. Extensibility & Plugin Hooks
- [ ] Design plugin hooks for custom node/edge types, orchestrator strategies, and UI extensions.
- [ ] Allow user-defined tags and metadata on nodes/edges.
- [ ] Plan and implement a plugin that can hijack the book writing app for use as a “vibe coder” (code-centric creative/collaborative environment).

### 0.6. Usability & Developer Experience
- [ ] Provide a CLI tool for graph/orchestrator management (import/export, migrations, diagnostics).
- [ ] Add API versioning from the start.

### 0.7. Data Privacy & Compliance
- [ ] Support data anonymization and export/delete requests for compliance (e.g., GDPR).

### 0.8. Collaboration
- [ ] Add support for collaborative editing (real-time locking, merge conflict resolution).

### 0.9. Testing & Quality
- [ ] Set up contract tests for API endpoints.
- [ ] Add load and stress tests for graph and orchestrator APIs.

---

## 1. Semantic Graph System

### 1.1. Schema & Data Model
- [ ] Define TypeScript interfaces for `Node`, `Edge`, `ChangelogEvent`, `GraphRenderHint`, and `DecisionTrail`.
- [ ] Implement zoom-level abstraction (levels 0–4) in the schema.
- [ ] Add support for universe-specific and private nodes.
- [ ] Document schema in `ai-server/models/semantic-graph/README.md`.

### 1.2. Storage & Persistence
- [ ] Design MongoDB collections for nodes, edges, changelog events, and decision trails.
- [ ] Implement CRUD operations for graph elements.
- [ ] Ensure efficient indexing for fast traversal and search.
- [ ] Add migration scripts and update documentation.

### 1.3. API Endpoints
- [ ] Create REST endpoints for:
  - [ ] Node/edge CRUD
  - [ ] Changelog event logging
  - [ ] Graph queries (with zoom/context parameters)
  - [ ] Render hints and peripheral expansion
- [ ] Document endpoints using Swagger/OpenAPI.

### 1.4. Real-Time & Agent Context
- [ ] Implement agent-guided context selection and relevance scoring.
- [ ] Add support for peripheral context expansion and cluster collapsing.
- [ ] Enable real-time updates via WebSockets or Server-Sent Events.

### 1.5. Changelog & Decision Trail
- [ ] Log all graph mutations as changelog events.
- [ ] Track agent/user actions and reasoning in decision trails.
- [ ] Provide endpoints to query changelogs and decision trails.

### 1.6. Visualization & Planning
- [ ] Integrate with frontend for semantic graph visualization (zoom, fade, cluster, etc.).
- [ ] Provide API for graph render hints and context-aware expansion.

---

## 2. Orchestrator Feature Enhancements

### 2.1. Model Registry
- [ ] Extend model metadata (language, task affinity, latency, quality, tags).
- [ ] Add endpoints for model registration and querying.

### 2.2. Task Scoring Engine
- [ ] Implement hybrid scoring (heuristics + AI) for model selection.
- [ ] Log and expose scoring rationale in API responses.

### 2.3. Multi-Prompt Dispatch
- [ ] Parse compound prompts into atomic tasks.
- [ ] Dispatch tasks in parallel to best-matching models.
- [ ] Aggregate and return results.

### 2.4. Benchmarking Engine
- [ ] Execute generated code in sandboxed environments.
- [ ] Log success/failure/latency per model.
- [ ] Expose benchmarking results via API.

### 2.5. Feedback Loop
- [ ] Track model success rates and tune routing dynamically.
- [ ] Store feedback data and expose for analytics.

### 2.6. Dynamic Code Support
- [ ] Allow models to generate and run code blocks with input/output schemas.
- [ ] Validate and sandbox execution.

### 2.7. Agent Task Modes
- [ ] Support specialized agents (planner, critic, executor, etc.).
- [ ] Route tasks to appropriate pipelines/models.

### 2.8. Model Vote & Critic
- [ ] Enable multiple models to answer; use a critic model to select the best.
- [ ] Log voting/critique process for transparency.

### 2.9. Model Categorization
- [ ] Tag models by strengths (e.g., JS, story-writing, summarization).
- [ ] Use tags in task-to-model resolution.

### 2.10. API Router
- [ ] Expose REST/gRPC API for task payloads, model selection, and explanations.
- [ ] Maintain legacy pass-through for simple requests.

### 2.11. Virtual Model Interface
- [ ] Expose a virtual 'router-core' model for advanced orchestration via tag-based API (e.g., `/api/tags`).

---

## 3. Integration & Testing
- [ ] Write unit and integration tests for all new modules (target 80%+ coverage).
- [ ] Add test cases for graph operations, orchestrator routing, and agent behaviors.
- [ ] Update enhanced test runner scripts and coverage reports.

---

## 4. Documentation & Progress Tracking
- [ ] Update module-level README files with usage and API examples.
- [ ] Document new endpoints in Swagger/OpenAPI.
- [ ] Record architectural decisions in `docs/DECISION_LOG.md`.
- [ ] Update `docs/PROGRESS.md` and `PROJECT_CHECKLIST.md` as features are completed.
- [ ] Add diagrams for graph system and orchestrator flow.

---

## 5. Additional Ideas & Plugin System
- [ ] Integrate semantic graph with world-building plugins for universe-specific logic.
- [ ] Enable AI-assisted suggestions for graph expansion and context selection.
- [ ] Provide export/import tools for graph data (JSON, GraphML, etc.).
- [ ] Add user permission controls for private nodes/edges.
- [ ] Support time-travel/debugging via changelog replay.


- [ ] Build and document a plugin hook system for the AI server and book writing app.

### Vibe Coder Plugin: Coding Environment Plugin for Book Writer

#### Phase 1: Proof of Concept (MVP)
- [ ] Implement a minimal plugin that hijacks the book writing app UI for code editing:
  - [ ] Replace or augment the main editor with a Monaco/CodeMirror-based code editor.
  - [ ] Enable syntax highlighting for major languages (JS/TS, Python, Markdown, etc.).
  - [ ] Add basic file open/save (to local or project workspace).
  - [ ] Integrate with the AI server for code completion and inline suggestions.
  - [ ] Allow toggling between book writing and coding modes.
  - [ ] Document plugin structure and extension points.

#### Phase 2: Core Coding Features
- [ ] Add multi-file/project navigation (file tree sidebar).
- [ ] Implement code linting and error highlighting (using ESLint, etc.).
- [ ] Add code formatting (Prettier, Black, etc.).
- [ ] Enable AI-powered code refactoring and documentation generation.
- [ ] Support code snippet management and insertion.
- [ ] Add basic terminal/REPL integration (for running code snippets or scripts).
- [ ] Integrate with version control (Git basics: status, commit, diff).

#### Phase 3: Collaboration & Advanced AI
- [ ] Enable real-time collaborative coding (using the existing collaboration server).
- [ ] Add AI-powered code review and inline commenting.
- [ ] Support pair programming with AI (AI as a coding partner or reviewer).
- [ ] Implement context-aware code search and navigation (semantic graph integration).
- [ ] Allow plugin-based extension of coding features (e.g., language packs, linters, formatters).
- [ ] Add support for live coding sessions and code streaming.

#### Phase 4: Full Integration & UX Polish
- [ ] Seamlessly switch between book writing and coding environments.
- [ ] Share code snippets or projects directly into book content (and vice versa).
- [ ] Add onboarding/tutorial for new users.
- [ ] Ensure accessibility and keyboard navigation throughout the coding UI.
- [ ] Polish UI/UX for a modern, distraction-free coding experience.

---

---

## 6. Phase Checklist Cross-Reference

- [ ] Review Phase C (AI Foundation) and other phase checklists for conflicts or overlap with these enhancements.
- [ ] Ensure new security, plugin, and extensibility features are coordinated with Phase C’s permission-aware AI, plugin security, and privacy-preserving context management.
- [ ] Where overlap exists, update documentation to reference the new unified approach (e.g., use the existing auth layer for all new endpoints, and extend—not duplicate—the plugin system).
- [ ] Document any checklist items that are superseded or negated by these enhancements in `docs/DECISION_LOG.md`.

---

*Last updated: 2025-06-30*
