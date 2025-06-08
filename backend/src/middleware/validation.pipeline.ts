/**
 * Comprehensive request validation pipeline
 * Extends the existing validation middleware with additional security features
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../api/middleware/error.middleware.js';

/**
 * Advanced validation options
 */
export interface ValidationOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
  allowUnknown?: boolean;
  maxDepth?: number;
  customErrorMessages?: boolean;
}

/**
 * Security-focused validation schemas
 */
export const securityValidationSchemas = {
  // Safe string validation (prevents XSS and injection)
  safeString: z
    .string()
    .trim()
    .max(1000)
    .refine(
      (value: string) => {
        // Check for potentially dangerous patterns
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /data:.*,/i,
          /vbscript:/i,
          /expression\s*\(/i,
        ];
        return !dangerousPatterns.some(pattern => pattern.test(value));
      },
      { message: 'String contains potentially dangerous content' }
    ),

  // Safe HTML content (allows basic formatting)
  safeHtml: z
    .string()
    .trim()
    .max(10000)
    .refine(
      (value: string) => {
        // Allow only specific HTML tags
        const allowedTags =
          /<\/?(?:p|br|strong|em|u|ol|ul|li|h[1-6]|blockquote)(?:\s[^>]*)?>|&(?:amp|lt|gt|quot|#39);/gi;
        const cleanValue = value.replace(allowedTags, '');
        return !/<|>/.test(cleanValue);
      },
      { message: 'HTML content contains disallowed tags' }
    ),

  // MongoDB ObjectId validation with additional checks
  mongoObjectId: z
    .string()
    .length(24)
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
    .refine(
      (value: string) => {
        // Check for null ObjectId
        return value !== '000000000000000000000000';
      },
      { message: 'ObjectId cannot be null' }
    ),
  // Email validation with additional security checks
  secureEmail: z
    .string()
    .email()
    .max(254) // RFC 5321 limit
    .toLowerCase()
    .refine(
      (email: string) => {
        // Check for suspicious email patterns
        const suspiciousPatterns = [
          /\+.*\+/, // Multiple plus signs
          /\.{2,}/, // Multiple consecutive dots
          /@.*@/, // Multiple @ symbols
          /[<>]/, // Angle brackets
        ];
        return !suspiciousPatterns.some(pattern => pattern.test(email));
      },
      { message: 'Email contains suspicious patterns' }
    ),

  // URL validation with security constraints
  secureUrl: z
    .string()
    .url()
    .max(2083) // IE URL length limit
    .refine(
      (url: string) => {
        try {
          const parsed = new URL(url);
          // Only allow specific protocols
          const allowedProtocols = ['http:', 'https:'];
          return allowedProtocols.includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use http or https protocol' }
    ),

  // Password validation with strength requirements
  strongPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .refine(
      (password: string) => {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
        return hasUppercase && hasLowercase && hasNumbers && hasSpecialChar;
      },
      {
        message: 'Password must contain uppercase, lowercase, number, and special character',
      }
    ),

  // File upload validation
  fileUpload: z.object({
    filename: z
      .string()
      .max(255)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
    mimetype: z.enum([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf',
      'application/json',
    ]),
    size: z.number().max(10 * 1024 * 1024), // 10MB limit
  }),

  // Pagination with security limits
  securePagination: z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).optional(),
  }),
  // Search query with XSS protection
  secureSearch: z.object({
    q: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (query: string) => {
          // Prevent script injection in search
          const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /\$\{/, /\{%/];
          return !dangerousPatterns.some(pattern => pattern.test(query));
        },
        { message: 'Search query contains potentially dangerous content' }
      )
      .optional(),
    filters: z.record(z.string().max(100)).optional(),
    sort: z.enum(['asc', 'desc']).default('asc'),
    sortBy: z
      .string()
      .max(50)
      .regex(/^[a-zA-Z0-9._]+$/)
      .optional(),
  }),
};

/**
 * Enhanced validation middleware with security features
 */
export const createSecureValidationMiddleware = (
  schema: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
    headers?: z.ZodSchema;
  },
  options: ValidationOptions = {}
) => {
  const defaultOptions: ValidationOptions = {
    stripUnknown: true,
    abortEarly: false,
    allowUnknown: false,
    maxDepth: 10,
    customErrorMessages: true,
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData: Record<string, unknown> = {};
      const sanitizedData: Record<string, unknown> = {};

      // Validate and sanitize body
      if (schema.body && req.body) {
        const result = await schema.body.parseAsync(req.body);
        validatedData.body = result;
        sanitizedData.body = sanitizeObject(result, defaultOptions.maxDepth!);
      }

      // Validate and sanitize query
      if (schema.query && req.query) {
        const result = await schema.query.parseAsync(req.query);
        validatedData.query = result;
        sanitizedData.query = sanitizeObject(result, defaultOptions.maxDepth!);
      }

      // Validate and sanitize params
      if (schema.params && req.params) {
        const result = await schema.params.parseAsync(req.params);
        validatedData.params = result;
        sanitizedData.params = sanitizeObject(result, defaultOptions.maxDepth!);
      }

      // Validate headers (usually no sanitization needed)
      if (schema.headers) {
        validatedData.headers = await schema.headers.parseAsync(req.headers);
      }

      // Attach validated and sanitized data to request
      req.validatedData = validatedData;
      req.sanitizedData = sanitizedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Request validation failed',
          formatZodErrors(error, defaultOptions.customErrorMessages!)
        );
        next(validationError);
        return;
      }
      next(error);
    }
  };
};

/**
 * Sanitize objects recursively
 */
function sanitizeObject(obj: unknown, maxDepth: number, currentDepth: number = 0): unknown {
  if (currentDepth >= maxDepth) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value, maxDepth, currentDepth + 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize individual strings
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  return (
    str
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except tabs and newlines
      // eslint-disable-next-line no-control-regex
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
  );
}

/**
 * Format Zod errors for better readability
 */
function formatZodErrors(
  error: z.ZodError,
  customMessages: boolean
): {
  errors: Array<{
    field: string;
    message: string;
    code: string;
    received?: unknown;
    expected?: unknown;
  }>;
  totalErrors: number;
} {
  return {
    errors: error.errors.map((err: z.ZodIssue) => ({
      field: err.path.join('.') || 'root',
      message: customMessages ? getCustomErrorMessage(err) : err.message,
      code: err.code,
      received: err.code === 'invalid_type' ? (err as z.ZodInvalidTypeIssue).received : undefined,
      expected: err.code === 'invalid_type' ? (err as z.ZodInvalidTypeIssue).expected : undefined,
    })),
    totalErrors: error.errors.length,
  };
}

/**
 * Generate custom error messages
 */
function getCustomErrorMessage(error: z.ZodIssue): string {
  const field = error.path.join('.') || 'field';

  switch (error.code) {
    case 'invalid_type':
      return `${field} must be of type ${(error as z.ZodInvalidTypeIssue).expected}`;
    case 'too_small': {
      const smallError = error as z.ZodTooSmallIssue;
      if (smallError.type === 'string') {
        return `${field} must be at least ${smallError.minimum} characters long`;
      }
      return `${field} must be at least ${smallError.minimum}`;
    }
    case 'too_big': {
      const bigError = error as z.ZodTooBigIssue;
      if (bigError.type === 'string') {
        return `${field} must not exceed ${bigError.maximum} characters`;
      }
      return `${field} must not exceed ${bigError.maximum}`;
    }
    case 'invalid_string': {
      const stringError = error as z.ZodInvalidStringIssue;
      return `${field} has invalid format: ${stringError.validation}`;
    }
    case 'custom':
      return error.message;
    default:
      return `${field} is invalid: ${error.message}`;
  }
}

/**
 * Middleware to check for suspicious request patterns
 */
export const suspiciousRequestDetector = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /('|(\\')|(;)|(\\)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute))/i,
    // XSS patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal
    /\.\.\//gi,
    /\.\.\\/gi,
    // Command injection
    /[;&|`]|(\$\{)|(\$\()/gi,
  ];

  const checkString = (str: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj: unknown): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  // Check various request parts
  const suspicious =
    checkString(req.url) ||
    checkObject(req.body) ||
    checkObject(req.query) ||
    checkObject(req.params);

  if (suspicious) {
    console.warn(`Suspicious request detected from IP: ${req.ip}`, {
      url: req.url,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    });

    res.status(400).json({
      error: 'Request contains suspicious content',
      code: 'SUSPICIOUS_REQUEST',
    });
    return;
  }

  next();
};

/**
 * Complete validation pipeline
 */
export const validationPipeline = [
  suspiciousRequestDetector,
  // Additional validation middleware can be added here
];
