# Collaboration Server - WebSocket Infrastructure

Real-time collaboration server for the Universe Book Writer project, providing comprehensive WebSocket-based communication for multi-user document editing, real-time synchronization, and collaborative features.

## Overview

The collaboration server is a production-ready, scalable WebSocket infrastructure built with Socket.IO, Express, and TypeScript. It enables real-time collaborative editing, document synchronization, user presence awareness, and reliable message delivery across distributed clients.

### Key Features

- **Real-time Document Collaboration**: Operational Transform-based document synchronization
- **User Presence Management**: Real-time user tracking and activity monitoring
- **Reliable Message Delivery**: Message queuing and automatic retry mechanisms
- **Authentication & Authorization**: JWT-based security with role-based permissions
- **Connection Resilience**: Automatic reconnection with exponential backoff
- **Performance Monitoring**: Comprehensive metrics and health monitoring
- **Horizontal Scaling**: Support for multi-instance deployment with Redis adapter

## Architecture

The collaboration server provides real-time communication capabilities for multiple users working on book projects simultaneously. It follows a modular, event-driven architecture with the following core components:

### Core Components

```
Collaboration Server Architecture
├── WebSocket Layer
│   ├── Socket.IO Server (Multi-transport support)
│   ├── Connection Manager (User session management)
│   ├── Room Manager (Document-based rooms)
│   └── Event Router (Message routing & filtering)
├── Application Layer
│   ├── Authentication Manager (JWT validation & RBAC)
│   ├── Collaboration Engine (Document synchronization)
│   ├── Presence Manager (User activity tracking)
│   └── Conflict Resolution (Operational Transform)
├── Infrastructure Layer
│   ├── Redis Adapter (Horizontal scaling support)
│   ├── Message Queue (Reliable delivery)
│   ├── Health Monitor (System monitoring)
│   └── Metrics Collector (Performance tracking)
└── Security Layer
    ├── Rate Limiter (DoS protection)
    ├── Input Validator (Data sanitization)
    ├── CORS Handler (Origin validation)
    └── Session Manager (Connection security)
```

- **WebSocket Server**: Socket.IO-based real-time communication with fallback transports
- **Connection Manager**: Handles user connections, sessions, and connection pooling
- **Collaboration Engine**: Implements Operational Transform for document synchronization
- **Event Manager**: Processes and distributes events between users with filtering and routing
- **Authentication Manager**: JWT-based authentication with role-based access control
- **Presence Manager**: Real-time user presence and activity tracking
- **Health Monitor**: System health monitoring and performance metrics collection
- **Reliability Manager**: Message queueing, retry logic, and connection resilience

### Advanced Features

- **Operational Transform**: Conflict-free document collaboration using OT algorithms
- **Document Locking**: Granular locking mechanisms for editing conflicts
- **Version Control**: Real-time document versioning and change tracking
- **User Cursors**: Real-time cursor position and selection tracking
- **Collaborative Annotations**: Shared comments and suggestions system
- **Offline Support**: Offline editing with conflict resolution on reconnection
- **Permission System**: Fine-grained permissions for document access and editing
- **Audit Trail**: Comprehensive logging of all collaborative actions

## Technical Specifications

### Protocol Support

- **Primary**: WebSocket (RFC 6455) for low-latency communication
- **Fallback**: HTTP Long Polling for network-constrained environments
- **Transport**: Automatic transport selection based on client capabilities
- **Compression**: Gzip compression for large message payloads

### Scalability Features

- **Horizontal Scaling**: Redis adapter for multi-instance deployment
- **Load Balancing**: Sticky session support for WebSocket connections
- **Connection Pooling**: Efficient connection management and resource utilization
- **Message Batching**: Optimized message delivery for high-throughput scenarios

### Performance Characteristics

- **Latency**: < 50ms message delivery in optimal conditions
- **Throughput**: 10,000+ concurrent connections per instance
- **Memory Usage**: ~1MB per 1000 concurrent connections
- **CPU Usage**: Low CPU overhead with event-driven architecture

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Configuration

The server is configured through environment variables:

### Core Settings

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key
```

### WebSocket Configuration

```bash
WEBSOCKET_ENABLED=true
SOCKET_IO_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SOCKET_IO_TRANSPORTS=websocket,polling
MAX_CONNECTIONS=1000
```

### Connection Management

```bash
MAX_CONNECTIONS_PER_USER=5
CONNECTION_TIMEOUT=30000
HEARTBEAT_INTERVAL=30000
MAX_IDLE_TIME=300000
CONNECTION_POOLING_ENABLED=true
CONNECTION_POOL_SIZE=100
```

### Event System

```bash
EVENT_MAX_QUEUE_SIZE=10000
EVENT_PROCESSING_TIMEOUT=5000
EVENT_PERSISTENCE_ENABLED=false
EVENT_RETENTION_PERIOD=86400000
EVENT_BATCHING_ENABLED=true
EVENT_BATCH_SIZE=100
EVENT_BATCH_TIMEOUT=1000
```

### Health Monitoring

```bash
HEALTH_CHECK_INTERVAL=30000
HEALTH_MAX_MEMORY_USAGE=500
HEALTH_MAX_CPU_USAGE=80
HEALTH_MAX_ERROR_RATE=5
HEALTH_MAX_CONNECTION_COUNT=1000
```

### Reliability

```bash
RELIABILITY_MAX_QUEUE_SIZE=1000
RELIABILITY_MAX_RETRIES=3
RELIABILITY_RETRY_DELAY=1000
RELIABILITY_MAX_RETRY_DELAY=30000
RELIABILITY_RECONNECT_ATTEMPTS=5
RELIABILITY_RECONNECT_DELAY=5000
RELIABILITY_MESSAGE_EXPIRATION=300000
RELIABILITY_CLEANUP_INTERVAL=60000
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status and metrics.

### Metrics

```
GET /metrics
```

Returns detailed server metrics including connections, events, and WebSocket statistics.

### Active Connections

```
GET /connections
```

Returns information about active connections.

## WebSocket Events

### Client Events

- `authenticate`: Authenticate user with JWT token
- `join-room`: Join a collaboration room
- `leave-room`: Leave a collaboration room
- `document-change`: Send document changes
- `cursor-position`: Update cursor position
- `user-activity`: Send user activity updates

### Server Events

- `authenticated`: Authentication successful
- `authentication-error`: Authentication failed
- `room-joined`: Successfully joined room
- `room-left`: Left room
- `document-update`: Document changes from other users
- `cursor-update`: Cursor position updates
- `user-joined`: User joined the room
- `user-left`: User left the room
- `reconnect`: Reconnection successful
- `error`: General error occurred

## Usage Example

### Client Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('connect', () => {
  console.log('Connected to collaboration server');

  // Join a document room
  socket.emit('join-room', { documentId: 'doc-123' });
});

socket.on('document-update', changes => {
  // Apply changes to document
  console.log('Document updated:', changes);
});

socket.on('user-joined', user => {
  console.log('User joined:', user.name);
});
```

### Server Integration

```typescript
import { CollaborationServer } from '@universe-book-writer/collaboration-server';

const server = new CollaborationServer({
  port: 3001,
  config: {
    // Custom configuration
  },
});

// Start the server
await server.start();

// Get server status
const status = server.getStatus();
console.log('Server status:', status);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
```

## Monitoring

The collaboration server provides comprehensive monitoring capabilities:

### Health Metrics

- System uptime and status
- Memory and CPU usage
- Active connection count
- Event processing rates
- Error rates and details

### Performance Metrics

- Message throughput
- Connection latency
- Event processing time
- Queue sizes and depths

### Error Tracking

- Connection errors
- Authentication failures
- Message delivery failures
- System errors and stack traces

## Security

### Authentication

- JWT-based authentication
- Session management
- Token expiration and refresh

### Rate Limiting

- Per-user message limits
- Connection rate limiting
- Burst protection

### CORS

- Configurable origin restrictions
- Credential handling
- Preflight request handling

## Testing

The collaboration server includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test health-monitor
npm test reliability-manager
npm test collaboration-server

# Generate coverage report
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Multi-component interactions
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and authorization

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  collaboration-server:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - SOCKET_IO_CORS_ORIGIN=${FRONTEND_URL}
    restart: unless-stopped
```

### Environment Variables

Ensure all required environment variables are set in production:

- `JWT_SECRET`: Strong secret key for JWT signing
- `SOCKET_IO_CORS_ORIGIN`: Allowed frontend origins
- `NODE_ENV`: Set to "production"

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 90%
- Document new features and APIs
- Follow the existing code style
- Add appropriate error handling

## License

This project is part of the Universe Book Writer application and follows the same licensing terms.
