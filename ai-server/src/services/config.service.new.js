/**
 * AI Configuration Service
 * Manages AI settings in the database
 */
export const DefaultAISettings = {
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
export class DatabaseAIConfigurationService {
  mongoClient;
  collection;
  static SETTINGS_ID = 'ai_settings';
  constructor(mongoClient, dbName) {
    this.mongoClient = mongoClient;
    this.collection = mongoClient.db(dbName).collection('ai_settings');
  }
  /**
   * Get current AI settings
   */
  async getSettings() {
    const settings = await this.collection.findOne({
      _id: DatabaseAIConfigurationService.SETTINGS_ID,
    });
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
  async updateSettings(settings) {
    const currentSettings = await this.getSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
    };
    await this.collection.replaceOne(
      { _id: DatabaseAIConfigurationService.SETTINGS_ID },
      newSettings,
      { upsert: true }
    );
    return newSettings;
  }
  /**
   * Add Ollama server
   */
  async addOllamaServer(server) {
    const currentSettings = await this.getSettings();
    // Check if server already exists
    if (currentSettings.ollamaServers.some(s => s.id === server.id)) {
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
  async removeOllamaServer(serverId) {
    const currentSettings = await this.getSettings();
    const newSettings = {
      ...currentSettings,
      ollamaServers: currentSettings.ollamaServers.filter(s => s.id !== serverId),
    };
    return this.updateSettings(newSettings);
  }
  /**
   * Update Ollama server
   */
  async updateOllamaServer(serverId, serverUpdate) {
    const currentSettings = await this.getSettings();
    const serverIndex = currentSettings.ollamaServers.findIndex(s => s.id === serverId);
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
  async initialize() {
    const existingSettings = await this.collection.findOne({
      _id: DatabaseAIConfigurationService.SETTINGS_ID,
    });
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
export class InMemoryAIConfigurationService {
  settings = DefaultAISettings;
  async getSettings() {
    return { ...this.settings };
  }
  async updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    return { ...this.settings };
  }
  async addOllamaServer(server) {
    if (this.settings.ollamaServers.some(s => s.id === server.id)) {
      throw new Error(`Server with ID ${server.id} already exists`);
    }
    this.settings.ollamaServers.push(server);
    return { ...this.settings };
  }
  async removeOllamaServer(serverId) {
    this.settings.ollamaServers = this.settings.ollamaServers.filter(s => s.id !== serverId);
    return { ...this.settings };
  }
  async updateOllamaServer(serverId, serverUpdate) {
    const serverIndex = this.settings.ollamaServers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    this.settings.ollamaServers[serverIndex] = {
      ...this.settings.ollamaServers[serverIndex],
      ...serverUpdate,
    };
    return { ...this.settings };
  }
}
//# sourceMappingURL=config.service.new.js.map
