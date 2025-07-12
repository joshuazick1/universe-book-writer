// scripts/wipe-system-nodes.ts
// Wipes the system_nodes collection in verseforge_rag_dev for a clean migration.

import { PersistentRagModelNodeStore } from '../backend/infrastructure/ragModelNodeStore.mongo.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function wipeSystemNodes() {
    const store = new PersistentRagModelNodeStore(MONGO_URI);
    await store.connect();
    const result = await store['collection'].deleteMany({});
    console.log(`Wiped system_nodes collection: ${result.deletedCount} documents deleted.`);
    await store.close();
}

wipeSystemNodes().catch(err => {
    console.error('Failed to wipe system_nodes:', err);
    process.exit(1);
});
