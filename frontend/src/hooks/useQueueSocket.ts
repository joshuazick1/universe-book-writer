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
    // Define shape according to backend getQueueStatus()
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
        // Use window.location.origin to match backend host
        const socket = io(`${window.location.origin}`, {
            path: '/ws/queue',
            transports: ['websocket'],
            autoConnect: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('queueStatus', (status: QueueStatus) => setQueueStatus(status));
        socket.on('connect_error', () => setConnected(false));

        return () => {
            socket.disconnect();
        };
    }, []);

    return { queueStatus, connected };
}

export default useQueueSocket;
