# AI Server & Orchestrator

The AI Server is a robust orchestration layer for managing multiple Ollama instances, providing advanced load balancing, health monitoring, and intelligent request routing. It is designed for scalable, reliable, and extensible AI text generation—powering the Universe Book Writer’s multi-universe storytelling.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Server Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Express   │  │  REST API   │  │  WebSocket Events   │  │
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

---

## Core Components

### Server Manager (`OllamaServerManager`)
- Manages Ollama server lifecycles, request routing, model management, and configuration.
- Event-driven, supports dynamic server addition/removal, and emits health/status events.

### Load Balancer (`OllamaLoadBalancer`)
- **Strategies:** Priority, Round Robin, Least Connections, Response Time.
- **Default:** Least-Connections + Latency. Requests are routed to the healthy server with the fewest in-flight requests for the required model, breaking ties by lowest recent latency.
- **Queuing:** If all servers are at max concurrency, requests are queued (FIFO, configurable length), else rejected with 429.

### Health Monitor (`OllamaHealthMonitor`)
- Tracks server health, response times, error rates, and circuit breaker state.
- Circuit breaker pattern: CLOSED (normal), OPEN (failures), HALF_OPEN (testing recovery).

### Ollama Client (`OllamaClient`)
- Wraps each Ollama server instance for text generation, model management, health checks, and event emission.

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Ollama running on target servers
- Pre-downloaded models recommended

### Quick Start

```powershell
cd ai-server
npm install
npm start
```

#### Configuration

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

---

## API Endpoints

- `GET /health` — Server status and metrics
- `POST /api/generate` — Text generation
- `POST /api/generate/stream` — Streaming generation
- `POST /api/models/pull` — Model install (admin only, see below)
- `GET /api/models` — List models (aggregated)
- `DELETE /api/models/:model` — Delete model
- `GET /api/servers/status` — Server status
- `POST /api/config/strategy` — Change load balancing strategy
- `GET /api/config` — Get current config

### Orchestrator & Benchmarking Endpoints

- `GET /api/orchestrator/benchmarks` — Benchmark data for all server/model pairs
- `POST /api/orchestrator/benchmarks/run` — Trigger global benchmark
- `POST /api/orchestrator/benchmarks/server` — Benchmark a specific server/model
- `GET /api/orchestrator/health` — Health and status for all servers

---

## Model Management: Orchestrator Mode

> **Important:** In orchestrator mode, `/api/models/pull` is **disabled** for standard clients.  
> Only the admin UI or tools with `X-Orchestrator-Admin: true` or `?admin=true` can pull models to individual servers.
>
> **Example error response:**
> ```json
> {
>   "error": "Model pull is not supported in orchestrator mode. Use the admin UI to pull models to individual servers."
> }
> ```

---

## Ollama API Compatibility: Unavoidable Differences

The orchestrator aims for drop-in compatibility with Ollama, but a few differences are unavoidable:

- **/api/models**: Returns a list of model names across all servers (Ollama returns 404).
- **Model Distribution**: Model install/pull is restricted to admin UI/tools.
- **Multi-Server Metadata**: Some endpoints include a `server` field or aggregate data.
- **Error Details**: Error responses may include extra context (e.g., which servers were tried).
- **Performance**: Slight latency differences due to orchestration logic and health checks.

All other endpoints, status codes, and response shapes are matched as closely as possible.  
See [API Parity Checklist](../docs/checklists/ai-server-rebuild.md) for details.

---

## Monitoring & Metrics

- **Health Monitoring:** Tracks server availability, response times, error rates, and circuit breaker states.
- **Performance Metrics:** Request counts, active requests, average response times, last request time.
- **Event System:** Emits events for server status, load balancer decisions, and health changes.

---

## Security

- Use HTTPS for remote servers.
- API key support for remote Ollama servers.
- Rate limiting, CORS, and environment-based secrets.
- Circuit breakers and request queuing to protect resources.

---

## Testing

- **Unit tests:** `npm test`
- **Coverage:** `npm run test:coverage`
- **Watch mode:** `npm run test:watch`
- **Test structure:**  
  `src/__tests__/` — health-monitor, load-balancer, ollama-client, server-manager

---

## Advanced Orchestration Features (Planned/Experimental)

The following features are under consideration or in early development.  
**Not all are implemented in the current codebase.**

- **Model Registry:** Store metadata about models (language, task, latency, quality).
- **Task Scoring Engine:** Score models per task using heuristics and AI-based selection.
- **Multi-Prompt Dispatch:** Split compound prompts and dispatch to best-matching models in parallel.
- **Benchmarking Engine:** Execute code in sandboxed environments, log per-model success/latency.
- **Feedback Loop:** Track model success rates and tune routing dynamically.
- **Dynamic Code Support:** Allow models to generate and safely run code blocks with input/output schemas.
- **Agent Task Modes:** Specialized agents (planner, critic, executor) for advanced routing.
- **Model Vote & Critic:** Multiple models answer, a separate model chooses the best.
- **Model Categorization:** Tag models by strengths (e.g., JavaScript, story-writing).
- **API Router:** REST/gRPC API for task payloads, returns selected model/endpoint/explanation.
- **Legacy Pass-Through:** Basic relay for model name requests that bypass advanced processing. The orchestrator will never alter the behavior of endpoints that exist on a real Ollama server. All Ollama-documented endpoints will remain fully compatible and unmodified. Only non-standard or orchestrator-specific endpoints may be extended or changed as required.

- **Model Versioning, Blacklisting, and Rollback:** Track multiple versions of models, allow blacklisting of problematic versions, and support safe rollback to previous versions.
- **Canary Deployments / Shadow Testing:** Route a small percentage of traffic to new models/versions for real-world testing, with shadow requests for comparison and clear metrics/UI for results.
- **Usage Quotas and Rate Limiting per Client:** Optionally expose a separate API port for quota/rate-limited access. Default API remains fully Ollama-compatible and unrestricted unless configured.
- **Audit Logging:** Record sensitive/admin actions (model install, blacklist, config changes) at the orchestrator level.
- **Model Warmup and Preloading:** Optionally keep specific models preloaded on select servers, with configuration to avoid monopolizing resources.
- **Prompt/Completion Logging and Analytics:** Logging/analytics default to OFF, but can be enabled for development or debugging as needed.
- **Automated Model Retirement:** Models with persistently poor scores/feedback are automatically deprecated or removed from routing.
- **Virtual Model Interface:** Expose a virtual 'model' (e.g., 'router-core') for advanced orchestration via special API tags.

---

## Production Deployment

- See Dockerfile and environment variable examples in this repo.
- Health check: `/health` returns 200 OK when ready.
- Structured logging for health, server management, and errors.

---

## Integration Examples

### Frontend

```typescript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, model, stream: false })
});
```

### Backend

```typescript
import { OllamaServerManager } from './ai-server';
const aiManager = new OllamaServerManager({ loadBalancingStrategy: 'least-connections' });
await aiManager.initialize();
const response = await aiManager.generate({ model: 'llama3.2:1b', prompt: 'Describe a fictional universe' });
```

---

## Troubleshooting

- **Connection failures:** Check Ollama server status, network, and firewall.
- **Circuit breaker:** Monitor health logs, verify server/model capacity.
- **Load balancing:** Review priorities, model distribution, and capacity.
- **Performance:** Monitor metrics, check server utilization and timeouts.

---

## Future Enhancements

- Model caching, advanced request queueing, AI-driven model selection, analytics, auto-scaling, model optimization, and cost optimization.

---

## Review of Proposed Orchestrator Features

**Feasible/Recommended:**
- Model registry, model categorization, benchmarking engine, feedback loop, agent task modes, API router, legacy pass-through, virtual model interface.

**Requires Major Refactoring or Not Yet Supported:**
- Task scoring engine (needs more advanced model/task metadata and routing logic).
- Multi-prompt dispatch (requires prompt parsing and parallel orchestration).
- Dynamic code support (sandboxing and security are non-trivial).
- Model vote & critic (requires orchestration of multiple model responses and arbitration).

**Advice:**  
You can safely document the above features as "planned" or "experimental," but only mark those as "available" that are actually implemented. Avoid promising dynamic code execution or multi-model voting unless you have robust sandboxing and arbitration logic in place.

---

This infrastructure provides a robust, scalable foundation for AI text generation services, supporting the Universe Book Writer's multi-universe storytelling capabilities with enterprise-grade reliability and performance.
