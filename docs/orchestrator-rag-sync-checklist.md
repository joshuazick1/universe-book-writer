# Orchestrator & RAG Synchronization and Test Safety Plan

## Overview
This document details the plan for synchronizing the orchestrator's server/model state with the RAG (Retrieval-Augmented Generation) knowledge base, and for ensuring that test runs do not overwrite or erase production configuration and data.

---

## Goals
- **Hybrid State Management:** Use the RAG (database) as the persistent source of truth for servers/models, while leveraging in-memory caching in the orchestrator for fast access and runtime operations.
- **Dynamic Node Management:** Server/model nodes in the RAG should be marked as active/inactive based on orchestrator state, not deleted. In-memory state should always reflect the current active set.
- **Safe Testing:** Test runs should not affect production configuration or persistent data. Test environments should use isolated in-memory and database states.
- **Reliable Endpoint Discovery:** The RAG can be used to discover available endpoints, but only if it accurately reflects the current state. The orchestrator should be able to serve endpoints from cache or RAG as needed.

---

## Implementation Checklist (Hybrid Approach)

### 1. RAG Node Status Field
- [ ] Drop and reinitialize the RAG database to start with a clean slate (no migration of old nodes).
- [ ] Update RAG node schema to include `active: boolean` or `status: 'active' | 'inactive'`.
- [ ] Ensure all new nodes are created with `active: true` by default.
- [ ] Add database indexes on `active`/`status` for efficient queries.

### 2. Orchestrator & RAG Hybrid Sync Logic
- [ ] On orchestrator startup:
    - [ ] Load all active servers/models from the RAG into orchestrator in-memory cache.
    - [ ] Ensure orchestrator cache is always a reflection of the RAG's current active state.
- [ ] On orchestrator state change (add/remove/update server/model):
    - [ ] Update both the in-memory cache and the RAG (persist changes immediately).
    - [ ] When removing, mark node as inactive in RAG and remove from cache.
    - [ ] When adding, upsert node as active in RAG and add to cache.
- [ ] Periodically (or on demand), resync orchestrator cache with RAG to recover from drift.

### 3. Querying for Endpoints
- [ ] When retrieving endpoints, prefer in-memory cache for speed.
- [ ] If cache is empty or stale, fall back to querying the RAG for active nodes.
- [ ] Optionally, expose an API endpoint to return only active servers/models, with a query param to select cache or RAG as the source.

### 4. Test Isolation & Configuration Safety
- [ ] Use a dedicated MongoDB database or collection for test runs (e.g., `rag_test`).
- [ ] Configure the test environment to point to this test database and use a separate in-memory cache.
- [ ] Never run tests against the production RAG database or cache.
- [ ] Before running tests, back up the current orchestrator configuration (servers/models) from both cache and RAG.
- [ ] After tests, restore the configuration from backup to both cache and RAG.
- [ ] Use environment variables or config files to separate test and production orchestrator states.
- [ ] For tests, use in-memory data stores or mock adapters where possible.
- [ ] If persistent storage is required, ensure it is isolated from production.

### 5. API Enhancements
- [ ] Add endpoints to:
    - [ ] List only active servers/models (with option to select cache or RAG as source).
    - [ ] Optionally, list all with status/history.

### 6. Documentation & Tracking
- [ ] Document all changes in `docs/DECISION_LOG.md` and update relevant READMEs.
- [ ] Add migration notes for the schema update and hybrid sync logic.
- [ ] Update test documentation to reflect new isolation and hybrid strategy.

---

## Example: Hybrid Node Status & Cache Update
```typescript
// When removing a server
ragService.updateNode(serverId, { active: false });
orchestratorCache.removeServer(serverId);

// When adding a server
ragService.upsertNode(serverId, { ...serverData, active: true });
orchestratorCache.addServer(serverData);

// When querying (prefer cache, fallback to RAG)
const activeServers = orchestratorCache.getActiveServers();
// If cache is empty or needs refresh:
const activeServersFromRAG = ragService.findNodes({ type: 'server', active: true });
```

---

## Future Considerations
- [ ] Consider versioning RAG nodes for audit/history.
- [ ] Add timestamps for activation/deactivation.
- [ ] Optionally, implement soft-deletion with a TTL for truly obsolete nodes.
- [ ] Add orchestrator cache health checks and auto-resync if drift is detected.
- [ ] Support distributed orchestrator instances with shared RAG and coordinated cache updates.

---

## Summary
By implementing a hybrid approach with dynamic node status, in-memory caching, and test isolation, you will:
- Achieve fast runtime operations with orchestrator cache.
- Maintain a persistent, reliable source of truth in the RAG.
- Prevent test runs from affecting production data.
- Enable reliable and flexible endpoint discovery via both cache and RAG.
