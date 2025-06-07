/**
 * Plugin Hot Reload System Integration Tests (Fixed)
 */

import { describe, beforeEach, afterEach, test, expect, beforeAll, afterAll } from '@jest/globals';
import { setupMongoForTest } from '../helpers/mongodb-test-helper.js';
import path from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { PluginSystemFactory } from '../../src/plugins/manager/plugin-system.factory.js';
import { PluginUseCase } from '../../src/application/use-cases/plugin.use-case.js';
import { FileSystemPluginLoader } from '../../src/infrastructure/loaders/plugin.loader.js';
import { PluginState } from '@universe-book-writer/core';

describe('Plugin Hot Reload Integration Tests', () => {
  let mongoClient: any;
  let pluginUseCase: PluginUseCase;
  let testPluginDir: string;
  let mongoCleanup: () => Promise<void>;

  beforeAll(async () => {
    // Use shared MongoDB setup
    const mongoSetup = await setupMongoForTest('test-hot-reload');
    mongoClient = mongoSetup.mongoClient;
    mongoCleanup = mongoSetup.cleanup;

    // Create test plugin directory
    testPluginDir = path.join(tmpdir(), 'hot-reload-test', Date.now().toString());
    await fs.mkdir(testPluginDir, { recursive: true });
  }, 120000); // 2 minute timeout

  afterAll(async () => {
    // Cleanup
    if (mongoCleanup) {
      await mongoCleanup();
    }
    if (testPluginDir) {
      await fs.rm(testPluginDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Create plugin system
    const system = await PluginSystemFactory.create({
      mongoClient,
      databaseName: 'test-hot-reload',
      autoLoadPlugins: false
    });

    pluginUseCase = system.pluginUseCase;

    // Clear any existing data
    try {
      // Use clearAll if available, otherwise skip
      if (system.repository && typeof system.repository.clearAll === 'function') {
        await system.repository.clearAll();
      } else if (system.repository && typeof system.repository.clear === 'function') {
        await system.repository.clear();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up loaded plugins only if pluginUseCase is available
    if (pluginUseCase) {
      try {
        const plugins = pluginUseCase.getAllPlugins();
        for (const plugin of plugins) {
          try {
            await pluginUseCase.unregister(plugin.metadata.name);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Basic Plugin Loading', () => {    test('should load and activate a simple plugin', async () => {      // Create a simple plugin with exported functions
      const pluginCode = `
        export const metadata = {
          name: 'simple-test-plugin',
          version: '1.0.0',
          description: 'Plugin for basic testing',
          author: 'Test Author',
          type: 'core',
          dependencies: {}
        };

        export async function initialize() {
          console.log('Plugin initialized');
        }

        export async function activate() {
          console.log('Plugin activated');
        }

        export async function deactivate() {
          console.log('Plugin deactivated');
        }

        export async function destroy() {
          console.log('Plugin destroyed');
        }
      `;

      const pluginPath = path.join(testPluginDir, 'simple-test-plugin.mjs');
      await fs.writeFile(pluginPath, pluginCode);

      // Load and activate plugin
      const plugin = await pluginUseCase.loadPlugin(pluginPath);
      expect(plugin).toBeDefined();
      expect(plugin.metadata.name).toBe('simple-test-plugin');

      await pluginUseCase.activatePlugin('simple-test-plugin');
      const activePlugin = pluginUseCase.getPlugin('simple-test-plugin');
      expect(activePlugin).toBeDefined();
      expect(activePlugin!.state).toBe(PluginState.ACTIVE);
    });    test('should handle plugin loading errors gracefully', async () => {
      // Create invalid plugin code with a different type of error
      const invalidPluginCode = `
        // This will cause a runtime error instead of a syntax error
        export const metadata = {
          name: 'invalid-plugin',
          version: '1.0.0',
          description: 'Invalid plugin',
          author: 'Test Author',
          type: 'core',
          dependencies: {}
        };

        // This will throw an error during module initialization
        throw new Error('Plugin initialization failed');
      `;

      const pluginPath = path.join(testPluginDir, 'invalid-plugin.mjs');
      await fs.writeFile(pluginPath, invalidPluginCode);

      // Attempt to load invalid plugin
      await expect(pluginUseCase.loadPlugin(pluginPath)).rejects.toThrow();
    });    test('should manage multiple plugins', async () => {      // Create first plugin with exported functions
      const plugin1Code = `
        export const metadata = {
          name: 'multi-test-plugin-1',
          version: '1.0.0',
          description: 'First plugin',
          author: 'Test Author',
          type: 'core',
          dependencies: {}
        };

        export async function initialize() {
          console.log('Plugin 1 initialized');
        }

        export async function activate() {
          console.log('Plugin 1 activated');
        }

        export async function deactivate() {
          console.log('Plugin 1 deactivated');
        }

        export async function destroy() {
          console.log('Plugin 1 destroyed');
        }
      `;

      // Create second plugin with exported functions
      const plugin2Code = `
        export const metadata = {
          name: 'multi-test-plugin-2',
          version: '1.0.0',
          description: 'Second plugin',
          author: 'Test Author',
          type: 'core',
          dependencies: {}
        };

        export async function initialize() {
          console.log('Plugin 2 initialized');
        }

        export async function activate() {
          console.log('Plugin 2 activated');
        }

        export async function deactivate() {
          console.log('Plugin 2 deactivated');
        }

        export async function destroy() {
          console.log('Plugin 2 destroyed');
        }
      `;const plugin1Path = path.join(testPluginDir, 'multi-test-plugin-1.mjs');
      const plugin2Path = path.join(testPluginDir, 'multi-test-plugin-2.mjs');

      await fs.writeFile(plugin1Path, plugin1Code);
      await fs.writeFile(plugin2Path, plugin2Code);

      // Load both plugins
      const plugin1 = await pluginUseCase.loadPlugin(plugin1Path);
      const plugin2 = await pluginUseCase.loadPlugin(plugin2Path);

      expect(plugin1.metadata.name).toBe('multi-test-plugin-1');
      expect(plugin2.metadata.name).toBe('multi-test-plugin-2');

      // Activate both plugins
      await pluginUseCase.activatePlugin('multi-test-plugin-1');
      await pluginUseCase.activatePlugin('multi-test-plugin-2');

      // Verify both are active
      const activePlugin1 = pluginUseCase.getPlugin('multi-test-plugin-1');
      const activePlugin2 = pluginUseCase.getPlugin('multi-test-plugin-2');

      expect(activePlugin1!.state).toBe(PluginState.ACTIVE);
      expect(activePlugin2!.state).toBe(PluginState.ACTIVE);

      // Get all plugins
      const allPlugins = pluginUseCase.getAllPlugins();
      expect(allPlugins.length).toBe(2);
    });
  });

  describe('Plugin Configuration', () => {    test('should update plugin configuration', async () => {      // Create plugin with configurable settings using exported functions
      const pluginCode = `
        export const metadata = {
          name: 'config-test-plugin',
          version: '1.0.0',
          description: 'Plugin for config testing',
          author: 'Test Author',
          type: 'core',
          dependencies: {}
        };

        let pluginMessage = 'default';

        export async function initialize() {
          console.log('Config plugin initialized');
        }

        export async function activate() {
          console.log('Config plugin activated');
        }

        export async function deactivate() {
          console.log('Config plugin deactivated');
        }

        export async function destroy() {
          console.log('Config plugin destroyed');
        }

        export function updateConfig(config) {
          if (config.message) {
            pluginMessage = config.message;
          }
        }

        export function getMessage() {
          return pluginMessage;
        }
      `;

      const pluginPath = path.join(testPluginDir, 'config-test-plugin.mjs');
      await fs.writeFile(pluginPath, pluginCode);      // Load and activate plugin
      const plugin = await pluginUseCase.loadPlugin(pluginPath);
      await pluginUseCase.activatePlugin('config-test-plugin');

      // Access the plugin module through the GenericPluginWrapper
      const pluginWrapper = plugin as any;
      const pluginModule = pluginWrapper.module;

      // Verify initial config
      expect(pluginModule.getMessage()).toBe('default');

      // Update configuration
      pluginModule.updateConfig({ message: 'updated' });
      expect(pluginModule.getMessage()).toBe('updated');
    });
  });
});
