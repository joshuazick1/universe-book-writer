/**
 * Monitor AI Server RAG Route Registration
 * 
 * This script monitors the AI server logs in real-time to track RAG route
 * registration and any errors during initialization.
 */

import fs from 'fs';
import path from 'path';
import { logInfo, logDebug } from './ai-server/src/logger.js';

const LOG_DIR = path.join(process.cwd(), 'logs');
const AI_SERVER_LOG = path.join(LOG_DIR, `ai-server-${new Date().toISOString().slice(0, 10)}.log`);

function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

console.log(`\n=== AI Server RAG Route Registration Monitor ===`);
console.log(`Monitoring: ${AI_SERVER_LOG}`);
console.log(`Started at: ${getCurrentTimestamp()}\n`);

logInfo('RAG Route Monitor: Starting log monitoring');

let lastSize = 0;

// Initial check to see if log file exists
if (fs.existsSync(AI_SERVER_LOG)) {
    const stats = fs.statSync(AI_SERVER_LOG);
    lastSize = stats.size;
    console.log(`📄 Log file exists, size: ${lastSize} bytes`);
} else {
    console.log(`⚠️  Log file does not exist yet: ${AI_SERVER_LOG}`);
}

// Monitor for new log entries
const monitorInterval = setInterval(() => {
    if (!fs.existsSync(AI_SERVER_LOG)) {
        return;
    }

    const stats = fs.statSync(AI_SERVER_LOG);
    const currentSize = stats.size;

    if (currentSize > lastSize) {
        // Read only the new content
        const stream = fs.createReadStream(AI_SERVER_LOG, {
            start: lastSize,
            end: currentSize - 1
        });

        let newContent = '';
        stream.on('data', (chunk) => {
            newContent += chunk.toString();
        });

        stream.on('end', () => {
            const lines = newContent.split('\n').filter(line => line.trim());

            lines.forEach(line => {
                // Filter for RAG-related log entries
                if (line.includes('RAG') ||
                    line.includes('rag') ||
                    line.includes('route') ||
                    line.includes('ERROR') ||
                    line.includes('WARN') ||
                    line.includes('Starting') ||
                    line.includes('initialization')) {

                    const timestamp = getCurrentTimestamp();

                    // Color code based on log level
                    if (line.includes('[ERROR]')) {
                        console.log(`🔴 [${timestamp}] ${line}`);
                    } else if (line.includes('[WARN]')) {
                        console.log(`🟡 [${timestamp}] ${line}`);
                    } else if (line.includes('[INFO]')) {
                        console.log(`🟢 [${timestamp}] ${line}`);
                    } else if (line.includes('[DEBUG]')) {
                        console.log(`🔵 [${timestamp}] ${line}`);
                    } else {
                        console.log(`⚪ [${timestamp}] ${line}`);
                    }
                }
            });
        });

        lastSize = currentSize;
    }
}, 1000); // Check every second

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping RAG route monitor...');
    clearInterval(monitorInterval);
    logInfo('RAG Route Monitor: Stopped');
    process.exit(0);
});

console.log('🔍 Monitoring for RAG-related log entries...');
console.log('Press Ctrl+C to stop monitoring\n');
