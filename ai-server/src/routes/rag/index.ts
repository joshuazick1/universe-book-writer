// Barrel file for RAG ingestion routes



import ingestTextRouter from './ingestText.js';
import ingestCodeRouter from './ingestCode.js';
import ingestTextStreamRouter from './ingestTextStream.js';
import manualPostChunkingRouter from './manualPostChunking.js';
import eventsStreamRouter from './eventsStream.js';

export { ingestTextRouter, ingestCodeRouter, ingestTextStreamRouter, manualPostChunkingRouter, eventsStreamRouter };
