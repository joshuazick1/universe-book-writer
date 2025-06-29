/**
 * Plugin Controller Unit Tests
 * Tests the PluginController class methods in isolation with mocked dependencies
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { PluginController } from '../../../src/api/controllers/plugin.controller.js';
import { PluginUseCase } from '../../../src/application/use-cases/plugin.use-case.js';
import { PluginState, PluginType, Plugin, PluginRegistryEntry } from '@universe-book-writer/core';

// Mock dependencies
const mockPluginUseCase = {
  register: jest.fn(),
  unregister: jest.fn(),
  getPlugin: jest.fn(),
  getAllPlugins: jest.fn(),
  getPluginsByType: jest.fn(),
  getAllAvailablePlugins: jest.fn(),
  getPluginStatus: jest.fn(),
  loadPlugin: jest.fn(),
  activatePlugin: jest.fn(),
  deactivatePlugin: jest.fn(),
  updatePluginConfig: jest.fn(),
  getDependencyGraph: jest.fn(),
  validateDependencies: jest.fn(),
  loadAllPlugins: jest.fn(),
} as unknown as jest.Mocked<PluginUseCase>;

// Mock request/response helpers
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  body: {},
  params: {},
  query: {},
  ...overrides,
} as Request);

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  return res;
};

// Sample plugin data for tests
const mockPluginMetadata = {
  name: 'star-trek-plugin',
  version: '1.0.0',
  description: 'Star Trek universe plugin',
  author: 'Test Author',
  homepage: 'https://example.com',
  repository: 'https://github.com/example/star-trek-plugin',
  license: 'MIT',
  keywords: ['star-trek', 'universe'],
  type: PluginType.UNIVERSE,
  dependencies: {},
  peerDependencies: {},
  engines: {
    node: '>=18.0.0',
  },
};

const mockPlugin = {
  metadata: mockPluginMetadata,
  state: PluginState.ACTIVE,
  config: {
    enabled: true,
    settings: { theme: 'dark' },
  },
  dependencies: [],
  dependents: [],
  initialize: jest.fn() as jest.MockedFunction<() => Promise<void>>,
  activate: jest.fn() as jest.MockedFunction<() => Promise<void>>,
  deactivate: jest.fn() as jest.MockedFunction<() => Promise<void>>,
  destroy: jest.fn() as jest.MockedFunction<() => Promise<void>>,
  canActivate: jest.fn() as jest.MockedFunction<() => boolean>,
  canDeactivate: jest.fn() as jest.MockedFunction<() => boolean>,
  getAPI: jest.fn(),
} as unknown as Plugin;

const mockRegistryEntry = {
  id: 'plugin-1',
  pluginMetadata: mockPluginMetadata,
  loadPath: '/path/to/plugin',
  state: PluginState.ACTIVE,
  config: mockPlugin.config,
  dependents: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as PluginRegistryEntry;

describe('PluginController', () => {
  let pluginController: PluginController;
  let mockRequest: Request;
  let mockResponse: jest.Mocked<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh instances
    pluginController = new PluginController(mockPluginUseCase);
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPlugins', () => {
    it('should return all loaded plugins when includeInactive is not specified', async () => {
      // Arrange
      mockRequest.query = {};
      mockPluginUseCase.getAllPlugins.mockReturnValue([mockPlugin]);

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getAllPlugins).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          name: 'star-trek-plugin',
          version: '1.0.0',
          type: PluginType.UNIVERSE,
          state: PluginState.ACTIVE,
          description: 'Star Trek universe plugin',
          author: 'Test Author',
        }],
        count: 1,
      });
    });

    it('should return plugins filtered by type', async () => {
      // Arrange
      mockRequest.query = { type: PluginType.UNIVERSE };
      mockPluginUseCase.getPluginsByType.mockReturnValue([mockPlugin]);

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getPluginsByType).toHaveBeenCalledWith(PluginType.UNIVERSE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          name: 'star-trek-plugin',
          version: '1.0.0',
          type: PluginType.UNIVERSE,
          state: PluginState.ACTIVE,
          description: 'Star Trek universe plugin',
          author: 'Test Author',
        }],
        count: 1,
      });
    });

    it('should return plugins filtered by state', async () => {
      // Arrange
      const inactivePlugin = { ...mockPlugin, state: PluginState.LOADED };
      mockRequest.query = { state: PluginState.ACTIVE };
      mockPluginUseCase.getAllPlugins.mockReturnValue([mockPlugin, inactivePlugin]);

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          name: 'star-trek-plugin',
          version: '1.0.0',
          type: PluginType.UNIVERSE,
          state: PluginState.ACTIVE,
          description: 'Star Trek universe plugin',
          author: 'Test Author',
        }],
        count: 1,
      });
    });

    it('should return all available plugins including inactive when includeInactive is true', async () => {
      // Arrange
      mockRequest.query = { includeInactive: 'true' };
      mockPluginUseCase.getAllAvailablePlugins.mockResolvedValue([mockRegistryEntry]);

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getAllAvailablePlugins).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          name: 'star-trek-plugin',
          version: '1.0.0',
          type: PluginType.UNIVERSE,
          state: PluginState.ACTIVE,
          description: 'Star Trek universe plugin',
          author: 'Test Author',
        }],
        count: 1,
      });
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockPluginUseCase.getAllPlugins.mockImplementation(() => {
        throw error;
      });

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockPluginUseCase.getAllPlugins.mockImplementation(() => {
        throw 'Unknown error';
      });

      // Act
      await pluginController.getAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown error',
      });
    });
  });

  describe('getPlugin', () => {
    it('should return plugin details when plugin exists', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };      const pluginStatus = {
        name: 'star-trek-plugin',
        state: PluginState.ACTIVE,
        metadata: mockPluginMetadata,
        config: mockPlugin.config,
        dependencies: [],
        dependents: [],
      };
      mockPluginUseCase.getPluginStatus.mockResolvedValue(pluginStatus);

      // Act
      await pluginController.getPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getPluginStatus).toHaveBeenCalledWith('star-trek-plugin');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: pluginStatus,
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await pluginController.getPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.getPluginStatus).not.toHaveBeenCalled();
    });

    it('should return 404 when plugin is not found', async () => {
      // Arrange
      mockRequest.params = { name: 'nonexistent-plugin' };
      mockPluginUseCase.getPluginStatus.mockResolvedValue(null);

      // Act
      await pluginController.getPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "Plugin 'nonexistent-plugin' not found",
      });
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      const error = new Error('Plugin status error');
      mockPluginUseCase.getPluginStatus.mockRejectedValue(error);

      // Act
      await pluginController.getPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin status error',
      });
    });
  });

  describe('loadPlugin', () => {
    it('should successfully load a plugin', async () => {
      // Arrange
      mockRequest.body = { path: '/path/to/plugin' };
      mockPluginUseCase.loadPlugin.mockResolvedValue(mockPlugin);

      // Act
      await pluginController.loadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.loadPlugin).toHaveBeenCalledWith('/path/to/plugin');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          name: 'star-trek-plugin',
          version: '1.0.0',
          type: PluginType.UNIVERSE,
          state: PluginState.ACTIVE,
          message: 'Plugin loaded successfully',
        },
      });
    });

    it('should return 400 when path is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await pluginController.loadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin path is required',
      });
      expect(mockPluginUseCase.loadPlugin).not.toHaveBeenCalled();
    });

    it('should handle load errors and return 400 status', async () => {
      // Arrange
      mockRequest.body = { path: '/invalid/path' };
      const error = new Error('Plugin not found at path');
      mockPluginUseCase.loadPlugin.mockRejectedValue(error);

      // Act
      await pluginController.loadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin not found at path',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.body = { path: '/path/to/plugin' };
      mockPluginUseCase.loadPlugin.mockRejectedValue('Unknown error');

      // Act
      await pluginController.loadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to load plugin',
      });
    });
  });

  describe('activatePlugin', () => {
    it('should successfully activate a plugin', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.activatePlugin.mockResolvedValue(undefined);

      // Act
      await pluginController.activatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.activatePlugin).toHaveBeenCalledWith('star-trek-plugin');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Plugin 'star-trek-plugin' activated successfully",
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await pluginController.activatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.activatePlugin).not.toHaveBeenCalled();
    });

    it('should handle activation errors and return 400 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      const error = new Error('Plugin activation failed');
      mockPluginUseCase.activatePlugin.mockRejectedValue(error);

      // Act
      await pluginController.activatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin activation failed',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.activatePlugin.mockRejectedValue('Unknown error');

      // Act
      await pluginController.activatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to activate plugin',
      });
    });
  });

  describe('deactivatePlugin', () => {
    it('should successfully deactivate a plugin', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.deactivatePlugin.mockResolvedValue(undefined);

      // Act
      await pluginController.deactivatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.deactivatePlugin).toHaveBeenCalledWith('star-trek-plugin');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Plugin 'star-trek-plugin' deactivated successfully",
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await pluginController.deactivatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.deactivatePlugin).not.toHaveBeenCalled();
    });

    it('should handle deactivation errors and return 400 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      const error = new Error('Plugin deactivation failed');
      mockPluginUseCase.deactivatePlugin.mockRejectedValue(error);

      // Act
      await pluginController.deactivatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin deactivation failed',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.deactivatePlugin.mockRejectedValue('Unknown error');

      // Act
      await pluginController.deactivatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to deactivate plugin',
      });
    });
  });

  describe('unloadPlugin', () => {
    it('should successfully unload a plugin', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.unregister.mockResolvedValue(undefined);

      // Act
      await pluginController.unloadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.unregister).toHaveBeenCalledWith('star-trek-plugin');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Plugin 'star-trek-plugin' unloaded successfully",
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await pluginController.unloadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.unregister).not.toHaveBeenCalled();
    });

    it('should handle unload errors and return 400 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      const error = new Error('Plugin unload failed');
      mockPluginUseCase.unregister.mockRejectedValue(error);

      // Act
      await pluginController.unloadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin unload failed',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.unregister.mockRejectedValue('Unknown error');

      // Act
      await pluginController.unloadPlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to unload plugin',
      });
    });
  });

  describe('updatePluginConfig', () => {
    it('should successfully update plugin configuration', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockRequest.body = { enabled: false, settings: { theme: 'light' } };
      mockPluginUseCase.updatePluginConfig.mockResolvedValue(undefined);

      // Act
      await pluginController.updatePluginConfig(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.updatePluginConfig).toHaveBeenCalledWith(
        'star-trek-plugin',
        { enabled: false, settings: { theme: 'light' } }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Plugin 'star-trek-plugin' configuration updated successfully",
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};
      mockRequest.body = { enabled: false };

      // Act
      await pluginController.updatePluginConfig(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.updatePluginConfig).not.toHaveBeenCalled();
    });

    it('should handle config update errors and return 400 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockRequest.body = { invalid: 'config' };
      const error = new Error('Invalid configuration');
      mockPluginUseCase.updatePluginConfig.mockRejectedValue(error);

      // Act
      await pluginController.updatePluginConfig(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid configuration',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockRequest.body = { enabled: true };
      mockPluginUseCase.updatePluginConfig.mockRejectedValue('Unknown error');

      // Act
      await pluginController.updatePluginConfig(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update plugin configuration',
      });
    });
  });

  describe('getDependencyGraph', () => {
    it('should return dependency graph successfully', async () => {
      // Arrange
      const dependencyMap = new Map([
        ['star-trek-plugin', ['core-plugin']],
        ['star-wars-plugin', ['core-plugin', 'universe-utils']],
      ]);
      mockPluginUseCase.getDependencyGraph.mockResolvedValue(dependencyMap);

      // Act
      await pluginController.getDependencyGraph(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getDependencyGraph).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          'star-trek-plugin': ['core-plugin'],
          'star-wars-plugin': ['core-plugin', 'universe-utils'],
        },
      });
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      const error = new Error('Dependency graph error');
      mockPluginUseCase.getDependencyGraph.mockRejectedValue(error);

      // Act
      await pluginController.getDependencyGraph(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Dependency graph error',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockPluginUseCase.getDependencyGraph.mockRejectedValue('Unknown error');

      // Act
      await pluginController.getDependencyGraph(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get dependency graph',
      });
    });
  });

  describe('validatePlugin', () => {
    it('should validate plugin dependencies successfully', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.getPlugin.mockReturnValue(mockPlugin);
      mockPluginUseCase.validateDependencies.mockResolvedValue(true);

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.getPlugin).toHaveBeenCalledWith('star-trek-plugin');
      expect(mockPluginUseCase.validateDependencies).toHaveBeenCalledWith(mockPlugin);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          valid: true,
          plugin: 'star-trek-plugin',
        },
      });
    });

    it('should return 400 when plugin name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin name is required',
      });
      expect(mockPluginUseCase.getPlugin).not.toHaveBeenCalled();
    });

    it('should return 404 when plugin is not found', async () => {
      // Arrange
      mockRequest.params = { name: 'nonexistent-plugin' };
      mockPluginUseCase.getPlugin.mockReturnValue(undefined);

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "Plugin 'nonexistent-plugin' not found",
      });
      expect(mockPluginUseCase.validateDependencies).not.toHaveBeenCalled();
    });

    it('should return validation result when dependencies are invalid', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.getPlugin.mockReturnValue(mockPlugin);
      mockPluginUseCase.validateDependencies.mockResolvedValue(false);

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          valid: false,
          plugin: 'star-trek-plugin',
        },
      });
    });

    it('should handle validation errors and return 500 status', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.getPlugin.mockReturnValue(mockPlugin);
      const error = new Error('Validation error');
      mockPluginUseCase.validateDependencies.mockRejectedValue(error);

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockRequest.params = { name: 'star-trek-plugin' };
      mockPluginUseCase.getPlugin.mockReturnValue(mockPlugin);
      mockPluginUseCase.validateDependencies.mockRejectedValue('Unknown error');

      // Act
      await pluginController.validatePlugin(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to validate plugin',
      });
    });
  });

  describe('reloadAllPlugins', () => {
    it('should reload all plugins successfully', async () => {
      // Arrange
      const secondPlugin = {
        ...mockPlugin,
        metadata: { ...mockPluginMetadata, name: 'star-wars-plugin' },
        state: PluginState.LOADED,
      };
      mockPluginUseCase.loadAllPlugins.mockResolvedValue(undefined);
      mockPluginUseCase.getAllPlugins.mockReturnValue([mockPlugin, secondPlugin]);

      // Act
      await pluginController.reloadAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockPluginUseCase.loadAllPlugins).toHaveBeenCalled();
      expect(mockPluginUseCase.getAllPlugins).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All plugins reloaded successfully',
        data: {
          loaded: 2,
          plugins: [
            { name: 'star-trek-plugin', state: PluginState.ACTIVE },
            { name: 'star-wars-plugin', state: PluginState.LOADED },
          ],
        },
      });
    });

    it('should handle reload errors and return 500 status', async () => {
      // Arrange
      const error = new Error('Plugin reload failed');
      mockPluginUseCase.loadAllPlugins.mockRejectedValue(error);

      // Act
      await pluginController.reloadAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin reload failed',
      });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockPluginUseCase.loadAllPlugins.mockRejectedValue('Unknown error');

      // Act
      await pluginController.reloadAllPlugins(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to reload plugins',
      });
    });
  });
});
