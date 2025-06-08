/**
 * Ollama Client
 * Handles communication with Ollama servers
 */

import { EventEmitter } from 'node:events';
import axios, { AxiosError } from 'axios';
import type { OllamaServerConfig } from '../config/ollama.config.js';

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  context?: number[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_predict?: number;
  stop?: string[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
    [key: string]: unknown;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ModelsResponse {
  models: ModelInfo[];
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export class OllamaClient extends EventEmitter {
  private server: OllamaServerConfig;
  private requestId = 0;

  constructor(server: OllamaServerConfig) {
    super();
    this.server = server;
  }

  /**
   * Generate text completion
   */
  public async generate(request: OllamaRequest): Promise<OllamaResponse> {
    const requestId = ++this.requestId;
    const startTime = Date.now();

    this.emit('requestStart', requestId, request);

    try {
      const response = await axios.post<OllamaResponse>(
        `${this.server.url}/api/generate`,
        request,
        {
          timeout: this.server.timeout || 60000,
          headers: {
            'Content-Type': 'application/json',
            ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
          },
        }
      );

      const duration = Date.now() - startTime;
      this.emit('requestComplete', requestId, duration, true);

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('requestComplete', requestId, duration, false);
      this.emit('requestError', requestId, error);

      if (error instanceof AxiosError) {
        throw new Error(`Ollama request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate streaming text completion
   */
  public async generateStream(
    request: OllamaRequest,
    onChunk: (chunk: OllamaStreamResponse) => void
  ): Promise<void> {
    const requestId = ++this.requestId;
    const startTime = Date.now();

    this.emit('streamStart', requestId, request);

    try {
      const response = await axios.post(
        `${this.server.url}/api/generate`,
        { ...request, stream: true },
        {
          timeout: this.server.timeout || 60000,
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json',
            ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
          },
        }
      );

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line) as OllamaStreamResponse;
              onChunk(data);

              if (data.done) {
                const duration = Date.now() - startTime;
                this.emit('streamComplete', requestId, duration, true);
                return;
              }
            } catch (parseError) {
              this.emit('parseError', requestId, parseError, line);
            }
          }
        }
      });

      response.data.on('error', (error: Error) => {
        const duration = Date.now() - startTime;
        this.emit('streamComplete', requestId, duration, false);
        this.emit('streamError', requestId, error);
        throw error;
      });

      response.data.on('end', () => {
        // Handle any remaining buffer content
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer) as OllamaStreamResponse;
            onChunk(data);
          } catch (parseError) {
            this.emit('parseError', requestId, parseError, buffer);
          }
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('streamComplete', requestId, duration, false);
      this.emit('streamError', requestId, error);

      if (error instanceof AxiosError) {
        throw new Error(`Ollama stream request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get available models
   */
  public async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await axios.get<ModelsResponse>(`${this.server.url}/api/tags`, {
        timeout: this.server.timeout || 30000,
        headers: {
          ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
        },
      });

      return response.data.models;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Failed to get models: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get model information
   */
  public async getModelInfo(modelName: string): Promise<ModelInfo> {
    try {
      const response = await axios.post(
        `${this.server.url}/api/show`,
        { name: modelName },
        {
          timeout: this.server.timeout || 30000,
          headers: {
            'Content-Type': 'application/json',
            ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Failed to get model info: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Pull a model
   */
  public async pullModel(
    modelName: string,
    onProgress?: (progress: PullProgress) => void
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.server.url}/api/pull`,
        { name: modelName, stream: !!onProgress },
        {
          timeout: 0, // No timeout for model pulls
          responseType: onProgress ? 'stream' : 'json',
          headers: {
            'Content-Type': 'application/json',
            ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
          },
        }
      );

      if (onProgress) {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                onProgress(data);
              } catch (parseError) {
                // Ignore parse errors for progress updates
              }
            }
          }
        });

        return new Promise((resolve, reject) => {
          response.data.on('end', resolve);
          response.data.on('error', reject);
        });
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Failed to pull model: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a model
   */
  public async deleteModel(modelName: string): Promise<void> {
    try {
      await axios.delete(`${this.server.url}/api/delete`, {
        data: { name: modelName },
        timeout: this.server.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
        },
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Failed to delete model: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check server health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.server.url}/api/tags`, {
        timeout: 5000, // Quick health check
        headers: {
          ...(this.server.apiKey && { Authorization: `Bearer ${this.server.apiKey}` }),
        },
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server configuration
   */
  public getServerConfig(): OllamaServerConfig {
    return { ...this.server };
  }

  /**
   * Update server configuration
   */
  public updateServerConfig(config: Partial<OllamaServerConfig>): void {
    this.server = { ...this.server, ...config };
    this.emit('configUpdated', this.server);
  }
}
