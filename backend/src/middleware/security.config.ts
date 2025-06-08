/**
 * Main security configuration module
 * Orchestrates all security middleware and provides unified configuration
 */

import type { Express, RequestHandler } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { securityMiddleware, rateLimitPresets, slowDownPresets } from './security.middleware.js';
import {
  validationPipeline,
  securityValidationSchemas,
  createSecureValidationMiddleware,
} from './validation.pipeline.js';
import { getCorsConfig, createCorsMiddleware, corsSecurityHeaders } from './cors.config.js';

/**
 * Security configuration options
 */
export interface SecurityConfig {
  // Environment settings
  environment: 'development' | 'test' | 'production';

  // Rate limiting configuration
  rateLimiting: {
    enabled: boolean;
    redis?: {
      host: string;
      port: number;
      password?: string;
    };
  };

  // CORS configuration
  cors: {
    enabled: boolean;
    strictMode: boolean;
    customOrigins?: string[];
  };

  // Input validation
  validation: {
    enabled: boolean;
    strictMode: boolean;
    maxRequestSize: string;
  };

  // Security headers
  headers: {
    enabled: boolean;
    hsts: boolean;
    csp: boolean;
  };

  // Audit logging
  audit: {
    enabled: boolean;
    sensitiveDataLogging: boolean;
  };
}

/**
 * Default security configuration
 */
const defaultSecurityConfig: SecurityConfig = {
  environment: (process.env.NODE_ENV as SecurityConfig['environment']) || 'development',

  rateLimiting: {
    enabled: true,
    redis: process.env.REDIS_URL
      ? {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
        }
      : undefined,
  },

  cors: {
    enabled: true,
    strictMode: process.env.NODE_ENV === 'production',
    customOrigins: process.env.ALLOWED_ORIGINS?.split(','),
  },

  validation: {
    enabled: true,
    strictMode: process.env.NODE_ENV === 'production',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  },

  headers: {
    enabled: true,
    hsts: process.env.NODE_ENV === 'production',
    csp: true,
  },

  audit: {
    enabled: true,
    sensitiveDataLogging: process.env.NODE_ENV === 'development',
  },
};

/**
 * Configure security middleware for the entire application
 */
export const configureGlobalSecurity = (app: Express, config: Partial<SecurityConfig> = {}) => {
  const securityConfig = { ...defaultSecurityConfig, ...config };

  console.log('🔒 Configuring application security...', {
    environment: securityConfig.environment,
    rateLimiting: securityConfig.rateLimiting.enabled,
    cors: securityConfig.cors.enabled,
    validation: securityConfig.validation.enabled,
  });

  // 1. CORS configuration (must be first)
  if (securityConfig.cors.enabled) {
    app.use(cors(getCorsConfig('api')));
    app.use(corsSecurityHeaders);
    console.log('✅ CORS configured');
  }

  // 2. Security headers and basic security middleware
  if (securityConfig.headers.enabled) {
    app.use(securityMiddleware);
    console.log('✅ Security headers configured');
  }

  // 3. Rate limiting (apply globally)
  if (securityConfig.rateLimiting.enabled) {
    app.use(rateLimitPresets.api);
    app.use(slowDownPresets.api);
    console.log('✅ Rate limiting configured');
  }

  // 4. Input validation pipeline
  if (securityConfig.validation.enabled) {
    app.use(validationPipeline);
    console.log('✅ Input validation pipeline configured');
  }

  console.log('🔒 Global security configuration complete');
};

/**
 * Configure endpoint-specific security
 */
export const configureEndpointSecurity = (
  endpointType: 'public' | 'api' | 'auth' | 'admin',
  config: Partial<SecurityConfig> = {}
) => {
  const securityConfig = { ...defaultSecurityConfig, ...config };
  const middleware: RequestHandler[] = [];

  // CORS for specific endpoint types
  if (securityConfig.cors.enabled) {
    middleware.push(createCorsMiddleware(endpointType));
  }

  // Rate limiting based on endpoint sensitivity
  if (securityConfig.rateLimiting.enabled) {
    switch (endpointType) {
      case 'auth':
        middleware.push(rateLimitPresets.auth);
        break;
      case 'admin':
        middleware.push(rateLimitPresets.sensitive);
        break;
      case 'api':
        middleware.push(rateLimitPresets.write);
        break;
      default:
        middleware.push(rateLimitPresets.api);
    }
  }

  return middleware;
};

/**
 * Create validation middleware for specific schemas
 */
export const createEndpointValidation = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}) => {
  return createSecureValidationMiddleware(schema, {
    stripUnknown: true,
    abortEarly: false,
    customErrorMessages: true,
  });
};

/**
 * Security middleware presets for common use cases
 */
export const securityPresets = {
  // Public endpoints (minimal security)
  public: () => configureEndpointSecurity('public'),

  // Standard API endpoints
  api: () => configureEndpointSecurity('api'),

  // Authentication endpoints (strict security)
  auth: () => configureEndpointSecurity('auth'),

  // Admin endpoints (maximum security)
  admin: () => configureEndpointSecurity('admin'),

  // File upload endpoints
  upload: () => [
    ...configureEndpointSecurity('api'),
    createEndpointValidation({
      body: securityValidationSchemas.fileUpload,
    }),
  ],

  // Search endpoints
  search: () => [
    ...configureEndpointSecurity('api'),
    rateLimitPresets.api,
    createEndpointValidation({
      query: securityValidationSchemas.secureSearch,
    }),
  ],
};

/**
 * Security health check function
 */
export const performSecurityHealthCheck = () => {
  const checks = {
    environment: process.env.NODE_ENV,
    httpsOnly: process.env.NODE_ENV === 'production' ? !!process.env.HTTPS : 'N/A',
    secretsPresent: {
      jwtSecret: !!process.env.JWT_SECRET,
      dbPassword: !!process.env.MONGODB_PASSWORD,
      redisPassword: !!process.env.REDIS_PASSWORD,
    },
    securityHeaders: true, // Always enabled
    rateLimiting: true, // Always enabled
    inputValidation: true, // Always enabled
    cors: true, // Always enabled
  };

  const issues: string[] = [];

  // Check for common security issues
  if (checks.environment === 'production') {
    if (!checks.secretsPresent.jwtSecret) {
      issues.push('JWT_SECRET not configured in production');
    }
    if (!checks.httpsOnly) {
      issues.push('HTTPS not enforced in production');
    }
  }

  return {
    status: issues.length === 0 ? 'healthy' : 'warning',
    checks,
    issues,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Export commonly used schemas
 */
export { securityValidationSchemas } from './validation.pipeline.js';

/**
 * Export rate limiting presets
 */
export { rateLimitPresets, slowDownPresets } from './security.middleware.js';

/**
 * Export CORS configurations
 */
export { getCorsConfig, corsOptions, strictCorsOptions } from './cors.config.js';
