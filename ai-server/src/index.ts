/**
 * AI Server Entry Point
 * 
 * Main server file that orchestrates Ollama server management and provides
 * REST API endpoints for AI text generation, model management, and server configuration.
 */

// Export all modules for external use
export * from './config/ollama.config';
export * from './health/health-monitor';
export * from './load-balancer/load-balancer';
export * from './client/ollama-client';
export * from './manager/server-manager';
export * from './services/config.service';

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { OllamaServerManager } from './manager/server-manager';

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
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    servers: serverManager.getServerStatus(),
  });
});

/**
 * Get server status
 */
app.get('/api/servers', (_req: Request, res: Response) => {
  res.json(serverManager.getServerStatus());
});

/**
 * Get available models across all servers
 */
app.get('/api/models', async (_req: Request, res: Response) => {
  try {
    const models = await serverManager.getAllModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get models', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Generate text completion
 */
const generateHandler: RequestHandler = async (req: Request, res: Response) => {
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
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};
app.post('/api/generate', generateHandler);

/**
 * Generate streaming text completion
 */
const generateStreamHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { model, prompt, ...options } = req.body;
    
    if (!model || !prompt) {
      res.status(400).json({ error: 'Model and prompt are required' });
      return;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    await serverManager.generateStream(
      { model, prompt, ...options },
      (chunk) => {
        res.write(JSON.stringify(chunk) + '\n');
      }
    );

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Stream generation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};
app.post('/api/generate/stream', generateStreamHandler);

/**
 * Pull model to a specific server
 */
const pullModelHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { model, serverId } = req.body;
    
    if (!model) {
      res.status(400).json({ error: 'Model name is required' });
      return;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    await serverManager.pullModel(
      model,
      serverId,
      (progress) => {
        res.write(JSON.stringify(progress) + '\n');
      }
    );

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Model pull failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};
app.post('/api/models/pull', pullModelHandler);

/**
 * Get current configuration
 */
app.get('/api/config', (_req: Request, res: Response) => {
  res.json(serverManager.getConfiguration());
});

/**
 * Update load balancing strategy
 */
const updateStrategyHandler: RequestHandler = (req: Request, res: Response) => {
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
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};
app.post('/api/config/strategy', updateStrategyHandler);

/**
 * Error handling middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong' 
  });
});

/**
 * Initialize and start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize the server manager
    await serverManager.initialize();
    
    // Setup event handlers for monitoring
    serverManager.on('initialized', () => {
      console.log('✅ Ollama Server Manager initialized');
    });

    serverManager.on('serverAdded', (serverId: string) => {
      console.log(`🔗 Server added: ${serverId}`);
    });

    serverManager.on('serverHealthCheckFailed', (serverId: string, health: any, error: any) => {
      console.warn(`⚠️  Health check failed for ${serverId}:`, error instanceof Error ? error.message : error);
    });

    serverManager.on('serverCircuitBreakerOpened', (serverId: string) => {
      console.warn(`🚨 Circuit breaker opened for server: ${serverId}`);
    });

    serverManager.on('noServersAvailable', (requiredModel?: string) => {
      console.error(`❌ No servers available${requiredModel ? ` for model: ${requiredModel}` : ''}`);
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
