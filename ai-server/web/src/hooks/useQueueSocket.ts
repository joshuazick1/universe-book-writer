/**
 * useQueueSocket - React hook for real-time queue status via Socket.IO
 *
 * Connects to the backend Socket.IO server at /ws/queue and listens for 'queueStatus' events.
 * Returns the latest queue status and connection state.
 *
 * Usage:
 *   const { queueStatus, connected } = useQueueSocket();
 *
 * Edge cases:
 *   - Handles reconnects and errors gracefully.
 *   - Returns null if not connected or no status received yet.
 *
 * Example integration:
 *   import { useQueueSocket } from '../hooks/useQueueSocket';
 *   const { queueStatus, connected } = useQueueSocket();
 *   // Use queueStatus in your component
 */
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface QueueStatus {
    pending: number;
    active: number;
    completed: number;
    failed: number;
    jobs: any[];
}

export function useQueueSocket() {
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Connect to backend Socket.IO server via frontend proxy (port 5174)
        const socket = io('http://localhost:5174', {
            path: '/ws/queue',
            transports: ['websocket'],
            autoConnect: true,
        });
        socketRef.current = socket;

        // Log all events for debugging
        socket.onAny((event, ...args) => {
            console.log(`[Socket.IO] Event:`, event, args);
        });
        socket.on('connect', () => {
            setConnected(true);
            console.log('[Socket.IO] Connected');
            // Request initial status immediately on connect
            socket.emit('getQueueStatus');
        });
        socket.on('disconnect', () => {
            setConnected(false);
            console.log('[Socket.IO] Disconnected');
        });
        socket.on('queueStatus', (status: QueueStatus) => {
            setQueueStatus(status);
            console.log('[Socket.IO] queueStatus:', status);
        });
        socket.on('connect_error', (err) => {
            setConnected(false);
            console.error('[Socket.IO] connect_error:', err);
        });

        // Request queue status every 1 second for real-time updates
        const interval = setInterval(() => {
            if (socket.connected) {
                socket.emit('getQueueStatus');
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, []);

    return { queueStatus, connected };
}

export default useQueueSocket;
