/**
 * Error Middleware Tests
 * Tests for backend/src/api/middleware/error.middleware.ts
 * 
 * Coverage Focus: Error middleware, error response formatting, custom error classes
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TokenError,
  EmailError,
  createValidationError,
  createSuccessResponse,
  createPaginatedResponse,
} from '../../../../src/api/middleware/error.middleware.js';

describe('Error Middleware', () => {
  // Mock types
  type MockRequest = Partial<Request>;
  type MockResponse = {
    status: jest.Mock;
    json: jest.Mock;
    [key: string]: any;
  };
  type MockNext = jest.Mock;

  let mockRequest: MockRequest;
  let mockResponse: MockResponse;
  let mockNext: MockNext;
  let mockConsole: { error: jest.Mock };
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    mockRequest = {
      path: '/test/path',
      method: 'GET',
      body: { test: 'data' },
      query: { q: 'search' },
      headers: { 'content-type': 'application/json' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock console.error
    mockConsole = {
      error: jest.fn(),
    };
    global.console.error = mockConsole.error as any;

    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    
    jest.clearAllMocks();
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError instances with proper response format', () => {
      // Arrange
      const testError = new AppError('Test application error', 418, true, 'TEST_ERROR', { detail: 'test' });
      
      // Act
      errorHandler(testError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(418);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Test application error',
          code: 'TEST_ERROR',
          statusCode: 418,
          timestamp: expect.any(String),
          path: '/test/path',
          method: 'GET',
        }),
      });
    });    it('should handle ValidationError from MongoDB with proper response format', () => {
      // Arrange
      const mongoValidationError: any = new Error('Validation failed');
      mongoValidationError.name = 'ValidationError';
      
      // Act
      errorHandler(mongoValidationError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation Error',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            path: '/test/path',
            method: 'GET',
          }),
        })
      );
    });

    it('should handle MongoError with proper response format', () => {
      // Arrange
      const mongoError: any = new Error('Duplicate key error');
      mongoError.name = 'MongoError';
      
      // Act
      process.env.NODE_ENV = 'development';
      errorHandler(mongoError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Database Error',
          code: 'DATABASE_ERROR',
          statusCode: 500,
          details: 'Duplicate key error',
        }),
      });
    });

    it('should handle MongoServerError with proper response format', () => {
      // Arrange
      const mongoServerError: any = new Error('Connection error');
      mongoServerError.name = 'MongoServerError';
      
      // Act
      process.env.NODE_ENV = 'development';
      errorHandler(mongoServerError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Database Error',
          code: 'DATABASE_ERROR',
          statusCode: 500,
          details: 'Connection error',
        }),
      });
    });

    it('should handle JsonWebTokenError with proper response format', () => {
      // Arrange
      const jwtError: any = new Error('Invalid signature');
      jwtError.name = 'JsonWebTokenError';
      
      // Act
      errorHandler(jwtError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid token',
          code: 'TOKEN_ERROR',
          statusCode: 401,
        }),
      });
    });

    it('should handle TokenExpiredError with proper response format', () => {
      // Arrange
      const tokenExpiredError: any = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      
      // Act
      errorHandler(tokenExpiredError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          statusCode: 401,
        }),
      });
    });

    it('should handle CastError with proper response format', () => {
      // Arrange
      const castError: any = new Error('Cast to ObjectId failed');
      castError.name = 'CastError';
      
      // Act
      errorHandler(castError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid resource ID',
          code: 'INVALID_ID',
          statusCode: 400,
        }),
      });
    });

    it('should handle SyntaxError with body property with proper response format', () => {
      // Arrange
      const syntaxError: any = new Error('Unexpected token in JSON');
      syntaxError.name = 'SyntaxError';
      syntaxError.body = '{ invalid json }';
      
      // Act
      errorHandler(syntaxError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
          statusCode: 400,
        }),
      });
    });

    it('should handle generic Error with proper response format', () => {
      // Arrange
      const genericError = new Error('Something went wrong');
      
      // Act
      errorHandler(genericError, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        }),
      });
    });

    it('should include stack trace in development mode', () => {
      // Arrange
      const error = new Error('Development error');
      process.env.NODE_ENV = 'development';
      
      // Act
      errorHandler(error, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );
    });    it('should exclude stack trace in production mode', () => {
      // Arrange
      const error = new Error('Production error');
      process.env.NODE_ENV = 'production';
      
      // Act
      errorHandler(error, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      const responseArg = mockResponse.json.mock.calls[0][0] as any;
      expect(responseArg.error.stack).toBeUndefined();
    });

    it('should include details in development mode', () => {
      // Arrange
      const error = new AppError('App error with details', 500, true, 'APP_ERROR', { sensitive: 'data' });
      process.env.NODE_ENV = 'development';
      
      // Act
      errorHandler(error, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            details: { sensitive: 'data' },
          }),
        })
      );
    });    it('should exclude details in production mode', () => {
      // Arrange
      const error = new AppError('App error with details', 500, true, 'APP_ERROR', { sensitive: 'data' });
      process.env.NODE_ENV = 'production';
      
      // Act
      errorHandler(error, mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      const responseArg = mockResponse.json.mock.calls[0][0] as any;
      expect(responseArg.error.details).toBeUndefined();
    });
  });

  describe('notFoundHandler middleware', () => {
    it('should return 404 response with route details', () => {
      // Act
      notFoundHandler(mockRequest as any, mockResponse as any);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Route GET /test/path not found',
          code: 'ROUTE_NOT_FOUND',
          statusCode: 404,
          path: '/test/path',
          method: 'GET',
        }),
      });
    });
  });

  describe('asyncHandler wrapper', () => {
    it('should call the next function with error when async function rejects', async () => {
      // Arrange
      const testError = new Error('Async error');
      const asyncFn = jest.fn().mockImplementation(() => Promise.reject(testError));
      const wrappedFn = asyncHandler(asyncFn as any);
      
      // Act
      await wrappedFn(mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it('should not call next if async function resolves', async () => {
      // Arrange
      const asyncFn = jest.fn().mockImplementation(() => Promise.resolve());
      const wrappedFn = asyncHandler(asyncFn as any);
      
      // Act
      await wrappedFn(mockRequest as any, mockResponse as any, mockNext);
      
      // Assert
      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error classes', () => {
    it('should create AppError with correct properties', () => {
      // Act
      const error = new AppError('Test error', 400, true, 'TEST_CODE', { data: 'test' });
      
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ data: 'test' });
      expect(error.stack).toBeDefined();
    });

    it('should create AuthenticationError with correct defaults', () => {
      // Act
      const error = new AuthenticationError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create AuthorizationError with correct defaults', () => {
      // Act
      const error = new AuthorizationError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should create ValidationError with correct defaults', () => {
      // Act
      const error = new ValidationError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create NotFoundError with correct defaults', () => {
      // Act
      const error = new NotFoundError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should create ConflictError with correct defaults', () => {
      // Act
      const error = new ConflictError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });

    it('should create RateLimitError with correct defaults', () => {
      // Act
      const error = new RateLimitError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should create TokenError with correct defaults', () => {
      // Act
      const error = new TokenError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_ERROR');
    });

    it('should create EmailError with correct defaults', () => {
      // Act
      const error = new EmailError();
      
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Email service error');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('EMAIL_ERROR');
    });
  });

  describe('Helper functions', () => {
    it('should create validation error from express-validator errors', () => {
      // Arrange
      const validationErrors = [
        { path: 'email', msg: 'Invalid email format', value: 'test', location: 'body' },
        { param: 'password', msg: 'Password too short', value: '123', location: 'body' },
      ];
      
      // Act
      const error = createValidationError(validationErrors);
      
      // Assert
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual([
        { field: 'email', message: 'Invalid email format', value: 'test', location: 'body' },
        { field: 'password', message: 'Password too short', value: '123', location: 'body' },
      ]);
    });

    it('should create success response', () => {
      // Act
      const response = createSuccessResponse({ id: 1, name: 'Test' }, 'Operation successful');
      
      // Assert
      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation successful',
        timestamp: expect.any(String),
      });
    });

    it('should create paginated response', () => {
      // Arrange
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const page = 2;
      const limit = 3;
      const total = 10;
      
      // Act
      const response = createPaginatedResponse(data, page, limit, total, 'Paginated data');
      
      // Assert
      expect(response).toEqual({
        success: true,
        data,
        message: 'Paginated data',
        timestamp: expect.any(String),
        pagination: {
          page: 2,
          limit: 3,
          total: 10,
          totalPages: 4,
          hasNext: true,
          hasPrev: true,
        },
      });
    });

    it('should calculate pagination properties correctly', () => {
      // Arrange - First page, has next but no prev
      const dataFirstPage = [{ id: 1 }, { id: 2 }];
      
      // Act
      const responseFirstPage = createPaginatedResponse(dataFirstPage, 1, 2, 5);
      
      // Assert
      expect(responseFirstPage.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });

      // Arrange - Last page, has prev but no next
      const dataLastPage = [{ id: 5 }];
      
      // Act
      const responseLastPage = createPaginatedResponse(dataLastPage, 3, 2, 5);
      
      // Assert
      expect(responseLastPage.pagination).toEqual({
        page: 3,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });

      // Arrange - Empty result, no next, no prev
      const dataEmpty: any[] = [];
      
      // Act
      const responseEmpty = createPaginatedResponse(dataEmpty, 1, 10, 0);
      
      // Assert
      expect(responseEmpty.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });
  });
});
