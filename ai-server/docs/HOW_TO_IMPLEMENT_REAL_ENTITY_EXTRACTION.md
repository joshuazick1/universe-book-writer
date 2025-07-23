# How to Implement Real Entity Extraction in the RAG Pipeline

This guide describes the steps required to replace stubbed logic with real data access and entity extraction in the `aiEntityExtraction` pipeline step.

## 1. Implement Real Data Access in Service Functions

Edit `src/services/ragNodeService.ts` and replace stubbed functions with real database logic:

- **getNodeById(nodeId: string): Promise<RAGNode | null>**
  - Query your database (e.g., MongoDB) for a node with the given ID.
- **createOrGetEntityNode(entity: EntityExtraction & Context): Promise<RAGNode>**
  - Insert or update an entity node in the database, ensuring it is linked to the correct chunk node.
- **getEntitiesByChunkId(chunkNodeId: string): Promise<RAGNode[]>**
  - Query for all entity nodes linked to the specified chunk node.
- **createRelationshipNode(rel: any): Promise<any>**
  - Insert a relationship node/document in the database.
- **getEventsByCharacterId(characterNodeId: string): Promise<RAGNode[]>**
  - Query for all event nodes linked to the specified character node.

## 2. Ensure Proper Data Modeling

- Make sure your database schema supports:
  - Linking chunk nodes to their parent super-chunk (e.g., `superChunkId` field).
  - Linking entity nodes to chunk nodes (e.g., `chunkNodeId` field on entity nodes).
  - Storing summaries and full text in the correct fields.

## 3. Remove All TODO Stubs

- Replace all `// TODO: Implement actual lookup logic` comments with real queries.
- Remove any mock return values (e.g., empty arrays, random IDs).

## 4. Test the Pipeline

- Run the pipeline with real data and verify that:
  - Entities are extracted and stored in the database.
  - Entities are correctly linked to their chunk nodes.
  - Summaries and context are used as expected.

## 5. (Optional) Add Indexes and Optimizations

- Add database indexes on fields like `chunkNodeId`, `superChunkId`, and `type` for efficient querying.

## 6. Example: MongoDB Implementation

```ts
// Example for getNodeById
export async function getNodeById(nodeId: string): Promise<RAGNode | null> {
  return db.collection('ragNodes').findOne({ id: nodeId });
}

// Example for getEntitiesByChunkId
export async function getEntitiesByChunkId(chunkNodeId: string): Promise<RAGNode[]> {
  return db.collection('ragNodes').find({ type: 'entity', chunkNodeId }).toArray();
}
```

## 7. Update Documentation

- Document any schema changes in your data model docs.
- Update this guide as your implementation evolves.

---

**By following these steps, you will enable real, persistent entity extraction in your RAG pipeline.**
