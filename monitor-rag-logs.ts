/**
 * RAG Debug Log Monitor
 * 
 * Monitors backend logs for RAG initialization debugging information
 */

import fs from 'fs';
import path from 'path';

async function monitorRAGLogs(): Promise<void> {
    console.log('🔍 RAG Debug Log Monitor\n');

    const logDir = path.join(process.cwd(), 'logs');
    const today = new Date().toISOString().slice(0, 10);
    const backendLogFile = path.join(logDir, `backend-${today}.log`);
    const aiServerLogFile = path.join(logDir, `ai-server-${today}.log`);

    console.log('📁 Log files to monitor:');
    console.log(`   Backend: ${backendLogFile}`);
    console.log(`   AI Server: ${aiServerLogFile}`);
    console.log('');

    // Function to read and filter RAG-related logs
    function readRAGLogs(filePath: string, serverName: string): string[] {
        if (!fs.existsSync(filePath)) {
            return [`❌ ${serverName} log file not found: ${filePath}`];
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            // Filter for RAG-related entries
            const ragLines = lines.filter(line =>
                line.toLowerCase().includes('rag') ||
                line.toLowerCase().includes('initialize') ||
                line.toLowerCase().includes('routes') ||
                line.toLowerCase().includes('error') ||
                line.toLowerCase().includes('warn')
            );

            if (ragLines.length === 0) {
                return [`ℹ️  No RAG-related entries found in ${serverName} logs`];
            }

            return ragLines;
        } catch (error) {
            return [`❌ Error reading ${serverName} log: ${error}`];
        }
    }

    // Read backend logs
    console.log('📋 Backend RAG Logs:');
    console.log('─'.repeat(50));
    const backendLogs = readRAGLogs(backendLogFile, 'Backend');
    backendLogs.forEach(line => console.log(line));
    console.log('');

    // Read AI server logs
    console.log('📋 AI Server RAG Logs:');
    console.log('─'.repeat(50));
    const aiServerLogs = readRAGLogs(aiServerLogFile, 'AI Server');
    aiServerLogs.forEach(line => console.log(line));
    console.log('');

    // Check if logs directory exists
    if (!fs.existsSync(logDir)) {
        console.log('⚠️  Logs directory does not exist. Creating it...');
        fs.mkdirSync(logDir, { recursive: true });
        console.log('✅ Logs directory created');
    }

    // Live monitoring function
    function startLiveMonitoring(): void {
        console.log('🔄 Starting live log monitoring... (Press Ctrl+C to stop)');
        console.log('   Watching for new RAG-related log entries...\n');

        let lastBackendSize = fs.existsSync(backendLogFile) ? fs.statSync(backendLogFile).size : 0;
        let lastAiServerSize = fs.existsSync(aiServerLogFile) ? fs.statSync(aiServerLogFile).size : 0;

        const monitor = setInterval(() => {
            // Check backend log changes
            if (fs.existsSync(backendLogFile)) {
                const currentBackendSize = fs.statSync(backendLogFile).size;
                if (currentBackendSize > lastBackendSize) {
                    const content = fs.readFileSync(backendLogFile, 'utf8');
                    const newContent = content.slice(lastBackendSize);
                    const newLines = newContent.split('\n').filter(line =>
                        line.trim() && (
                            line.toLowerCase().includes('rag') ||
                            line.toLowerCase().includes('initialize') ||
                            line.toLowerCase().includes('error')
                        )
                    );

                    newLines.forEach(line => {
                        console.log(`🔵 BACKEND: ${line}`);
                    });

                    lastBackendSize = currentBackendSize;
                }
            }

            // Check AI server log changes
            if (fs.existsSync(aiServerLogFile)) {
                const currentAiServerSize = fs.statSync(aiServerLogFile).size;
                if (currentAiServerSize > lastAiServerSize) {
                    const content = fs.readFileSync(aiServerLogFile, 'utf8');
                    const newContent = content.slice(lastAiServerSize);
                    const newLines = newContent.split('\n').filter(line =>
                        line.trim() && (
                            line.toLowerCase().includes('rag') ||
                            line.toLowerCase().includes('initialize') ||
                            line.toLowerCase().includes('error')
                        )
                    );

                    newLines.forEach(line => {
                        console.log(`🟢 AI-SERVER: ${line}`);
                    });

                    lastAiServerSize = currentAiServerSize;
                }
            }
        }, 1000); // Check every second

        // Handle Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(monitor);
            console.log('\n✅ Log monitoring stopped');
            process.exit(0);
        });
    }

    // Start live monitoring
    startLiveMonitoring();
}

// Export for use in other scripts
export { monitorRAGLogs };

// Run if called directly
if (require.main === module) {
    monitorRAGLogs().catch(console.error);
}
