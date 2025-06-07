/**
 * Ollama Configuration for AI Server
 * Supports both local and remote Ollama instances
 */

export interface OllamaServerConfig {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  priority: number; // 0-100, higher is more preferred
  maxConcurrentRequests: number;
  models: string[];
  tags?: string[];
  healthCheckPath?: string;
  timeout?: number;
  apiKey?: string; // For secured external servers
}

export interface OllamaConfig {
  servers: OllamaServerConfig[];
  defaultServer: string;
  healthCheckInterval: number; // milliseconds
  requestTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  circuitBreakerThreshold: number; // failure count before circuit opens
  circuitBreakerTimeout: number; // time before attempting to close circuit
}

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  servers: [
    {
      id: 'local',
      name: 'Local Ollama',
      url: 'http://localhost:11434',
      isActive: true,
      priority: 50,
      maxConcurrentRequests: 2, // Conservative for CPU-only models
      models: ['llama3.2:1b'], // Small model suitable for CPU
      tags: ['local', 'cpu-only'],
      healthCheckPath: '/api/tags',
      timeout: 30000,
    }
  ],
  defaultServer: 'local',
  healthCheckInterval: 30000, // 30 seconds
  requestTimeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
};

/**
 * Environment-based configuration override
 */
export function getOllamaConfig(): OllamaConfig {
  const config = { ...DEFAULT_OLLAMA_CONFIG };
  
  // Allow override from environment for development
  if (process.env.OLLAMA_SERVER_URL) {
    config.servers[0].url = process.env.OLLAMA_SERVER_URL;
  }
  
  if (process.env.OLLAMA_REQUEST_TIMEOUT) {
    config.requestTimeout = parseInt(process.env.OLLAMA_REQUEST_TIMEOUT, 10);
  }
  
  if (process.env.OLLAMA_HEALTH_CHECK_INTERVAL) {
    config.healthCheckInterval = parseInt(process.env.OLLAMA_HEALTH_CHECK_INTERVAL, 10);
  }
  
  return config;
}
