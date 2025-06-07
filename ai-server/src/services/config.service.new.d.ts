/**
 * AI Configuration Service
 * Manages AI settings in the database
 */
import type { MongoClient } from 'mongodb';
export interface OllamaServerSettings {
  id: string;
  name: string;
  url: string;
  isLocal: boolean;
  priority: number;
  enabled: boolean;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}
export interface AISettings {
  ollamaServers: OllamaServerSettings[];
  defaultModel: string;
  loadBalancingStrategy: 'priority' | 'round-robin' | 'least-connections' | 'response-time';
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  requestTimeout: number;
}
export declare const DefaultAISettings: AISettings;
export interface AIConfigurationService {
  getSettings(): Promise<AISettings>;
  updateSettings(settings: Partial<AISettings>): Promise<AISettings>;
  addOllamaServer(server: OllamaServerSettings): Promise<AISettings>;
  removeOllamaServer(serverId: string): Promise<AISettings>;
  updateOllamaServer(serverId: string, server: Partial<OllamaServerSettings>): Promise<AISettings>;
}
export declare class DatabaseAIConfigurationService implements AIConfigurationService {
  private mongoClient;
  private collection;
  private static readonly SETTINGS_ID;
  constructor(mongoClient: MongoClient, dbName: string);
  /**
   * Get current AI settings
   */
  getSettings(): Promise<AISettings>;
  /**
   * Update AI settings
   */
  updateSettings(settings: Partial<AISettings>): Promise<AISettings>;
  /**
   * Add Ollama server
   */
  addOllamaServer(server: OllamaServerSettings): Promise<AISettings>;
  /**
   * Remove Ollama server
   */
  removeOllamaServer(serverId: string): Promise<AISettings>;
  /**
   * Update Ollama server
   */
  updateOllamaServer(
    serverId: string,
    serverUpdate: Partial<OllamaServerSettings>
  ): Promise<AISettings>;
  /**
   * Initialize the collection with default settings if it doesn't exist
   */
  initialize(): Promise<void>;
}
/**
 * Simple in-memory configuration service for testing
 */
export declare class InMemoryAIConfigurationService implements AIConfigurationService {
  private settings;
  getSettings(): Promise<AISettings>;
  updateSettings(settings: Partial<AISettings>): Promise<AISettings>;
  addOllamaServer(server: OllamaServerSettings): Promise<AISettings>;
  removeOllamaServer(serverId: string): Promise<AISettings>;
  updateOllamaServer(
    serverId: string,
    serverUpdate: Partial<OllamaServerSettings>
  ): Promise<AISettings>;
}
//# sourceMappingURL=config.service.new.d.ts.map
