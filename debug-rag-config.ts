import { DEFAULT_CONFIGS } from './ai-server/src/rag/adapters/index.js';

console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('RAG MongoDB URI:', process.env.RAG_MONGODB_URI || 'not set (using default)');

const environment = process.env.NODE_ENV || 'development';
const config = environment === 'production'
    ? DEFAULT_CONFIGS.PRODUCTION
    : DEFAULT_CONFIGS.DEVELOPMENT;

console.log('Selected config:', JSON.stringify(config, null, 2));
