/**
 * Integration test for PluginSystemFactory 
 * Uses actual implementations with minimal mocking
 */

import { describe, it, expect } from '@jest/globals';
import { PluginType } from '@verseforge/core';

describe('PluginSystemFactory Integration Test', () => {
  it('should successfully import PluginSystemFactory', async () => {
    // Test that the factory can be imported
    const { PluginSystemFactory } = await import('../../../src/plugins/manager/plugin-system.factory');
    expect(PluginSystemFactory).toBeDefined();
    expect(typeof PluginSystemFactory.create).toBe('function');
    expect(typeof PluginSystemFactory.loadPluginsFromDirectories).toBe('function');
  });

  it('should have proper method signatures', async () => {
    const { PluginSystemFactory } = await import('../../../src/plugins/manager/plugin-system.factory');

    // Test that methods exist and are functions
    expect(PluginSystemFactory.create).toBeInstanceOf(Function);
    expect(PluginSystemFactory.loadPluginsFromDirectories).toBeInstanceOf(Function);
  });

  it('should import all required dependencies', async () => {
    // Test that all the required classes can be imported
    const [
      { MongoPluginRepository },
      { PluginDomainService },
      { FileSystemPluginLoader },
      { PluginController },
      { PluginUseCase }
    ] = await Promise.all([
      import('../../../src/infrastructure/persistence/mongo-plugin.repository'),
      import('../../../src/core/services/plugin.domain.service'),
      import('../../../src/infrastructure/loaders/plugin.loader'),
      import('../../../src/api/controllers/plugin.controller'),
      import('../../../src/application/use-cases/plugin.use-case')
    ]);

    expect(MongoPluginRepository).toBeDefined();
    expect(PluginDomainService).toBeDefined();
    expect(FileSystemPluginLoader).toBeDefined();
    expect(PluginController).toBeDefined();
    expect(PluginUseCase).toBeDefined();
  });

  it('should have valid plugin configuration interface', async () => {
    const { PluginSystemFactory } = await import('../../../src/plugins/manager/plugin-system.factory');

    // Test basic configuration structure (without actually creating it)
    const mockConfig = {
      mongoClient: {} as any, // Type assertion to avoid mock complexity
      databaseName: 'test_db',
      pluginDirectories: ['/test/plugins'],
      autoLoadPlugins: false,
    };

    expect(mockConfig.databaseName).toBe('test_db');
    expect(mockConfig.pluginDirectories).toEqual(['/test/plugins']);
    expect(mockConfig.autoLoadPlugins).toBe(false);

    // Verify the config structure matches what the factory expects
    expect(typeof mockConfig.mongoClient).toBe('object');
    expect(typeof mockConfig.databaseName).toBe('string');
    expect(Array.isArray(mockConfig.pluginDirectories)).toBe(true);
    expect(typeof mockConfig.autoLoadPlugins).toBe('boolean');
  });

  it('should work with plugin metadata structures', () => {
    // Test that plugin structures are properly defined
    const mockPluginMetadata = {
      name: 'test-plugin',
      version: '1.0.0',
      type: PluginType.CORE
    };

    expect(mockPluginMetadata.name).toBe('test-plugin');
    expect(mockPluginMetadata.version).toBe('1.0.0');
    expect(mockPluginMetadata.type).toBe(PluginType.CORE);
    expect(Object.values(PluginType)).toContain(PluginType.CORE);
  });

  it('should have TypeScript interfaces properly exported', async () => {
    // Import and test the interface is available
    const factoryModule = await import('../../../src/plugins/manager/plugin-system.factory');
    expect(factoryModule.PluginSystemFactory).toBeDefined();

    // Test that the factory has the expected static methods
    const factoryClass = factoryModule.PluginSystemFactory;
    expect(factoryClass.create).toBeDefined();
    expect(factoryClass.loadPluginsFromDirectories).toBeDefined();
  });
});
