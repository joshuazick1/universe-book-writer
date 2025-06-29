/**
 * @fileoverview Test suite for admin routes
 * @module tests/unit/routes/admin.routes.test
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router } from 'express';
import { createAdminRoutes } from '../../../src/api/routes/admin.routes.js';
import centralizedMocks, { setupCommonMocks } from '../../__mocks__/centralized-mocks.js';

describe('Admin Routes', () => {
  let mockAdminController: any;
  let mockAuthMiddleware: any;
  let router: Router;

  beforeEach(() => {
    setupCommonMocks();
    // Create mock admin controller with bound methods
    mockAdminController = {
      getAllUsers: jest.fn(),
      updateUserRole: jest.fn(),
      updateUserStatus: jest.fn(),
      verifyUserEmail: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      getAdminSettings: jest.fn(),
      updateAdminSettings: jest.fn(),
      getSecurityLogs: jest.fn(),
    };

    // Create mock auth middleware
    mockAuthMiddleware = {
      authenticate: jest.fn(),
      requireAdmin: jest.fn(),
    };

    // Create router using the function
    router = createAdminRoutes(mockAdminController, mockAuthMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Creation', () => {
    it('should create a router instance', () => {
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
      expect(router.stack).toBeDefined();
    }); it('should have proper middleware stack', () => {
      // Check that middleware functions are applied to the router
      expect(router.stack).toHaveLength(11); // 2 middleware + 9 routes
    });
  });

  describe('Middleware Configuration', () => {
    it('should apply authentication middleware', () => {
      const middlewareStack = router.stack;

      // Find middleware layers (they don't have a route property)
      const middlewareLayers = middlewareStack.filter(layer => !layer.route);

      expect(middlewareLayers).toHaveLength(2);
      expect(middlewareLayers[0].handle).toBe(mockAuthMiddleware.authenticate);
      expect(middlewareLayers[1].handle).toBe(mockAuthMiddleware.requireAdmin);
    });
  });
  describe('Route Registration', () => {
    it('should register GET /users route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/users',
      });
    });

    it('should register PUT /users/:id/role route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/users/:id/role',
      });
    });

    it('should register PUT /users/:id/status route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/users/:id/status',
      });
    });

    it('should register POST /users/:id/verify-email route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/users/:id/verify-email',
      });
    });

    it('should register POST /users route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/users',
      });
    });

    it('should register GET /settings route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/settings',
      });
    });

    it('should register PUT /settings route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/settings',
      });
    });

    it('should register GET /security/logs route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/security/logs',
      });
    });
  });
  describe('Controller Method Binding', () => {
    it('should bind getAllUsers method to GET /users', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/users' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind updateUserRole method to PUT /users/:id/role', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/users/:id/role' &&
        Object.keys(layer.route.methods || {}).includes('put')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind updateUserStatus method to PUT /users/:id/status', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/users/:id/status' &&
        Object.keys(layer.route.methods || {}).includes('put')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind verifyUserEmail method to POST /users/:id/verify-email', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/users/:id/verify-email' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind createUser method to POST /users', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/users' &&
        Object.keys(layer.route.methods || {}).includes('post')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind getAdminSettings method to GET /settings', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/settings' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind updateAdminSettings method to PUT /settings', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/settings' &&
        Object.keys(layer.route.methods || {}).includes('put')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });

    it('should bind getSecurityLogs method to GET /security/logs', () => {
      const route = router.stack.find((layer: any) =>
        layer.route &&
        layer.route.path === '/security/logs' &&
        Object.keys(layer.route.methods || {}).includes('get')
      );

      expect(route).toBeDefined();
      expect(route?.route?.stack[0].handle).toBeDefined();
    });
  });

  describe('Route Configuration', () => {
    it('should have correct number of routes', () => {
      const routes = router.stack.filter((layer: any) => layer.route);
      expect(routes).toHaveLength(9);
    });

    it('should have all routes with proper HTTP methods', () => {
      const routes = router.stack.filter((layer: any) => layer.route);
      const routeDetails = routes.map((layer: any) => ({
        path: layer.route?.path,
        methods: Object.keys(layer.route?.methods || {})
      }));

      expect(routeDetails).toEqual(expect.arrayContaining([
        { path: '/users', methods: ['get'] },
        { path: '/users/:id/role', methods: ['put'] },
        { path: '/users/:id/status', methods: ['put'] },
        { path: '/users/:id/verify-email', methods: ['post'] },
        { path: '/users', methods: ['post'] },
        { path: '/settings', methods: ['get'] },
        { path: '/settings', methods: ['put'] },
        { path: '/security/logs', methods: ['get'] }
      ]));
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid AdminController instance', () => {
      expect(() => createAdminRoutes(mockAdminController, mockAuthMiddleware)).not.toThrow();
    });

    it('should accept valid AuthMiddleware instance', () => {
      expect(() => createAdminRoutes(mockAdminController, mockAuthMiddleware)).not.toThrow();
    });

    it('should return Router instance', () => {
      const result = createAdminRoutes(mockAdminController, mockAuthMiddleware);
      expect(result).toBeInstanceOf(Function);
      expect(result.stack).toBeDefined();
    });
  });
});
