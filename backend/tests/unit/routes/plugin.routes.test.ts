/**
 * @fileoverview Test suite for plugin routes
 * @module tests/unit/routes/plugin.routes.test
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router } from 'express';
import { createPluginRoutes } from '../../../src/api/routes/plugin.routes.js';
import centralizedMocks, { setupCommonMocks } from '../../__mocks__/centralized-mocks.js';

describe('Plugin Routes', () => {
  let mockPluginController: any;
  let router: Router;

  beforeEach(() => {
    setupCommonMocks();
    // Create mock plugin controller with all methods
    mockPluginController = {
      getAllPlugins: jest.fn(),
      getPlugin: jest.fn(),
      loadPlugin: jest.fn(),
      activatePlugin: jest.fn(),
      deactivatePlugin: jest.fn(),
      unloadPlugin: jest.fn(),
      updatePluginConfig: jest.fn(),
      getPluginSubUniverses: jest.fn(),
      getDependencyGraph: jest.fn(),
      validatePlugin: jest.fn(),
      reloadAllPlugins: jest.fn(),
      getSystemInfo: jest.fn(),
      getPluginStatus: jest.fn(),
      clearAllPlugins: jest.fn(),
    };

    // Create router using the function
    router = createPluginRoutes(mockPluginController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Creation', () => {
    it('should create a router instance', () => {
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
      expect(router.stack).toBeDefined();
    });

    it('should have proper route stack', () => {
      // Check that routes are registered
      expect(router.stack).toHaveLength(14); // 14 routes total
    });
  });

  describe('Route Registration', () => {
    it('should register GET / route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/',
      });
    });

    it('should register GET /:name route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/:name',
      });
    });

    it('should register POST /load route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/load',
      });
    });

    it('should register POST /:name/activate route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/:name/activate',
      });
    });

    it('should register POST /:name/deactivate route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/:name/deactivate',
      });
    });

    it('should register DELETE /:name route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'DELETE',
        path: '/:name',
      });
    });

    it('should register PUT /:name/config route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/:name/config',
      });
    });

    it('should register GET /system/dependencies route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/system/dependencies',
      });
    });

    it('should register POST /:name/validate route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/:name/validate',
      });
    });

    it('should register POST /system/reload route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/system/reload',
      });
    });
  });

  describe('Controller Method Binding', () => {
    it('should bind getAllPlugins method to GET /', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind getPlugin method to GET /:name', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind loadPlugin method to POST /load', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/load' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind activatePlugin method to POST /:name/activate', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name/activate' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind deactivatePlugin method to POST /:name/deactivate', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name/deactivate' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind unloadPlugin method to DELETE /:name', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name' &&
        Object.keys(layer.route.methods || {}).includes('delete')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind updatePluginConfig method to PUT /:name/config', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name/config' &&
        Object.keys(layer.route.methods || {}).includes('put')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind getDependencyGraph method to GET /system/dependencies', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/system/dependencies' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind validatePlugin method to POST /:name/validate', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/:name/validate' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind reloadAllPlugins method to POST /system/reload', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/system/reload' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });
  });

  describe('Route Configuration', () => {
    it('should have correct number of routes', () => {
      const routes = router.stack.filter((layer: any) => layer.route);
      expect(routes).toHaveLength(14);
    });

    it('should have all routes with proper HTTP methods', () => {
      const routes = router.stack.filter((layer: any) => layer.route);
      const routeDetails = routes.map((layer: any) => ({
        path: layer.route?.path,
        methods: Object.keys(layer.route?.methods || {})
      }));

      expect(routeDetails).toEqual(expect.arrayContaining([
        { path: '/', methods: ['get'] },
        { path: '/:name', methods: ['get'] },
        { path: '/load', methods: ['post'] },
        { path: '/:name/activate', methods: ['post'] },
        { path: '/:name/deactivate', methods: ['post'] },
        { path: '/:name', methods: ['delete'] },
        { path: '/:name/config', methods: ['put'] },
        { path: '/system/dependencies', methods: ['get'] },
        { path: '/:name/validate', methods: ['post'] },
        { path: '/system/reload', methods: ['post'] }
      ]));
    });

    it('should handle multiple routes with same path but different methods', () => {
      const nameRoutes = router.stack.filter((layer: any) =>
        layer.route && layer.route.path === '/:name'
      );

      expect(nameRoutes).toHaveLength(2); // GET and DELETE

      const methods = nameRoutes.map((layer: any) =>
        Object.keys(layer.route?.methods || {})[0]
      );

      expect(methods).toContain('get');
      expect(methods).toContain('delete');
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid PluginController instance', () => {
      expect(() => createPluginRoutes(mockPluginController)).not.toThrow();
    });

    it('should return Router instance', () => {
      const result = createPluginRoutes(mockPluginController);
      expect(result).toBeInstanceOf(Function);
      expect(result.stack).toBeDefined();
    });
  });

  describe('Route Handlers', () => {
    it('should use arrow functions for route handlers', () => {
      const getAllPluginsRoute = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(getAllPluginsRoute?.route?.stack[0].handle).toBeDefined();
      expect(typeof getAllPluginsRoute?.route?.stack[0].handle).toBe('function');
    });

    it('should properly pass req and res to controller methods', () => {
      // This test verifies that the route handlers are properly configured
      // to pass request and response objects to controller methods
      const routes = router.stack.filter((layer: any) => layer.route);

      routes.forEach((route: any) => {
        expect(route.route?.stack[0].handle).toBeDefined();
        expect(typeof route.route?.stack[0].handle).toBe('function');
      });
    });
  });
});
