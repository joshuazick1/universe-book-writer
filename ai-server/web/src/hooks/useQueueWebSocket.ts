import React, { useEffect } from 'react';

/**
 * DEPRECATED: useQueueWebSocket
 *
 * This hook used native WebSocket and is not compatible with the backend Socket.IO protocol.
 * Please use useQueueSocket from './useQueueSocket' for real-time queue status updates.
 *
 * Usage:
 *   import { useQueueSocket } from './useQueueSocket';
 *   const { queueStatus, connected } = useQueueSocket();
 */
export function useQueueWebSocket() {
    throw new Error('useQueueWebSocket is deprecated. Use useQueueSocket instead.');
}
