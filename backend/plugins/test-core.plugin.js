/**
 * Test Core Plugin - A simple plugin for testing the plugin system
 */

// Plugin metadata
export const metadata = {
  name: 'test-core-plugin',
  version: '1.0.0',
  description: 'A simple core plugin for testing',
  author: 'Universe Book Writer',
  type: 'core',
  dependencies: {},
  keywords: ['test', 'core']
};

// Plugin class
export class TestCorePlugin {
  constructor() {
    this._state = 'unloaded';
    this._config = {
      enabled: true,
      settings: {
        testSetting: 'default-value'
      }
    };
    this._loadPath = null;
  }

  get metadata() {
    return metadata;
  }

  get state() {
    return this._state;
  }

  get config() {
    return { ...this._config };
  }

  setLoadPath(path) {
    this._loadPath = path;
  }

  async initialize() {
    console.log(`Initializing ${metadata.name}...`);
    this._state = 'initialized';
  }

  async activate() {
    console.log(`Activating ${metadata.name}...`);
    this._state = 'active';
  }

  async deactivate() {
    console.log(`Deactivating ${metadata.name}...`);
    this._state = 'initialized';
  }

  async destroy() {
    console.log(`Destroying ${metadata.name}...`);
    this._state = 'unloaded';
  }

  async validateConfig(config) {
    // Simple validation - just check if config is an object
    return typeof config === 'object' && config !== null;
  }

  async updateConfig(newConfig) {
    this._config = {
      ...this._config,
      ...newConfig
    };
  }

  canActivate() {
    return this._state === 'initialized' && this._config.enabled;
  }

  canDeactivate() {
    return this._state === 'active';
  }
}

// Export plugin class as default
export default TestCorePlugin;
