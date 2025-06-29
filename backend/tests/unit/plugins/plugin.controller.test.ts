/**
 * Tests for the PluginController
 */

import { Request, Response } from 'express';
import { PluginController } from '../../../src/api/controllers/plugin.controller.js';
import { PluginUseCase } from '../../../src/application/use-cases/plugin.use-case.js';
import { Plugin, PluginState, PluginType } from '@universe-book-writer/core';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create a mock Plugin that satisfies the interface
const createMockPlugin = (overrides = {}) => {
  return {
    metadata: {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      type: PluginType.UNIVERSE,
      dependencies: {},
    },
    state: PluginState.ACTIVE,
    config: { 
      enabled: true, 
      settings: { key: 'value' } 
    },
    initialize: jest.fn().mockImplementation(() => Promise.resolve()),
    activate: jest.fn().mockImplementation(() => Promise.resolve()),
    deactivate: jest.fn().mockImplementation(() => Promise.resolve()),
    destroy: jest.fn().mockImplementation(() => Promise.resolve()),
    validateConfig: jest.fn().mockImplementation(() => Promise.resolve(true)),
    updateConfig: jest.fn().mockImplementation(() => Promise.resolve()),
    canActivate: jest.fn().mockReturnValue(true),
    canDeactivate: jest.fn().mockReturnValue(true),
    ...overrides
  } as unknown as Plugin;
};

describe('PluginController', () => {
  // Updated mock dependencies based on actual implementation
  const mockPluginUseCase = {
    getAllPlugins: jest.fn(),
    getPlugin: jest.fn(),
    getPluginsByType: jest.fn(),
    getAllAvailablePlugins: jest.fn(),
    loadPlugin: jest.fn(),
    activatePlugin: jest.fn(),
    deactivatePlugin: jest.fn(),
    updatePluginConfig: jest.fn(),
    getPluginStatus: jest.fn(),
    loadAllPlugins: jest.fn(),
    validateDependencies: jest.fn(),
    unregister: jest.fn(),
    getDependencyGraph: jest.fn()
  } as unknown as jest.Mocked<PluginUseCase>;
  
  // Mock request and response
  const mockRequest = {} as Request;
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
    let pluginController: PluginController;
    // Test plugin
  const mockPlugin = createMockPlugin();
  
  beforeEach(() => {
    jest.clearAllMocks();
    pluginController = new PluginController(mockPluginUseCase);
  });  describe('getAllPlugins', () => {
    it('should return all plugins', async () => {
      mockPluginUseCase.getAllPlugins.mockReturnValue([mockPlugin]);
      
      const mockRequestWithQuery = {
        query: {}
      } as unknown as Request;
      
      await pluginController.getAllPlugins(mockRequestWithQuery, mockResponse);
      
      expect(mockPluginUseCase.getAllPlugins).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.any(Array),
      }));
    });
    
    it('should filter by state if query param provided', async () => {
      // Add active and inactive plugins
      const inactivePlugin = createMockPlugin({
        metadata: { 
          name: 'inactive-plugin',
          version: '1.0.0',
          description: 'An inactive plugin',
          author: 'Test Author',
          type: PluginType.UNIVERSE,
          dependencies: {} 
        },
        state: PluginState.INITIALIZED,
      });
      
      mockPluginUseCase.getAllPlugins.mockReturnValue([mockPlugin, inactivePlugin]);
      
      const requestWithQuery = {
        query: { state: 'ACTIVE' },
      } as unknown as Request;
      
      await pluginController.getAllPlugins(requestWithQuery, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'test-plugin' }),
        ]),
      }));
    });
  });  describe('getPlugin', () => {
    it('should return plugin by name', async () => {
      // Setup the mock plugin status return value since the controller uses getPluginStatus, not getPlugin directly
      const mockStatus = {
        name: 'test-plugin',
        state: PluginState.ACTIVE,
        config: { 
          enabled: true, 
          settings: { key: 'value' } 
        },
        dependencies: [],
        dependents: [],
      };
      
      mockPluginUseCase.getPluginStatus.mockResolvedValue(mockStatus);
      
      const requestWithParams = {
        params: { name: 'test-plugin' },
      } as unknown as Request;
      
      await pluginController.getPlugin(requestWithParams, mockResponse);
      
      expect(mockPluginUseCase.getPluginStatus).toHaveBeenCalledWith('test-plugin');
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          name: 'test-plugin'
        })
      }));
    });
  });  describe('getAvailablePlugins', () => {
    it('should return all available plugins', async () => {
      const mockRegistryEntry = {
        id: 'plugin-id',
        pluginMetadata: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'A test plugin',
          author: 'Test Author',
          type: PluginType.UNIVERSE,
          dependencies: {},
        },
        config: { 
          enabled: true, 
          settings: { key: 'value' } 
        },
        state: PluginState.ACTIVE,
        loadPath: '/path/to/plugin',
        dependents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          createdBy: 'system',
          tags: ['test'],
        },
      };
      
      mockPluginUseCase.getAllAvailablePlugins.mockResolvedValue([mockRegistryEntry]);
      
      const mockRequestWithQuery = {
        query: { includeInactive: 'true' }
      } as unknown as Request;
      
      await pluginController.getAllPlugins(mockRequestWithQuery, mockResponse);
      
      expect(mockPluginUseCase.getAllAvailablePlugins).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'test-plugin'
          })
        ])
      }));
    });
  });
  describe('getSystemInfo', () => {
    it('should return plugin system info', async () => {
      // Return different plugin counts by type
      mockPluginUseCase.getAllPlugins.mockImplementation(() => {
        const corePlugin = createMockPlugin({
          metadata: { 
            name: 'core-plugin',
            version: '1.0.0',
            description: 'A core plugin',
            author: 'Test Author',
            type: PluginType.CORE,
            dependencies: {} 
          }
        });
        
        const universePlugin = createMockPlugin({
          metadata: { 
            name: 'universe-plugin',
            version: '1.0.0',
            description: 'A universe plugin',
            author: 'Test Author',
            type: PluginType.UNIVERSE,
            dependencies: {} 
          }
        });
        
        const aiPlugin = createMockPlugin({
          metadata: { 
            name: 'ai-plugin',
            version: '1.0.0',
            description: 'An AI plugin',
            author: 'Test Author',
            type: PluginType.AI,
            dependencies: {} 
          }
        });
        
        return [corePlugin, universePlugin, aiPlugin];
      });
      
      await pluginController.getSystemInfo(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        totalPlugins: 3,
        activePlugins: 3,
        pluginsByType: {
          core: 1,
          universe: 1,
          theme: 0,
          ai: 1,
          gaming: 0,
        },
      });
    });
    
    it('should count active and inactive plugins correctly', async () => {
      // Return plugins with different states
      mockPluginUseCase.getAllPlugins.mockImplementation(() => {
        const activePlugin = createMockPlugin({
          state: PluginState.ACTIVE
        });
        
        const initializedPlugin = createMockPlugin({
          metadata: { 
            name: 'initialized-plugin',
            version: '1.0.0',
            description: 'An initialized plugin',
            author: 'Test Author',
            type: PluginType.UNIVERSE,
            dependencies: {} 
          },
          state: PluginState.INITIALIZED
        });
        
        const errorPlugin = createMockPlugin({
          metadata: { 
            name: 'error-plugin',
            version: '1.0.0',
            description: 'An error plugin',
            author: 'Test Author',
            type: PluginType.UNIVERSE,
            dependencies: {} 
          },
          state: PluginState.ERROR
        });
        
        return [activePlugin, initializedPlugin, errorPlugin];
      });
      
      await pluginController.getSystemInfo(mockRequest, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPlugins: 3,
          activePlugins: 1, // Only one is active
        })
      );
    });
  });
    describe('getPluginStatus', () => {
    it('should return plugin status', async () => {
      const pluginStatus = {
        name: 'test-plugin',
        state: PluginState.ACTIVE,
        config: { 
          enabled: true, 
          settings: { key: 'value' } 
        },
        dependencies: [],
        dependents: [],
      };
      
      mockPluginUseCase.getPluginStatus.mockResolvedValue(pluginStatus);
      
      const requestWithParams = {
        params: { name: 'test-plugin' },
      } as unknown as Request;
      
      await pluginController.getPluginStatus(requestWithParams, mockResponse);
      
      expect(mockPluginUseCase.getPluginStatus).toHaveBeenCalledWith('test-plugin');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: pluginStatus,
      });
    });
    
    it('should return 400 if plugin name is missing', async () => {
      const requestWithoutParams = {
        params: {},
      } as unknown as Request;
      
      await pluginController.getPluginStatus(requestWithoutParams, mockResponse);
      
      expect(mockPluginUseCase.getPluginStatus).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Plugin name is required',
      });
    });
    
    it('should return 404 if plugin not found', async () => {
      mockPluginUseCase.getPluginStatus.mockResolvedValue(null);
      
      const requestWithParams = {
        params: { name: 'non-existent' },
      } as unknown as Request;
      
      await pluginController.getPluginStatus(requestWithParams, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Plugin not found',
      });
    });
    
    it('should handle errors', async () => {
      const error = new Error('Database error');
      mockPluginUseCase.getPluginStatus.mockRejectedValue(error);
      
      const requestWithParams = {
        params: { name: 'test-plugin' },
      } as unknown as Request;
      
      await pluginController.getPluginStatus(requestWithParams, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get plugin status',
        message: 'Database error',
      });
    });
  });  describe('loadPlugin', () => {
    it('should load a plugin', async () => {
      mockPluginUseCase.loadPlugin.mockResolvedValue(mockPlugin);
      
      const requestWithBody = {
        body: { path: '/path/to/plugin' },
      } as unknown as Request;
      
      await pluginController.loadPlugin(requestWithBody, mockResponse);
      
      expect(mockPluginUseCase.loadPlugin).toHaveBeenCalledWith('/path/to/plugin');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          name: 'test-plugin',
          state: PluginState.ACTIVE,
          message: 'Plugin loaded successfully'
        })
      }));
    });
    
    it('should return 400 if path is missing', async () => {
      const requestWithoutBody = {
        body: {},
      } as unknown as Request;
      
      await pluginController.loadPlugin(requestWithoutBody, mockResponse);
      
      expect(mockPluginUseCase.loadPlugin).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plugin path is required',
      });
    });
    
    it('should handle errors', async () => {
      const error = new Error('Invalid plugin');
      mockPluginUseCase.loadPlugin.mockRejectedValue(error);
      
      const requestWithBody = {
        body: { path: '/path/to/plugin' },
      } as unknown as Request;
      
      await pluginController.loadPlugin(requestWithBody, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid plugin',
      });
    });
  });
});
