/**
 * Tests for the PluginEntity class
 */

import { PluginState, PluginType } from '@verseforge/core';
import { PluginEntity } from '../../../src/core/entities/plugin.entity.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('PluginEntity', () => {
  // Mock plugin metadata
  const mockMetadata = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    type: PluginType.CORE,
    dependencies: {},
    keywords: ['test'],
  };

  // Test config
  const testConfig = {
    enabled: true,
    settings: { settingKey: 'settingValue' },
  };

  let plugin: PluginEntity;

  beforeEach(() => {
    plugin = new PluginEntity(mockMetadata, testConfig);
  });

  describe('Constructor and getters', () => {
    it('should properly initialize with metadata and config', () => {
      expect(plugin.metadata).toEqual(mockMetadata);
      expect(plugin.config).toEqual(testConfig);
      expect(plugin.state).toEqual(PluginState.UNLOADED);
      expect(plugin.lastError).toBeUndefined();
    });

    it('should use default config if none provided', () => {
      const defaultPlugin = new PluginEntity(mockMetadata);
      expect(defaultPlugin.config).toEqual({
        enabled: true,
        settings: {},
      });
    });

    it('should merge provided config with defaults', () => {
      const partialConfig = {
        settings: { key: 'value' },
      };
      const mergePlugin = new PluginEntity(mockMetadata, partialConfig);
      expect(mergePlugin.config).toEqual({
        enabled: true,
        settings: { key: 'value' },
      });
    });

    it('should be able to set and get load path', () => {
      const testPath = '/path/to/plugin';
      plugin.setLoadPath(testPath);
      expect(plugin.loadPath).toBe(testPath);
    });
  });

  describe('Lifecycle methods', () => {
    it('should transition to INITIALIZED state after initialization', async () => {
      await plugin.initialize();
      expect(plugin.state).toBe(PluginState.INITIALIZED);
    });

    it('should transition to ACTIVE state after activation', async () => {
      await plugin.initialize();
      await plugin.activate();
      expect(plugin.state).toBe(PluginState.ACTIVE);
    });

    it('should transition back to INITIALIZED state after deactivation', async () => {
      await plugin.initialize();
      await plugin.activate();
      await plugin.deactivate();
      expect(plugin.state).toBe(PluginState.INITIALIZED);
    });

    it('should transition to UNLOADED state after destruction', async () => {
      await plugin.initialize();
      await plugin.destroy();
      expect(plugin.state).toBe(PluginState.UNLOADED);
    });

    it('should automatically deactivate active plugin during destruction', async () => {
      await plugin.initialize();
      await plugin.activate();
      const deactivateSpy = jest.spyOn(plugin, 'deactivate');

      await plugin.destroy();

      expect(deactivateSpy).toHaveBeenCalled();
      expect(plugin.state).toBe(PluginState.UNLOADED);
    });

    it('should throw error when activating a non-initialized plugin', async () => {
      await expect(plugin.activate()).rejects.toThrow(/Cannot activate plugin in state/);
    }); it('should throw error when deactivating a non-active plugin', async () => {
      await plugin.initialize();
      // Now the plugin is in INITIALIZED state, not ACTIVE
      await expect(plugin.deactivate()).rejects.toThrow(/Cannot deactivate plugin in state/);
    });
  });

  describe('Error handling', () => {
    it('should transition to ERROR state if initialization fails', async () => {
      const errorPlugin = new class extends PluginEntity {
        protected override async onInitialize(): Promise<void> {
          throw new Error('Init error');
        }
      }(mockMetadata);

      await expect(errorPlugin.initialize()).rejects.toThrow('Init error');
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.lastError).toBe('Init error');
    });

    it('should transition to ERROR state if activation fails', async () => {
      const errorPlugin = new class extends PluginEntity {
        protected override async onActivate(): Promise<void> {
          throw new Error('Activation error');
        }
      }(mockMetadata);

      await errorPlugin.initialize();
      await expect(errorPlugin.activate()).rejects.toThrow('Activation error');
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.lastError).toBe('Activation error');
    });

    it('should transition to ERROR state if deactivation fails', async () => {
      const errorPlugin = new class extends PluginEntity {
        protected override async onDeactivate(): Promise<void> {
          throw new Error('Deactivation error');
        }
      }(mockMetadata);

      await errorPlugin.initialize();
      await errorPlugin.activate();
      await expect(errorPlugin.deactivate()).rejects.toThrow('Deactivation error');
      expect(errorPlugin.state).toBe(PluginState.ERROR);
      expect(errorPlugin.lastError).toBe('Deactivation error');
    });
  });

  describe('Configuration management', () => {
    it('should validate and update config', async () => {
      const newConfig = {
        enabled: false,
        settings: { newKey: 'newValue' },
      };

      await plugin.updateConfig(newConfig);
      expect(plugin.config).toEqual(newConfig);
    });

    it('should throw error on invalid config', async () => {
      const validatePlugin = new class extends PluginEntity {
        protected override async onValidateConfig(): Promise<boolean> {
          return false;
        }
      }(mockMetadata);

      await expect(validatePlugin.updateConfig({ enabled: false })).rejects.toThrow('Invalid plugin configuration');
    });

    it('should call onConfigUpdate when updating config', async () => {
      const updatePlugin = new class extends PluginEntity {
        configUpdated = false;

        protected override async onConfigUpdate(): Promise<void> {
          this.configUpdated = true;
        }
      }(mockMetadata);

      await updatePlugin.updateConfig({ enabled: false });
      expect(updatePlugin.configUpdated).toBe(true);
    });
  });

  describe('State checking methods', () => {
    it('should indicate if plugin can be activated', async () => {
      expect(plugin.canActivate()).toBe(false);
      await plugin.initialize();
      expect(plugin.canActivate()).toBe(true);

      // Disabled plugins can't activate
      await plugin.updateConfig({ enabled: false });
      expect(plugin.canActivate()).toBe(false);
    });

    it('should indicate if plugin can be deactivated', async () => {
      expect(plugin.canDeactivate()).toBe(false);
      await plugin.initialize();
      expect(plugin.canDeactivate()).toBe(false);
      await plugin.activate();
      expect(plugin.canDeactivate()).toBe(true);
    });
  });
});
