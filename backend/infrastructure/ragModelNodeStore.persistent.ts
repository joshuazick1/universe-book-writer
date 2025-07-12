import { PersistentRagModelNodeStore } from './ragModelNodeStore.mongo.js';

// You may want to load this from config or environment
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

export const ragModelNodeStore = new PersistentRagModelNodeStore(MONGO_URI);
