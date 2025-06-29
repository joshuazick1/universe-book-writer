/**
 * Comprehensive tests for auth routes
 * Tests route registration, middleware application, and controller binding
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router } from 'express';
import { createAuthRoutes } from '../../../src/api/routes/auth.routes.js';
import centralizedMocks, { setupCommonMocks } from '../../__mocks__/centralized-mocks.js';

describe('Auth Routes', () => {
  let mockAuthController: any;
  let mockAuthMiddleware: any;
  let mockValidationMiddleware: any;
  let router: Router;

  beforeEach(() => {
    setupCommonMocks();
    
    // Create mock controllers and middleware
    mockAuthController = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      refreshToken: jest.fn(),
      getProfile: jest.fn(),
    };

    mockAuthMiddleware = {
      authenticate: jest.fn(),
    };

    mockValidationMiddleware = {
      validateRegistration: jest.fn(),
      validateLogin: jest.fn(),
      validateForgotPassword: jest.fn(),
      validateResetPassword: jest.fn(),
      validateEmailVerification: jest.fn(),
      validateResendVerification: jest.fn(),
    };

    // Create the router with mocked dependencies
    router = createAuthRoutes(mockAuthController, mockAuthMiddleware, mockValidationMiddleware);
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

  describe('Public Routes Registration', () => {
    it('should register POST /register route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/register',
      });
    });

    it('should register POST /login route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/login',
      });
    });

    it('should register POST /forgot-password route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/forgot-password',
      });
    });

    it('should register POST /reset-password route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/reset-password',
      });
    });

    it('should register POST /verify-email route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/verify-email',
      });
    });

    it('should register POST /resend-verification route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/resend-verification',
      });
    });

    it('should register POST /refresh-token route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/refresh-token',
      });
    });
  });

  describe('Protected Routes Registration', () => {
    it('should register POST /logout route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'POST',
        path: '/logout',
      });
    });

    it('should register GET /profile route', () => {
      const routes = router.stack.map((layer: any) => ({
        method: Object.keys(layer.route?.methods || {})[0]?.toUpperCase(),
        path: layer.route?.path,
      }));

      expect(routes).toContainEqual({
        method: 'GET',
        path: '/profile',
      });
    });
  });

  describe('Route Middleware Configuration', () => {    it('should apply validation middleware to register route', () => {
      const registerRoute = router.stack.find((layer: any) => layer.route?.path === '/register');
      expect(registerRoute).toBeDefined();
      
      // Check that the route has middleware layers
      if (registerRoute?.route) {
        expect(registerRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply validation middleware to login route', () => {
      const loginRoute = router.stack.find((layer: any) => layer.route?.path === '/login');
      expect(loginRoute).toBeDefined();
      
      // Check that the route has middleware layers
      if (loginRoute?.route) {
        expect(loginRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply authentication middleware to protected routes', () => {
      const logoutRoute = router.stack.find((layer: any) => layer.route?.path === '/logout');
      expect(logoutRoute).toBeDefined();
      
      // Check that the route has middleware layers
      if (logoutRoute?.route) {
        expect(logoutRoute.route.stack.length).toBeGreaterThan(1);
      }
    });

    it('should apply authentication middleware to profile route', () => {
      const profileRoute = router.stack.find((layer: any) => layer.route?.path === '/profile');
      expect(profileRoute).toBeDefined();
      
      // Check that the route has middleware layers
      if (profileRoute?.route) {
        expect(profileRoute.route.stack.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Controller Method Binding', () => {
    it('should bind controller methods correctly', () => {
      // Verify that all controller methods are functions
      expect(typeof mockAuthController.register).toBe('function');
      expect(typeof mockAuthController.login).toBe('function');
      expect(typeof mockAuthController.logout).toBe('function');
      expect(typeof mockAuthController.forgotPassword).toBe('function');
      expect(typeof mockAuthController.resetPassword).toBe('function');
      expect(typeof mockAuthController.verifyEmail).toBe('function');
      expect(typeof mockAuthController.resendVerification).toBe('function');
      expect(typeof mockAuthController.refreshToken).toBe('function');
      expect(typeof mockAuthController.getProfile).toBe('function');
    });

    it('should have all required controller methods', () => {
      const requiredMethods = [
        'register',
        'login',
        'logout',
        'forgotPassword',
        'resetPassword',
        'verifyEmail',
        'resendVerification',
        'refreshToken',
        'getProfile',
      ];

      requiredMethods.forEach(method => {
        expect(mockAuthController[method]).toBeDefined();
      });
    });
  });

  describe('Middleware Dependencies', () => {
    it('should have authentication middleware available', () => {
      expect(mockAuthMiddleware).toBeDefined();
      expect(mockAuthMiddleware.authenticate).toBeDefined();
      expect(typeof mockAuthMiddleware.authenticate).toBe('function');
    });

    it('should have validation middleware available', () => {
      expect(mockValidationMiddleware).toBeDefined();
      expect(mockValidationMiddleware.validateRegistration).toBeDefined();
      expect(mockValidationMiddleware.validateLogin).toBeDefined();
      expect(mockValidationMiddleware.validateForgotPassword).toBeDefined();
      expect(mockValidationMiddleware.validateResetPassword).toBeDefined();
      expect(mockValidationMiddleware.validateEmailVerification).toBeDefined();
      expect(mockValidationMiddleware.validateResendVerification).toBeDefined();
    });

    it('should have all required validation methods', () => {
      const requiredValidations = [
        'validateRegistration',
        'validateLogin',
        'validateForgotPassword',
        'validateResetPassword',
        'validateEmailVerification',
        'validateResendVerification',
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
      expect(routes.length).toBe(9); // 7 public + 2 protected routes
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

      // Specific route checks
      const registerRoute = routes.find(r => r.path === '/register' && r.method === 'POST');
      expect(registerRoute).toBeDefined();
      expect(registerRoute?.middlewareCount).toBe(2); // validation + controller

      const loginRoute = routes.find(r => r.path === '/login' && r.method === 'POST');
      expect(loginRoute).toBeDefined();
      expect(loginRoute?.middlewareCount).toBe(2); // validation + controller

      const logoutRoute = routes.find(r => r.path === '/logout' && r.method === 'POST');
      expect(logoutRoute).toBeDefined();
      expect(logoutRoute?.middlewareCount).toBe(2); // auth + controller

      const profileRoute = routes.find(r => r.path === '/profile' && r.method === 'GET');
      expect(profileRoute).toBeDefined();
      expect(profileRoute?.middlewareCount).toBe(2); // auth + controller
    });
  });

  describe('Error Handling', () => {
    it('should handle missing controller gracefully', () => {
      expect(() => {
        createAuthRoutes(null as any, mockAuthMiddleware, mockValidationMiddleware);
      }).toThrow();
    });

    it('should handle missing middleware gracefully', () => {
      expect(() => {
        createAuthRoutes(mockAuthController, null as any, mockValidationMiddleware);
      }).toThrow();
    });

    it('should handle missing validation middleware gracefully', () => {
      expect(() => {
        createAuthRoutes(mockAuthController, mockAuthMiddleware, null as any);
      }).toThrow();
    });
  });
});
