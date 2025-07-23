/**
 * Monitor AI Server RAG Route Registration
 * 
 * This script monitors the AI server logs specifically for RAG-related messages
 * and route registration debugging.
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const AI_SERVER_LOG = path.join(LOG_DIR, `ai-server-${new Date().toISOString().slice(0, 10)}.log`);

console.log('=== AI Server RAG Route Monitoring ===');
console.log(`Monitoring log file: ${AI_SERVER_LOG}`);
console.log('Looking for RAG-related messages...\n');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

let lastPosition = 0;

// Read existing log content
if (fs.existsSync(AI_SERVER_LOG)) {
    const existingContent = fs.readFileSync(AI_SERVER_LOG, 'utf8');
    const lines = existingContent.split('\n');

    console.log('=== RECENT RAG-RELATED LOG ENTRIES ===');
    lines.forEach(line => {
        if (line && (
            line.includes('RAG') ||
            line.includes('rag') ||
            line.includes('route') ||
            line.includes('Route') ||
            line.includes('endpoint') ||
            line.includes('Endpoint')
        )) {
            console.log(line);
        }
    });

    lastPosition = existingContent.length;
    console.log('\n=== WAITING FOR NEW ENTRIES ===');
} else {
    console.log('Log file does not exist yet. Waiting for AI server to start...\n');
}

// Watch for new log entries
function watchLogs() {
    try {
        if (!fs.existsSync(AI_SERVER_LOG)) {
            return;
        }

        const stats = fs.statSync(AI_SERVER_LOG);
        if (stats.size > lastPosition) {
            const newContent = fs.readFileSync(AI_SERVER_LOG, 'utf8').slice(lastPosition);
            const newLines = newContent.split('\n');

            newLines.forEach(line => {
                if (line && (
                    line.includes('RAG') ||
                    line.includes('rag') ||
                    line.includes('route') ||
                    line.includes('Route') ||
                    line.includes('endpoint') ||
                    line.includes('Endpoint') ||
                    line.includes('Initialize') ||
                    line.includes('initialize') ||
                    line.includes('mount') ||
                    line.includes('Mount')
                )) {
                    console.log(`[NEW] ${line}`);
                }
            });

            lastPosition = stats.size;
        }
    } catch (error) {
        // Ignore file access errors (e.g., file being written to)
    }
}

// Start monitoring
const interval = setInterval(watchLogs, 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nStopping log monitor...');
    clearInterval(interval);
    process.exit(0);
});

console.log('Press Ctrl+C to stop monitoring\n');
