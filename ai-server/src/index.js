/**
 * AI Server Entry Point
 *
 * Main server file that orchestrates Ollama server management and provides
 * REST API endpoints for AI text generation, model management, and server configuration.
 */
// Export all modules for external use
export * from './config/ollama.config.js';
export * from './health/health-monitor.js';
export * from './load-balancer/load-balancer.js';
export * from './client/ollama-client.js';
export * from './manager/server-manager.js';
export * from './services/config.service.js';
import cors from 'cors';
import express from 'express';
import { OllamaServerManager } from './manager/server-manager.js';
const app = express();
const port = process.env.PORT || 5100;
// Middleware
app.use(cors());
app.use(express.json());
// Initialize Ollama Server Manager
const serverManager = new OllamaServerManager({
  loadBalancingStrategy: 'priority', // Start with priority-based strategy
});
/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    servers: serverManager.getServerStatus(),
  });
});
/**
 * Get server status
 */
app.get('/api/servers', (_req, res) => {
  res.json(serverManager.getServerStatus());
});
/**
 * Get available models across all servers
 */
app.get('/api/models', async (_req, res) => {
  try {
    const models = await serverManager.getAllModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
/**
 * Generate text completion
 */
const generateHandler = async (req, res) => {
  try {
    const { model, prompt, ...options } = req.body;
    if (!model || !prompt) {
      res.status(400).json({ error: 'Model and prompt are required' });
      return;
    }
    const response = await serverManager.generate({
      model,
      prompt,
      ...options,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
app.post('/api/generate', generateHandler);
/**
 * Generate streaming text completion
 */
const generateStreamHandler = async (req, res) => {
  try {
    const { model, prompt, ...options } = req.body;
    if (!model || !prompt) {
      res.status(400).json({ error: 'Model and prompt are required' });
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    await serverManager.generateStream({ model, prompt, ...options }, chunk => {
      res.write(`${JSON.stringify(chunk)}\n`);
    });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Stream generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
app.post('/api/generate/stream', generateStreamHandler);
/**
 * Pull model to a specific server
 */
const pullModelHandler = async (req, res) => {
  try {
    const { model, serverId } = req.body;
    if (!model) {
      res.status(400).json({ error: 'Model name is required' });
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    await serverManager.pullModel(model, serverId, progress => {
      res.write(`${JSON.stringify(progress)}\n`);
    });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Model pull failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
app.post('/api/models/pull', pullModelHandler);
/**
 * Get current configuration
 */
app.get('/api/config', (_req, res) => {
  res.json(serverManager.getConfiguration());
});
/**
 * Update load balancing strategy
 */
const updateStrategyHandler = (req, res) => {
  try {
    const { strategy } = req.body;
    if (!['priority', 'round-robin', 'least-connections', 'response-time'].includes(strategy)) {
      res.status(400).json({ error: 'Invalid strategy' });
      return;
    }
    serverManager.setLoadBalancingStrategy(strategy);
    res.json({ success: true, strategy });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update strategy',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
app.post('/api/config/strategy', updateStrategyHandler);
/**
 * Error handling middleware
 */
app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});
/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Initialize the server manager
    await serverManager.initialize();
    // Setup event handlers for monitoring
    serverManager.on('initialized', () => {
      console.log('✅ Ollama Server Manager initialized');
    });
    serverManager.on('serverAdded', serverId => {
      console.log(`🔗 Server added: ${serverId}`);
    });
    serverManager.on('serverHealthCheckFailed', (serverId, health, error) => {
      console.warn(
        `⚠️  Health check failed for ${serverId}:`,
        error instanceof Error ? error.message : error
      );
    });
    serverManager.on('serverCircuitBreakerOpened', serverId => {
      console.warn(`🚨 Circuit breaker opened for server: ${serverId}`);
    });
    serverManager.on('noServersAvailable', requiredModel => {
      console.error(
        `❌ No servers available${requiredModel ? ` for model: ${requiredModel}` : ''}`
      );
    });
    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 AI Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🤖 API endpoints available at http://localhost:${port}/api/`);
    });
  } catch (error) {
    console.error('❌ Failed to start AI server:', error);
    process.exit(1);
  }
}
/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  await serverManager.destroy();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  await serverManager.destroy();
  process.exit(0);
});
// Start the server
startServer().catch(console.error);
//# sourceMappingURL=index.js.map
