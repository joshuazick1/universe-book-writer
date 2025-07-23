# Queue Types for Distributed RAG Enrichment

This module defines the TypeScript interfaces for distributed queue jobs and results used in the RAG enrichment pipeline.

## Interfaces

### `Job`
Represents a distributed enrichment job for a document chunk.

- `id`: Unique job identifier (UUID recommended)
- `chunkId`: ID of the document chunk
- `type`: Task type (e.g., 'summarize', 'entity-extract')
- `payload`: Task-specific data (e.g., text, parameters)
- `metadata`: Optional metadata for orchestration, audit, etc.
- `version`: Version of the chunk for incremental processing
- `dependencies`: Optional job IDs that must complete first

### `JobResult`
Represents the result of a distributed enrichment job.

- `jobId`: The job ID this result corresponds to
- `chunkId`: The chunk ID this result is for
- `type`: Task type (should match job.type)
- `result`: Task-specific result (summary, entities, etc.)
- `status`: 'success' | 'failed' | 'skipped'
- `serverId`: Worker/model/server that produced this result
- `receivedAt`: ISO timestamp when result was received
- `isFirst`: True if this was the first valid result for the job

### `RagModelNode` (AI Model Node with Quality Judger Integration)
Represents an AI model node in the RAG knowledge graph, including quality judger metrics and verdicts for every job/result processed.

- `id`: Unique model/server ID
- `modelName`: Model name/version (e.g., 'TinyLlama-1.1', 'Ollama-v2')
- `modelType`: Model type/category (e.g., 'summarizer', 'entity-extractor')
- `qualityHistory`: Array of all quality scores/verdicts for jobs processed by this model (see `ModelQualityScore`)
- `rollingAverageScore`: Rolling average score for fast routing/model selection
- `lastUpdated`: Last updated timestamp
- `metadata`: Optional additional metadata (hardware, config, etc.)

#### `ModelQualityScore`
- `jobId`: The job/result ID this score is for
- `score`: Numeric score (0-1 or task-specific scale)
- `passed`: Pass/fail verdict
- `rationale`: Short rationale or explanation
- `scoredAt`: Timestamp when scored
- `details`: Optional full details/metrics from the quality judger

## Usage Example

````ts
import type { Job, JobResult, RagModelNode, ModelQualityScore } from './queue';

const job: Job = {
  id: 'uuid-123',
  chunkId: 'chunk-456',
  type: 'summarize',
  payload: { text: '...' },
  version: 2,
  metadata: { user: 'alice' },
  dependencies: ['job-789']
};

const result: JobResult = {
  jobId: 'uuid-123',
  chunkId: 'chunk-456',
  type: 'summarize',
  result: { summary: '...' },
  status: 'success',
  serverId: 'worker-1',
  receivedAt: new Date().toISOString(),
  isFirst: true
};

const modelNode: RagModelNode = {
  id: 'worker-1',
  modelName: 'TinyLlama-1.1',
  modelType: 'summarizer',
  qualityHistory: [
    {
      jobId: 'job-123',
      score: 0.92,
      passed: true,
      rationale: 'Meets all rubric criteria',
      scoredAt: '2025-07-09T12:00:00Z',
      details: { length: 120, rougeL: 0.88 }
    }
  ],
  rollingAverageScore: 0.92,
  lastUpdated: '2025-07-09T12:00:00Z',
  metadata: { hardware: 'A100', region: 'us-east-1' }
};
````

## Integration
- Use these types in queue helpers, orchestrator, and worker modules.
- Add runtime validation as needed (see `queue.schema.ts`).

## See Also
- [RAG_Distributed_Queue_Implementation_Plan.md](../../../docs/RAG_Distributed_Queue_Implementation_Plan.md)
