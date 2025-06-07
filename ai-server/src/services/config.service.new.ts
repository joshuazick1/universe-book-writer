/**
 * AI Configuration Service
 * Manages AI settings in the database
 */

import { Collection, MongoClient } from 'mongodb';

// Local type definitions (will move to core package later)
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

export const DefaultAISettings: AISettings = {
  ollamaServers: [
    {
      id: 'local-cpu',
      name: 'Local CPU',
      url: 'http://localhost:11434',
      isLocal: true,
      priority: 1,
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
    },
  ],
  defaultModel: 'llama3.2:3b',
  loadBalancingStrategy: 'priority',
  healthCheckInterval: 30000,
  circuitBreakerThreshold: 5,
  requestTimeout: 60000,
};

export interface AIConfigurationService {
  getSettings(): Promise<AISettings>;
  updateSettings(settings: Partial<AISettings>): Promise<AISettings>;
  addOllamaServer(server: OllamaServerSettings): Promise<AISettings>;
  removeOllamaServer(serverId: string): Promise<AISettings>;
  updateOllamaServer(serverId: string, server: Partial<OllamaServerSettings>): Promise<AISettings>;
}

export class DatabaseAIConfigurationService implements AIConfigurationService {
  private collection: Collection<AISettings & { _id: string }>;
  private static readonly SETTINGS_ID = 'ai_settings';

  constructor(private mongoClient: MongoClient, dbName: string) {
    this.collection = mongoClient.db(dbName).collection<AISettings & { _id: string }>('ai_settings');
  }

  /**
   * Get current AI settings
   */
  public async getSettings(): Promise<AISettings> {
    const settings = await this.collection.findOne({ _id: DatabaseAIConfigurationService.SETTINGS_ID });
    if (!settings) {
      return DefaultAISettings;
    }
    // Remove _id field from the returned settings
    const { _id, ...settingsData } = settings;
    return settingsData;
  }

  /**
   * Update AI settings
   */
  public async updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
    const currentSettings = await this.getSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    await this.collection.replaceOne(
      { _id: DatabaseAIConfigurationService.SETTINGS_ID },
      { _id: DatabaseAIConfigurationService.SETTINGS_ID, ...newSettings },
      { upsert: true }
    );

    return newSettings;
  }

  /**
   * Add Ollama server
   */
  public async addOllamaServer(server: OllamaServerSettings): Promise<AISettings> {
    const currentSettings = await this.getSettings();
    
    // Check if server already exists
    if (currentSettings.ollamaServers.some((s: any) => s.id === server.id)) {
      throw new Error(`Server with ID ${server.id} already exists`);
    }

    const newSettings = {
      ...currentSettings,
      ollamaServers: [...currentSettings.ollamaServers, server],
    };

    return this.updateSettings(newSettings);
  }

  /**
   * Remove Ollama server
   */
  public async removeOllamaServer(serverId: string): Promise<AISettings> {
    const currentSettings = await this.getSettings();
    
    const newSettings = {
      ...currentSettings,
      ollamaServers: currentSettings.ollamaServers.filter((s: any) => s.id !== serverId),
    };

    return this.updateSettings(newSettings);
  }

  /**
   * Update Ollama server
   */
  public async updateOllamaServer(serverId: string, serverUpdate: Partial<OllamaServerSettings>): Promise<AISettings> {
    const currentSettings = await this.getSettings();
    
    const serverIndex = currentSettings.ollamaServers.findIndex((s: any) => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error(`Server with ID ${serverId} not found`);
    }

    const updatedServers = [...currentSettings.ollamaServers];
    updatedServers[serverIndex] = { ...updatedServers[serverIndex], ...serverUpdate };

    const newSettings = {
      ...currentSettings,
      ollamaServers: updatedServers,
    };

    return this.updateSettings(newSettings);
  }

  /**
   * Initialize the collection with default settings if it doesn't exist
   */
  public async initialize(): Promise<void> {
    const existingSettings = await this.collection.findOne({ _id: DatabaseAIConfigurationService.SETTINGS_ID });
    
    if (!existingSettings) {
      await this.collection.insertOne({
        _id: DatabaseAIConfigurationService.SETTINGS_ID,
        ...DefaultAISettings,
      });
    }
  }
}

/**
 * Simple in-memory configuration service for testing
 */
export class InMemoryAIConfigurationService implements AIConfigurationService {
  private settings: AISettings = DefaultAISettings;

  public async getSettings(): Promise<AISettings> {
    return { ...this.settings };
  }

  public async updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
    this.settings = { ...this.settings, ...settings };
    return { ...this.settings };
  }

  public async addOllamaServer(server: OllamaServerSettings): Promise<AISettings> {
    if (this.settings.ollamaServers.some(s => s.id === server.id)) {
      throw new Error(`Server with ID ${server.id} already exists`);
    }
    
    this.settings.ollamaServers.push(server);
    return { ...this.settings };
  }

  public async removeOllamaServer(serverId: string): Promise<AISettings> {
    this.settings.ollamaServers = this.settings.ollamaServers.filter(s => s.id !== serverId);
    return { ...this.settings };
  }

  public async updateOllamaServer(serverId: string, serverUpdate: Partial<OllamaServerSettings>): Promise<AISettings> {
    const serverIndex = this.settings.ollamaServers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error(`Server with ID ${serverId} not found`);
    }

    this.settings.ollamaServers[serverIndex] = { ...this.settings.ollamaServers[serverIndex], ...serverUpdate };
    return { ...this.settings };
  }
}
