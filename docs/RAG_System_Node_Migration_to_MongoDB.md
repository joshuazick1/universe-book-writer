# Migrating RAG System Nodes to Persistent MongoDB Storage in `verseforge_rag_dev`

## Overview
This document outlines the steps required to migrate all RAG system nodes—including orchestrator, ai-server, ai-model, and related performance/quality nodes—from in-memory storage to a dedicated MongoDB collection in the `verseforge_rag_dev` database. This ensures persistence, scalability, and robust analytics for all system-level metadata.

---

## 1. Design Decisions
- **Database:** `verseforge_rag_dev` (MongoDB)
- **Collection:** `system_nodes` (or `rag_system_nodes`)
- **Scope:**
  - Orchestrator nodes
  - AI server nodes
  - AI model nodes
  - Quality/performance nodes
  - Any other system-level metadata (not user or document content)
- **Interface:** The persistent store must match the in-memory API for drop-in replacement.

---

## 2. Implementation Steps

### 2.1. Define the Persistent Store Class
- Create `PersistentRagModelNodeStore` in `backend/infrastructure/ragModelNodeStore.mongo.ts`.
- Use the official MongoDB Node.js driver or Mongoose ODM.
- Implement all methods from the in-memory store:
  - `getNode(id)`
  - `upsertNode(node)`
  - `addQualityScore(modelId, score)`
  - `getAllNodes()`
  - `getNodesByModel(modelName)`
  - `getNodesByTaskType(modelType)`
  - `getQualityScoresByBenchmark(suite)`
  - `getQualityScoresByFilter(filter)`
- Ensure all updates are atomic and auditable (use transactions or atomic update operators).

### 2.2. Update the Application to Use the Persistent Store
- In production, import and use `PersistentRagModelNodeStore` instead of the in-memory version.
- For local/dev/testing, retain the in-memory store for speed and isolation.
- Use dependency injection or a config flag to switch between stores.

### 2.3. Migrate Existing System Nodes
- Write a migration script to:
  - Read all current in-memory nodes (if any are serialized to disk or available in another DB).
  - Insert them into the new `system_nodes` collection.
  - Ensure no duplicates (use `id` as the unique key).
- For live systems, ensure a cutover window where both stores are kept in sync until migration is complete.

### 2.4. Move AI-Server, AI-Model, and Performance Nodes
- Identify all code paths where ai-server, ai-model, or performance/quality nodes are created or updated.
- Refactor these to use the persistent store.
- Ensure all quality judger verdicts, scores, and rolling metrics are written to MongoDB.
- Update any analytics, reporting, or dashboard scripts to query from the persistent collection.

### 2.5. Update Tests and Documentation
- Add integration tests for the persistent store (CRUD, query, aggregation).
- Update module README files to document the new persistent backend.
- Update architectural diagrams to reflect the new data flow.
- Record the migration in `docs/DECISION_LOG.md`.

---

## 3. Example: Persistent Store Skeleton (MongoDB Native Driver)
```typescript
import { MongoClient, Collection } from 'mongodb';
import type { RagModelNode, ModelQualityScore } from '../core/types/ragModelNode';

export class PersistentRagModelNodeStore {
  private collection: Collection<RagModelNode>;

  constructor(mongoUri: string, dbName = 'verseforge_rag_dev', collectionName = 'system_nodes') {
    const client = new MongoClient(mongoUri);
    this.collection = client.db(dbName).collection(collectionName);
  }

  async getNode(id: string): Promise<RagModelNode | null> {
    return this.collection.findOne({ id });
  }

  async upsertNode(node: RagModelNode): Promise<void> {
    await this.collection.updateOne({ id: node.id }, { $set: node }, { upsert: true });
  }

  async addQualityScore(modelId: string, score: ModelQualityScore): Promise<void> {
    await this.collection.updateOne(
      { id: modelId },
      {
        $push: { qualityHistory: score },
        $set: {
          lastUpdated: new Date().toISOString(),
          rollingAverageScore: score.score // (recompute as needed)
        }
      }
    );
  }

  // ...implement other query methods as in the in-memory store
}
```

---

## 4. Operational Notes
- Ensure MongoDB indexes on `id`, `modelName`, `modelType`, and any fields used for analytics.
- Use transactions for multi-step updates if needed.
- Secure the database connection string and credentials.
- Monitor for performance and storage growth.

---

## 5. Rollout Plan
- Develop and test the persistent store in a staging environment.
- Run migration scripts and verify data integrity.
- Switch production to use the persistent store.
- Monitor logs and metrics for issues.
- Remove or archive the in-memory store after successful migration.

---

## 6. References
- See `docs/RAG_Distributed_Queue_Implementation_Plan.md` for architectural context.
- Update `docs/DECISION_LOG.md` with migration details and rationale.
- See MongoDB and Mongoose documentation for advanced usage.

---

*This document should be updated as the migration progresses. All contributors should review and sign off on the migration plan before production cutover.*
