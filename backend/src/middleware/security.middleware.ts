/**
 * Comprehensive security middleware collection
 * Implements input sanitization, rate limiting, CORS, security headers, and request validation
 */

import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
// @ts-expect-error - xss-clean doesn't have types
import xss from 'xss-clean';
import hpp from 'hpp';
import { z } from 'zod';

/**
 * Input sanitization middleware pipeline
 * Prevents NoSQL injection, XSS attacks, and parameter pollution
 */
export const inputSanitization = [
  // Remove any keys that start with '$' or contain '.' from user input
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized potentially dangerous key: ${key} from IP: ${req.ip}`);
    },
  }),

  // Clean user input from malicious HTML
  xss(),

  // Protect against HTTP Parameter Pollution attacks
  hpp({
    whitelist: ['tags', 'categories', 'filters'], // Allow arrays for these fields
  }),
];

/**
 * Rate limiting configuration for different endpoints
 */
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string | object;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs || 900000 / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    ...options,
  };

  return rateLimit(defaultOptions);
};

/**
 * Slow down middleware for progressive delays
 */
export const createSlowDown = (options: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
  maxDelayMs?: number;
}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    ...options,
  };

  return slowDown(defaultOptions);
};

/**
 * Rate limiting presets for different endpoint types
 */
export const rateLimitPresets = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900, // 15 minutes
    },
    skipSuccessfulRequests: true,
  }),

  // Moderate rate limiting for API endpoints
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  }),

  // Lenient rate limiting for static content
  static: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
  }),

  // Strict rate limiting for write operations
  write: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 write operations per window
  }),

  // Very strict rate limiting for sensitive operations
  sensitive: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      error: 'Too many sensitive operation attempts, please try again later.',
      retryAfter: 3600, // 1 hour
    },
  }),
};

/**
 * Progressive slow down presets
 */
export const slowDownPresets = {
  // Progressive slowdown for API endpoints
  api: createSlowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Start slowing down after 50 requests
    delayMs: 100, // Add 100ms delay per request
    maxDelayMs: 5000, // Maximum 5 second delay
  }),

  // Aggressive slowdown for write operations
  write: createSlowDown({
    windowMs: 5 * 60 * 1000, // 5 minutes
    delayAfter: 10, // Start slowing down after 10 requests
    delayMs: 250, // Add 250ms delay per request
    maxDelayMs: 10000, // Maximum 10 second delay
  }),
};

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable for development, enable in production

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin'],
  },

  // X-Download-Options
  ieNoOpen: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
});

/**
 * CORS configuration with security considerations
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000', // React development server
      'http://localhost:5173', // Vite development server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    // In production, add your actual domain(s)
    if (process.env.NODE_ENV === 'production') {
      // allowedOrigins.push('https://yourdomain.com');
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID'],
};

/**
 * Request validation middleware factory
 */
export const createValidationMiddleware = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request components
      const validatedData: Record<string, unknown> = {};

      if (schema.body && req.body) {
        validatedData.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query && req.query) {
        validatedData.query = await schema.query.parseAsync(req.query);
      }

      if (schema.params && req.params) {
        validatedData.params = await schema.params.parseAsync(req.params);
      }

      if (schema.headers) {
        validatedData.headers = await schema.headers.parseAsync(req.headers);
      }

      // Attach validated data to request
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // MongoDB ObjectId validation
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),

  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // Sort parameters
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Search parameters
  search: z.object({
    q: z.string().min(1).max(100).optional(),
    filters: z.record(z.string()).optional(),
  }),
};

/**
 * Security audit logging middleware
 */
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log security-relevant information
  const auditData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    headers: {
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      xForwardedFor: req.get('X-Forwarded-For'),
    },
  };

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log suspicious activities
    if (statusCode >= 400 || duration > 5000) {
      console.warn('Security audit:', {
        ...auditData,
        statusCode,
        duration,
        suspicious: statusCode === 401 || statusCode === 403 || duration > 10000,
      });
    }
  });

  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        res.status(413).json({
          error: 'Request entity too large',
          maxSize,
          receivedSize: `${Math.round((sizeInBytes / 1024 / 1024) * 100) / 100}MB`,
        });
        return;
      }
    }

    next();
  };
};

/**
 * Helper function to parse size strings
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const [, value, unit] = match;
  if (!value || !unit) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const multiplier = units[unit as keyof typeof units];
  if (multiplier === undefined) {
    throw new Error(`Unsupported unit: ${unit}`);
  }

  return parseFloat(value) * multiplier;
}

/**
 * Complete security middleware pipeline
 */
export const securityMiddleware = [
  securityHeaders,
  securityAuditLogger,
  requestSizeLimiter('10mb'),
  ...inputSanitization,
];
