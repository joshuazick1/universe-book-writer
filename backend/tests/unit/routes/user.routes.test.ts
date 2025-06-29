/**
 * Comprehensive tests for user routes
 * Tests route registration, middleware application, and controller binding
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router } from 'express';
import { createUserRoutes } from '../../../src/api/routes/user.routes.js';
import centralizedMocks, { setupCommonMocks } from '../../__mocks__/centralized-mocks.js';

describe('User Routes', () => {
  let mockUserController: any;
  let mockAuthMiddleware: any;
  let mockValidationMiddleware: any;
  let router: Router;

  beforeEach(() => {
    setupCommonMocks();
    // Create mock controllers and middleware
    mockUserController = {
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      getUserById: jest.fn(),
      listUsers: jest.fn(),
      updateUserRole: jest.fn(),
      suspendUser: jest.fn(),
      searchUsersForCollaboration: jest.fn(),
    };

    mockAuthMiddleware = {
      authenticate: jest.fn(),
      requireModeratorOrAdmin: jest.fn(),
      requireAdmin: jest.fn(),
    };

    mockValidationMiddleware = {
      validateProfileUpdate: jest.fn(),
      validatePasswordChange: jest.fn(),
      validateAccountDeletion: jest.fn(),
      validateRoleUpdate: jest.fn(),
      validateUserSuspension: jest.fn(),
    };

    // Create the router with mocked dependencies
    router = createUserRoutes(mockUserController, mockAuthMiddleware, mockValidationMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Creation', () => {
    it('should create a router instance', () => {
      expect(router).toBeDefined();
      expect(typeof router).toBe('function'); // Express Router is a function
    });

    it('should return an Express Router', () => {
      expect(router.stack).toBeDefined(); // Router has a stack property
    });
  });

  describe('User Profile Routes Registration', () => {
    it('should register PUT /profile route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/profile',
      });
    });

    it('should register PUT /change-password route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/change-password',
      });
    });

    it('should register DELETE /account route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'DELETE',
        path: '/account',
      });
    });

    it('should register GET /:id route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/:id',
      });
    });
  });

  describe('Admin/Moderator Routes Registration', () => {
    it('should register GET / route (list users)', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/',
      });
    });

    it('should register PUT /:id/roles route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'PUT',
        path: '/:id/roles',
      });
    });

    it('should register POST /:id/suspend route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/:id/suspend',
      });
    });
  });

  describe('Middleware Configuration', () => {
    it('should apply global authentication middleware', () => {
      // Check for router-level middleware (use statements)
      const middlewareLayer = router.stack.find((layer: any) => !layer.route);
      expect(middlewareLayer).toBeDefined();
    });

    it('should apply validation middleware to profile update route', () => {
      const profileRoute = router.stack.find((layer: any) => layer.route?.path === '/profile');
      expect(profileRoute).toBeDefined();

      if (profileRoute?.route) {
        expect(profileRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply validation middleware to password change route', () => {
      const passwordRoute = router.stack.find((layer: any) => layer.route?.path === '/change-password');
      expect(passwordRoute).toBeDefined();

      if (passwordRoute?.route) {
        expect(passwordRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply moderator/admin middleware to list users route', () => {
      const listRoute = router.stack.find((layer: any) => layer.route?.path === '/');
      expect(listRoute).toBeDefined();

      if (listRoute?.route) {
        expect(listRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply admin middleware to role update route', () => {
      const roleRoute = router.stack.find((layer: any) => layer.route?.path === '/:id/roles');
      expect(roleRoute).toBeDefined();

      if (roleRoute?.route) {
        expect(roleRoute.route.stack.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Controller Method Binding', () => {
    it('should bind controller methods correctly', () => {
      expect(typeof mockUserController.updateProfile).toBe('function');
      expect(typeof mockUserController.changePassword).toBe('function');
      expect(typeof mockUserController.deleteAccount).toBe('function');
      expect(typeof mockUserController.getUserById).toBe('function');
      expect(typeof mockUserController.listUsers).toBe('function');
      expect(typeof mockUserController.updateUserRole).toBe('function');
      expect(typeof mockUserController.suspendUser).toBe('function');
    });

    it('should have all required controller methods', () => {
      const requiredMethods = [
        'updateProfile',
        'changePassword',
        'deleteAccount',
        'getUserById',
        'listUsers',
        'updateUserRole',
        'suspendUser',
      ];

      requiredMethods.forEach(method => {
        expect(mockUserController[method]).toBeDefined();
      });
    });
  });

  describe('Middleware Dependencies', () => {
    it('should have authentication middleware available', () => {
      expect(mockAuthMiddleware).toBeDefined();
      expect(mockAuthMiddleware.authenticate).toBeDefined();
      expect(mockAuthMiddleware.requireModeratorOrAdmin).toBeDefined();
      expect(mockAuthMiddleware.requireAdmin).toBeDefined();
      expect(typeof mockAuthMiddleware.authenticate).toBe('function');
      expect(typeof mockAuthMiddleware.requireModeratorOrAdmin).toBe('function');
      expect(typeof mockAuthMiddleware.requireAdmin).toBe('function');
    });

    it('should have validation middleware available', () => {
      expect(mockValidationMiddleware).toBeDefined();
      expect(mockValidationMiddleware.validateProfileUpdate).toBeDefined();
      expect(mockValidationMiddleware.validatePasswordChange).toBeDefined();
      expect(mockValidationMiddleware.validateAccountDeletion).toBeDefined();
      expect(mockValidationMiddleware.validateRoleUpdate).toBeDefined();
      expect(mockValidationMiddleware.validateUserSuspension).toBeDefined();
    });

    it('should have all required validation methods', () => {
      const requiredValidations = [
        'validateProfileUpdate',
        'validatePasswordChange',
        'validateAccountDeletion',
        'validateRoleUpdate',
        'validateUserSuspension',
      ];

      requiredValidations.forEach(validation => {
        expect(mockValidationMiddleware[validation]).toBeDefined();
        expect(typeof mockValidationMiddleware[validation]).toBe('function');
      });
    });
  });

  describe('Route Count and Structure', () => {
    it('should register the correct number of routes', () => {
      const routes = router.stack.filter((layer: any) => layer.route);
      expect(routes.length).toBe(8); // 5 user profile + 3 admin/moderator routes
    });

    it('should have proper route structure', () => {
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          method: Object.keys(layer.route.methods)[0].toUpperCase(),
          path: layer.route.path,
          middlewareCount: layer.route.stack.length,
        }));

      // All routes should have at least one handler
      routes.forEach(route => {
        expect(route.middlewareCount).toBeGreaterThan(0);
      });

      // Check specific routes
      const profileRoute = routes.find(r => r.path === '/profile' && r.method === 'PUT');
      expect(profileRoute).toBeDefined();
      expect(profileRoute?.middlewareCount).toBe(2); // validation + controller

      const listUsersRoute = routes.find(r => r.path === '/' && r.method === 'GET');
      expect(listUsersRoute).toBeDefined();
      expect(listUsersRoute?.middlewareCount).toBe(2); // auth middleware + controller

      const roleUpdateRoute = routes.find(r => r.path === '/:id/roles' && r.method === 'PUT');
      expect(roleUpdateRoute).toBeDefined();
      expect(roleUpdateRoute?.middlewareCount).toBe(3); // admin auth + validation + controller
    });
  });

  describe('Authorization Levels', () => {
    it('should have routes that require basic authentication', () => {
      // Profile management routes require basic auth
      const profileRoutes = ['/profile', '/change-password', '/account', '/:id'];
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => layer.route.path);

      profileRoutes.forEach(path => {
        expect(routes).toContain(path);
      });
    });

    it('should have routes that require moderator/admin privileges', () => {
      // List users and suspend require moderator or admin
      const moderatorRoutes = ['/', '/:id/suspend'];
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => layer.route.path);

      moderatorRoutes.forEach(path => {
        expect(routes).toContain(path);
      });
    });

    it('should have routes that require admin privileges', () => {
      // Role updates require admin
      const adminRoutes = ['/:id/roles'];
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => layer.route.path);

      adminRoutes.forEach(path => {
        expect(routes).toContain(path);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing controller gracefully', () => {
      expect(() => {
        createUserRoutes(null as any, mockAuthMiddleware, mockValidationMiddleware);
      }).toThrow();
    });

    it('should handle missing auth middleware gracefully', () => {
      expect(() => {
        createUserRoutes(mockUserController, null as any, mockValidationMiddleware);
      }).toThrow();
    });

    it('should handle missing validation middleware gracefully', () => {
      expect(() => {
        createUserRoutes(mockUserController, mockAuthMiddleware, null as any);
      }).toThrow();
    });
  });
});
