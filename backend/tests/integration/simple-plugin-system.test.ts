/**
 * Simple plugin system integration test - Backend API testing
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { setupMongoForTest } from '../helpers/mongodb-test-helper.js';
import { PluginSystemFactory } from '../../src/plugins/manager/plugin-system.factory.js';

describe('Plugin System Backend Integration', () => {
  let mongoClient: any;
  let pluginSystem: any;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    // Use shared MongoDB setup
    try {
      const mongoSetup = await setupMongoForTest('test-simple-plugin');
      mongoClient = mongoSetup.mongoClient;
      cleanup = mongoSetup.cleanup;

      // Create plugin system
      pluginSystem = await PluginSystemFactory.create({
        mongoClient,
        databaseName: 'test-simple-plugin',
        autoLoadPlugins: false
      });

      console.log('Plugin system integration test setup complete');
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  }, 180000); // 3 minute timeout

  afterAll(async () => {
    try {
      if (cleanup) {
        await cleanup();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  test('should create plugin system successfully', () => {
    expect(pluginSystem).toBeDefined();
    expect(pluginSystem.pluginUseCase).toBeDefined();
    expect(pluginSystem.pluginController).toBeDefined();
    expect(pluginSystem.repository).toBeDefined();
  });

  test('should start with empty plugin registry', async () => {
    const plugins = pluginSystem.pluginUseCase.getAllPlugins();
    expect(plugins).toHaveLength(0);
  });

  test('should return empty dependency graph initially', async () => {
    const dependencyGraph = await pluginSystem.pluginUseCase.getDependencyGraph();
    expect(dependencyGraph).toBeInstanceOf(Map);
    expect(dependencyGraph.size).toBe(0);
  });
});
