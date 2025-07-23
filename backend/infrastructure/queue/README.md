# BullMQ Queue Infrastructure

This module provides the BullMQ-based distributed queue setup for the RAG enrichment pipeline.

## Features
- Centralized queue for enrichment jobs (summarization, entity extraction, etc.)
- Redis-backed, robust, and scalable
- Helpers for adding jobs and creating workers
- TypeScript-first, ES module compatible

## Usage

### 1. Install Dependencies

```
npm install bullmq ioredis
```

### 2. Add a Job

````ts
import { addEnrichmentJob } from './bullmqQueue';
await addEnrichmentJob('summarize', { chunkId: 'abc123', ... });
````

### 3. Create a Worker

````ts
import { createEnrichmentWorker } from './bullmqQueue';
createEnrichmentWorker(async (job) => {
  // process job.data
});
````

### 4. Environment Variables
- `REDIS_HOST` (default: localhost)
- `REDIS_PORT` (default: 6379)
- `REDIS_PASSWORD` (optional)
- `REDIS_TLS` (set to 'true' to enable TLS)

## See Also
- [BullMQ Documentation](https://docs.bullmq.io/)
- [RAG_Distributed_Queue_Implementation_Plan.md](../../docs/RAG_Distributed_Queue_Implementation_Plan.md)

## Next Steps
- Integrate with orchestrator and worker modules
- Add monitoring and error handling
- Document job schema and result handling
