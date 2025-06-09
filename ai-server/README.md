# AI Server Infrastructure

The AI Server provides a comprehensive infrastructure for managing multiple Ollama instances with load balancing, health monitoring, and intelligent request distribution. This documentation covers the complete setup, configuration, and operation of the AI Server.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Server Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Express   │  │  REST API   │  │  WebSocket Events   │  │
│  │   Server    │  │ Endpoints   │  │    (Optional)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                 Server Manager Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Load        │  │ Health      │  │ Circuit Breaker     │  │
│  │ Balancer    │  │ Monitor     │  │ Management          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  Client Layer                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Ollama      │  │ Ollama      │  │    Ollama N         │  │
│  │ Client 1    │  │ Client 2    │  │    (Remote)         │  │
│  │ (Local)     │  │ (Remote)    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Server Manager (`OllamaServerManager`)

**Location**: `src/manager/server-manager.ts`

The central orchestrator that manages multiple Ollama instances, providing:
- Server lifecycle management (add, remove, update)
- Request routing and execution
- Model management across servers
- Configuration management
- Event-driven server monitoring

**Key Features**:
- **Multi-server orchestration**: Manages multiple Ollama instances
- **Intelligent routing**: Distributes requests based on model availability and server health
- **Retry logic**: Automatic retries with exponential backoff
- **Event-driven**: Emits events for monitoring and integration

### 2. Load Balancer (`OllamaLoadBalancer`)

**Location**: `src/load-balancer/load-balancer.ts`

Implements intelligent request distribution with multiple strategies:

#### Load Balancing Strategies

1. **Priority Strategy** (Default)
   - Routes to highest priority server first
   - Best for dedicated hardware hierarchies
   - Fallback to lower priority on unavailability

2. **Round Robin Strategy**
   - Distributes requests evenly across servers
   - Good for homogeneous server environments
   - Maintains request order distribution

3. **Least Connections Strategy**
   - Routes to server with fewest active requests
   - Optimal for varying request processing times
   - Dynamic load distribution

4. **Response Time Strategy**
   - Routes based on historical response times
   - Adapts to server performance differences
   - Self-optimizing over time

#### Request Filtering

The load balancer filters servers based on:
- **Server status**: Only active servers
- **Health status**: Circuit breaker state
- **Model availability**: Required model support
- **Capacity**: Available request slots
- **Circuit breaker**: Closed or half-open state

### 3. Health Monitor (`OllamaHealthMonitor`)

**Location**: `src/health/health-monitor.ts`

Provides comprehensive server health tracking and circuit breaker functionality:

#### Health Metrics

- **Response time**: Average and current response times
- **Error tracking**: Error count and consecutive failures
- **Availability**: Real-time server availability
- **Circuit breaker state**: CLOSED, OPEN, HALF_OPEN
- **Model inventory**: Available models per server

#### Circuit Breaker Pattern

```typescript
interface ServerHealth {
  serverId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  consecutiveFailures: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastError?: string;
  models?: string[];
}
```

**Circuit Breaker States**:
- **CLOSED**: Normal operation, requests allowed
- **OPEN**: Too many failures, requests blocked
- **HALF_OPEN**: Testing recovery, limited requests allowed

### 4. Ollama Client (`OllamaClient`)

**Location**: `src/client/ollama-client.ts`

Individual client wrapper for each Ollama server instance:

**Capabilities**:
- **Text generation**: Synchronous and streaming
- **Model management**: Pull, list, delete models
- **Health checks**: Server availability verification
- **Configuration**: Runtime configuration updates
- **Event emission**: Client-level event notifications

## Installation and Setup

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **Ollama**: Installed and running on target servers
3. **Models**: Pre-downloaded models (recommended)

### Quick Start

1. **Install Dependencies**:
```bash
cd ai-server
npm install
```

2. **Configuration**:
Edit `src/config/ollama.config.ts` or use environment variables:

```typescript
export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  servers: [
    {
      id: 'local',
      name: 'Local Ollama',
      url: 'http://localhost:11434',
      isActive: true,
      priority: 50,
      maxConcurrentRequests: 2,
      models: ['llama3.2:1b'],
      timeout: 30000,
    }
  ],
  defaultServer: 'local',
  healthCheckInterval: 30000,
  requestTimeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 3,
  circuitBreakerTimeout: 60000,
};
```

3. **Environment Variables**:
```bash
OLLAMA_SERVER_URL=http://localhost:11434
OLLAMA_REQUEST_TIMEOUT=60000
OLLAMA_HEALTH_CHECK_INTERVAL=30000
PORT=5100
```

4. **Start Server**:
```bash
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns server status and basic metrics.

### Text Generation
```http
POST /api/generate
Content-Type: application/json

{
  "model": "llama3.2:1b",
  "prompt": "Tell me about the universe",
  "stream": false
}
```

### Streaming Generation
```http
POST /api/generate/stream
Content-Type: application/json

{
  "model": "llama3.2:1b",
  "prompt": "Tell me about the universe",
  "stream": true
}
```

### Model Management
```http
POST /api/models/pull
Content-Type: application/json

{
  "model": "llama3.2:3b",
  "serverId": "local"  // Optional
}
```

```http
GET /api/models
```

```http
DELETE /api/models/:model
```

### Server Management
```http
GET /api/servers/status
```

```http
POST /api/config/strategy
Content-Type: application/json

{
  "strategy": "least-connections"
}
```

```http
GET /api/config
```

## Configuration

### Server Configuration

```typescript
interface OllamaServerConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  url: string;                   // Server URL
  isActive: boolean;             // Server active state
  priority: number;              // Priority (0-100, higher preferred)
  maxConcurrentRequests: number; // Request capacity
  models: string[];              // Available models
  tags?: string[];               // Server tags
  healthCheckPath?: string;      // Health check endpoint
  timeout?: number;              // Request timeout
  apiKey?: string;               // Authentication key
}
```

### Global Configuration

```typescript
interface OllamaConfig {
  servers: OllamaServerConfig[];           // Server definitions
  defaultServer: string;                   // Default server ID
  healthCheckInterval: number;             // Health check frequency (ms)
  requestTimeout: number;                  // Default request timeout (ms)
  retryAttempts: number;                   // Max retry attempts
  retryDelay: number;                      // Retry delay (ms)
  circuitBreakerThreshold: number;         // Failure threshold
  circuitBreakerTimeout: number;           // Circuit breaker timeout (ms)
}
```

## Monitoring and Metrics

### Health Monitoring

The health monitor continuously tracks:
- **Server availability**: HTTP health checks
- **Response times**: Request duration tracking
- **Error rates**: Failure count and patterns
- **Circuit breaker states**: Protection mechanism status

### Performance Metrics

```typescript
interface RequestMetrics {
  serverId: string;
  requestCount: number;
  activeRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date;
}
```

### Event System

The AI server emits comprehensive events for monitoring:

```typescript
// Server Manager Events
serverManager.on('initialized', () => { /* Server ready */ });
serverManager.on('serverAdded', (serverId) => { /* New server */ });
serverManager.on('serverRemoved', (serverId) => { /* Server removed */ });
serverManager.on('serverHealthCheckFailed', (serverId, health, error) => { /* Health issue */ });
serverManager.on('serverCircuitBreakerOpened', (serverId) => { /* Circuit breaker */ });
serverManager.on('noServersAvailable', (requiredModel) => { /* No servers */ });

// Load Balancer Events
loadBalancer.on('serverSelected', (serverId, strategy) => { /* Server chosen */ });
loadBalancer.on('noServersAvailable', (requiredModel) => { /* No suitable servers */ });
loadBalancer.on('strategyChanged', (strategyName) => { /* Strategy updated */ });

// Health Monitor Events
healthMonitor.on('healthCheckSuccess', (serverId, health) => { /* Health OK */ });
healthMonitor.on('healthCheckFailure', (serverId, health, error) => { /* Health failed */ });
healthMonitor.on('circuitBreakerOpened', (serverId) => { /* Circuit opened */ });
healthMonitor.on('circuitBreakerClosed', (serverId) => { /* Circuit closed */ });
healthMonitor.on('circuitBreakerHalfOpen', (serverId) => { /* Circuit testing */ });
```

## Production Deployment

### Environment Configuration

```bash
# Server Configuration
PORT=5100
NODE_ENV=production

# Ollama Configuration
OLLAMA_SERVER_URL=http://ollama-cluster:11434
OLLAMA_REQUEST_TIMEOUT=120000
OLLAMA_HEALTH_CHECK_INTERVAL=15000

# Load Balancing
DEFAULT_LOAD_BALANCING_STRATEGY=least-connections

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=60000
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build

EXPOSE 5100

CMD ["npm", "start"]
```

### Health Check Configuration

For production load balancers (nginx, HAProxy):

```
/health - Returns 200 OK when server is ready
```

### Logging

The server provides structured logging:

```javascript
// Health check success
console.log('✅ Ollama Server Manager initialized');

// Server management
console.log(`🔗 Server added: ${serverId}`);
console.warn(`⚠️  Health check failed for ${serverId}: ${error.message}`);
console.warn(`🚨 Circuit breaker opened for server: ${serverId}`);
console.error(`❌ No servers available for model: ${requiredModel}`);
```

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

```
src/__tests__/
├── health-monitor.test.ts     # Health monitoring tests
├── load-balancer.test.ts      # Load balancing tests
├── ollama-client.test.ts      # Client tests
└── server-manager.test.ts     # Integration tests
```

### Test Coverage

Current test coverage includes:
- **Health monitoring**: Circuit breaker logic, health checks
- **Load balancing**: All strategies, server selection
- **Client operations**: Generation, model management
- **Error handling**: Retry logic, failure scenarios

## Troubleshooting

### Common Issues

1. **Server Connection Failures**
   - Check Ollama server status: `curl http://localhost:11434/api/tags`
   - Verify network connectivity
   - Check firewall rules

2. **Circuit Breaker Activation**
   - Monitor health check logs
   - Verify server capacity
   - Check model availability

3. **Load Balancing Issues**
   - Review server priorities
   - Check model distribution
   - Verify server capacity settings

4. **Performance Issues**
   - Monitor request metrics
   - Check server utilization
   - Review timeout settings

### Debug Mode

Enable verbose logging:

```bash
NODE_ENV=development DEBUG=ai-server:* npm start
```

### Server Status Monitoring

```bash
# Check server status
curl http://localhost:5100/api/servers/status

# Check configuration
curl http://localhost:5100/api/config

# Health check
curl http://localhost:5100/health
```

## Integration Examples

### Frontend Integration

```typescript
class AIService {
  private baseURL = 'http://localhost:5100';

  async generateText(prompt: string, model: string = 'llama3.2:1b') {
    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, stream: false })
    });
    
    return response.json();
  }

  async generateStream(prompt: string, model: string, onChunk: (chunk: string) => void) {
    const response = await fetch(`${this.baseURL}/api/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, stream: true })
    });

    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        onChunk(chunk);
      }
    }
  }
}
```

### Backend Integration

```typescript
import { OllamaServerManager } from './ai-server';

const aiManager = new OllamaServerManager({
  loadBalancingStrategy: 'least-connections'
});

await aiManager.initialize();

// Generate text
const response = await aiManager.generate({
  model: 'llama3.2:1b',
  prompt: 'Describe a fictional universe',
  options: { temperature: 0.7 }
});

// Stream generation
await aiManager.generateStream(
  { model: 'llama3.2:1b', prompt: 'Tell a story...' },
  (chunk) => console.log(chunk.response),
  { preferredServer: 'gpu-server' }
);
```

## Security Considerations

### API Key Management

For remote Ollama servers with authentication:

```typescript
{
  id: 'remote-gpu',
  name: 'Remote GPU Server',
  url: 'https://ollama.example.com',
  apiKey: process.env.OLLAMA_API_KEY,
  isActive: true,
  priority: 90
}
```

### Network Security

- Use HTTPS for remote servers
- Implement API rate limiting
- Configure CORS appropriately
- Use environment variables for secrets

### Resource Protection

- Set appropriate request timeouts
- Configure circuit breakers
- Monitor resource usage
- Implement request queuing

## Performance Optimization

### Model Distribution

- Distribute models across servers based on usage
- Use faster models for quick responses
- Cache frequently used models
- Implement model warm-up strategies

### Request Optimization

- Use streaming for long responses
- Implement request batching where appropriate
- Cache responses for identical requests
- Optimize prompt templates

### Server Configuration

- Tune concurrent request limits
- Adjust health check intervals
- Optimize circuit breaker thresholds
- Configure appropriate timeouts

## Future Enhancements

### Planned Features

1. **Model Caching**: Intelligent model caching across servers
2. **Request Queuing**: Advanced request queue management
3. **Model Routing**: AI-driven model selection
4. **Performance Analytics**: Advanced metrics and analytics
5. **Auto-scaling**: Dynamic server scaling based on load
6. **Model Optimization**: Automatic model optimization
7. **Cost Optimization**: Usage-based cost optimization

### Extension Points

The architecture supports extension through:
- Custom load balancing strategies
- Additional health check mechanisms
- Custom metrics collection
- Event-driven integrations
- Plugin-based model handlers

---

This infrastructure provides a robust, scalable foundation for AI text generation services, supporting the Universe Book Writer's multi-universe storytelling capabilities with enterprise-grade reliability and performance.
