/**
 * Jest Environment Setup
 * Loads test environment variables
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '.env.test') });

console.log(`Test environment loaded. MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017'}`);
