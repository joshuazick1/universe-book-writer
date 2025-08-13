import { Server } from 'socket.io';
import type { Express } from 'express';
import { getOrchestratorInstance } from './orchestrator-instance.js';

/**
 * Sets up a Socket.IO server for real-time queue status updates.
 * Emits 'queueStatus' events whenever the queue changes.
 * Call `emitQueueStatus()` from orchestrator after any job status change.
 */
export function setupQueueWebSocket(app: Express, httpServer: any) {
    const io = new Server(httpServer, {
        path: '/ws/queue',
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    console.log('[Socket.IO] Queue WebSocket server started at /ws/queue');

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);
        // Send initial queue status
        socket.emit('queueStatus', getOrchestratorInstance().getQueueStatus());
    });

    // Expose a function to emit queue status to all clients
    return {
        emitQueueStatus: () => {
            io.emit('queueStatus', getOrchestratorInstance().getQueueStatus());
        }
    };
}
