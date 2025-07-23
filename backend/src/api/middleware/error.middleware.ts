/**
 * Error handling middleware foexport class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, true, 'AUTHENTICATION_ERROR', details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super(message, 403, true, 'AUTHORIZATION_ERROR', details);
  }
}ation and general application errors
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication-specific error classes
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, true, 'AUTHENTICATION_ERROR', details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super(message, 403, true, 'AUTHORIZATION_ERROR', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, true, 'NOT_FOUND_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: unknown) {
    super(message, 429, true, 'RATE_LIMIT_ERROR', details);
  }
}

export class TokenError extends AppError {
  constructor(message: string = 'Invalid or expired token', details?: unknown) {
    super(message, 401, true, 'TOKEN_ERROR', details);
  }
}

export class EmailError extends AppError {
  constructor(message: string = 'Email service error', details?: unknown) {
    super(message, 503, true, 'EMAIL_ERROR', details);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
    timestamp: string;
    path: string;
    method: string;
  };
}

/**
 * Global error handling middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log error for debugging
  console.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString(),
  });

  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  // Handle specific error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    details = error.details;
  } else if (error.name === 'ValidationError') {
    // MongoDB validation errors
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = error.message;
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    // MongoDB errors
    statusCode = 500;
    message = 'Database Error';
    code = 'DATABASE_ERROR';
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid token';
    code = 'TOKEN_ERROR';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expiration errors
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'CastError') {
    // MongoDB cast errors (invalid ObjectId, etc.)
    statusCode = 400;
    message = 'Invalid resource ID';
    code = 'INVALID_ID';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  // Add details if available and in development mode
  if (details && process.env.NODE_ENV === 'development') {
    errorResponse.error.details = details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  res.status(404).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create validation error from express-validator results
 */
export function createValidationError(
  errors: Array<{ path?: string; param?: string; msg: string; value?: unknown; location?: string }>
): ValidationError {
  const details = errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location,
  }));

  return new ValidationError('Validation failed', details);
}

/**
 * Success response helper
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated response helper
 */
export interface PaginatedResponse<T = unknown> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
