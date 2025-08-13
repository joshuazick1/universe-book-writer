import { setupQueueWebSocket } from './queueWebSocket.js';
import app from './app.js';
import http from 'http';

const server = http.createServer(app);

// Setup WebSocket for queue status
const queueSocket = setupQueueWebSocket(app, server);

// Export emitQueueStatus for orchestrator integration
export const emitQueueStatus = queueSocket.emitQueueStatus;

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
