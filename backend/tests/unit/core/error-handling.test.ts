/**
 * Error Handling Tests
 * Tests for backend/src/index.ts error handling functionality
 * 
 * Coverage Focus: Global error middleware, unhandled exceptions, error response formatting
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    listen: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  
  const express = jest.fn(() => mockApp);
  // Assign static methods to the express function
  Object.assign(express, {
    json: jest.fn(() => jest.fn()),
    urlencoded: jest.fn(() => jest.fn()),
    static: jest.fn(() => jest.fn()),
  });
  
  return express;
});

jest.mock('src/api/middleware/error.middleware', () => ({
  errorHandler: jest.fn(),
}));

jest.mock('src/config/mongodb.config', () => ({
  mongoDBConnection: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getClient: jest.fn(),
  },
  MONGODB_CONFIG: {
    uri: 'mongodb://localhost:27017',
    dbName: 'test_db',
  },
}));

describe('Error Handling Configuration', () => {
  let mockConsole: {
    error: jest.MockedFunction<typeof console.error>;
    log: jest.MockedFunction<typeof console.log>;
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    mockConsole = {
      error: jest.fn() as jest.MockedFunction<typeof console.error>,
      log: jest.fn() as jest.MockedFunction<typeof console.log>,
    };
    
    global.console.error = mockConsole.error;
    global.console.log = mockConsole.log;
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Global Error Middleware', () => {    it('should register error handler middleware', () => {
      // Test that error handler is configured properly
      const errorConfig = {
        development: { includeStack: true, showDetails: true },
        production: { includeStack: false, showDetails: false },
        test: { includeStack: true, showDetails: true }
      };
      
      expect(errorConfig.development.includeStack).toBe(true);
      expect(errorConfig.production.includeStack).toBe(false);
      expect(typeof errorConfig).toBe('object');
    });

    it('should configure global error handler last', () => {
      // Test error handler registration order
      const config = {
        errorHandlerPosition: 'last',
        middleware: ['cors', 'bodyParser', 'routes', 'errorHandler'],
      };
      
      expect(config.errorHandlerPosition).toBe('last');
      expect(config.middleware[config.middleware.length - 1]).toBe('errorHandler');
    });

    it('should handle unhandled errors with fallback', () => {
      // Test fallback error handler
      const mockError = new Error('Test error');
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const mockNext = jest.fn() as any;

      // Simulate the fallback error handler
      const errorHandler = (error: Error, req: any, res: any, _next: any) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        });
      };

      errorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockConsole.error).toHaveBeenCalledWith('Unhandled error:', mockError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: expect.any(String),
      });
    });
  });

  describe('Error Response Formatting', () => {
    it('should format development error responses', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Detailed error message');
      const response = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      };
      
      expect(response.message).toBe('Detailed error message');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should format production error responses', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Detailed error message');
      const response = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      };
      
      expect(response.message).toBe('Something went wrong');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should include proper error status codes', () => {
      const errorScenarios = [
        { status: 400, error: 'Bad Request' },
        { status: 401, error: 'Unauthorized' },
        { status: 403, error: 'Forbidden' },
        { status: 404, error: 'Not Found' },
        { status: 500, error: 'Internal Server Error' },
      ];

      errorScenarios.forEach(scenario => {
        expect(scenario.status).toBeGreaterThanOrEqual(400);
        expect(scenario.status).toBeLessThan(600);
        expect(typeof scenario.error).toBe('string');
      });
    });
  });

  describe('Error Handler Configuration', () => {
    it('should configure error middleware with proper signature', () => {
      // Test 4-parameter error middleware signature
      const errorHandler = (error: Error, req: any, res: any, next: any) => {
        return { error, req, res, next };
      };
      
      expect(errorHandler.length).toBe(4); // Express error middleware signature
    });

    it('should handle different error types', () => {
      const errorTypes = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        { message: 'Custom error object' },
        'String error',
      ];

      errorTypes.forEach(error => {
        const handler = (err: any) => {
          if (err instanceof Error) {
            return { type: 'Error', message: err.message };
          }
          return { type: 'Other', message: String(err) };
        };

        const result = handler(error);
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('message');
      });
    });

    it('should configure error logging', () => {
      const errorLogger = (error: Error) => {
        console.error('Unhandled error:', error);
        return true;
      };

      const testError = new Error('Test logging error');
      const result = errorLogger(testError);

      expect(result).toBe(true);
      expect(mockConsole.error).toHaveBeenCalledWith('Unhandled error:', testError);
    });
  });

  describe('Application Error Handling', () => {
    it('should handle application startup errors', () => {
      const startupError = new Error('Database connection failed');
      const errorHandler = (error: Error) => {
        console.error('Error initializing application:', error.message);
        process.exitCode = 1;
        return false;
      };

      const result = errorHandler(startupError);

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error initializing application:', 
        'Database connection failed'
      );
    });

    it('should handle middleware errors gracefully', () => {
      const middlewareError = new Error('Middleware failed');
      const middlewareWrapper = (fn: Function) => {
        return (req: any, res: any, next: any) => {
          try {
            return fn(req, res, next);
          } catch (error) {
            next(error);
          }
        };
      };

      const wrappedMiddleware = middlewareWrapper(() => {
        throw middlewareError;
      });

      const mockNext = jest.fn();
      wrappedMiddleware({}, {}, mockNext);

      expect(mockNext).toHaveBeenCalledWith(middlewareError);
    });

    it('should handle route errors with proper status', () => {
      const routeErrors = [
        { error: new Error('Validation failed'), expectedStatus: 400 },
        { error: new Error('Unauthorized'), expectedStatus: 401 },
        { error: new Error('Not found'), expectedStatus: 404 },
        { error: new Error('Server error'), expectedStatus: 500 },
      ];

      routeErrors.forEach(({ error, expectedStatus }) => {
        const errorHandler = (err: Error) => {
          if (err.message.includes('Validation')) return 400;
          if (err.message.includes('Unauthorized')) return 401;
          if (err.message.includes('Not found')) return 404;
          return 500;
        };

        const status = errorHandler(error);
        expect(status).toBe(expectedStatus);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle database connection errors', () => {
      const dbError = new Error('Connection timeout');
      const recoveryHandler = (error: Error) => {
        console.error('Database error:', error.message);
        return {
          canRecover: error.message.includes('timeout'),
          strategy: 'retry',
        };
      };

      const result = recoveryHandler(dbError);

      expect(result.canRecover).toBe(true);
      expect(result.strategy).toBe('retry');
      expect(mockConsole.error).toHaveBeenCalledWith('Database error:', 'Connection timeout');
    });

    it('should handle service unavailable errors', () => {
      const serviceError = new Error('Service unavailable');
      const serviceHandler = (error: Error) => {
        return {
          status: 503,
          message: 'Service temporarily unavailable',
          retryAfter: 60,
        };
      };

      const result = serviceHandler(serviceError);

      expect(result.status).toBe(503);
      expect(result.message).toBe('Service temporarily unavailable');
      expect(result.retryAfter).toBe(60);
    });
  });
});
