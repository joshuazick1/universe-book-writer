/**
 * Enhanced CORS configuration with security considerations
 * Provides flexible, secure cross-origin resource sharing setup
 */

import type { CorsOptions } from 'cors';
import type { Request, Response, NextFunction } from 'express';

/**
 * Environment-specific CORS configuration
 */
interface CorsEnvironmentConfig {
  development: string[];
  test: string[];
  production: string[];
}

/**
 * Allowed origins configuration
 */
const allowedOrigins: CorsEnvironmentConfig = {
  development: [
    'http://localhost:3000', // React development server
    'http://localhost:5173', // Vite development server
    'http://127.0.0.1:3000', // Alternative localhost
    'http://127.0.0.1:5173', // Alternative localhost
    'http://localhost:4173', // Vite preview server
    'http://127.0.0.1:4173', // Alternative localhost preview
  ],
  test: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  production: [
    // Add production domains here
    // 'https://yourdomain.com',
    // 'https://www.yourdomain.com',
  ],
};

/**
 * Trusted domains for production
 */
const trustedDomains: string[] = [
  // Add your trusted production domains
  // 'yourdomain.com',
  // 'subdomain.yourdomain.com',
];

/**
 * Origin validation function
 */
const validateOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (mobile apps, Postman, desktop apps, etc.)
  if (!origin) {
    return callback(null, true);
  }

  const environment = process.env.NODE_ENV || 'development';
  const allowedForEnvironment = allowedOrigins[environment as keyof CorsEnvironmentConfig] || [];

  // Check against environment-specific allowed origins
  if (allowedForEnvironment.includes(origin)) {
    return callback(null, true);
  }

  // In production, also check against trusted domains with regex
  if (environment === 'production') {
    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;

      // Check if hostname matches any trusted domain pattern
      const isTrusted = trustedDomains.some(domain => {
        // Exact match
        if (hostname === domain) return true;

        // Subdomain match (e.g., subdomain.domain.com matches domain.com)
        if (hostname.endsWith(`.${domain}`)) return true;

        return false;
      });

      if (isTrusted && originUrl.protocol === 'https:') {
        return callback(null, true);
      }
    } catch (error) {
      console.warn(`Invalid origin URL format: ${origin}`);
    }
  }

  // Log blocked origins for security monitoring
  console.warn(`CORS: Blocked request from origin: ${origin}`, {
    timestamp: new Date().toISOString(),
    environment,
    userAgent: 'Unknown', // Will be filled by request context if available
  });

  callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
};

/**
 * Enhanced CORS options with security features
 */
export const corsOptions: CorsOptions = {
  origin: validateOrigin,

  // Allow credentials (cookies, authorization headers, TLS client certificates)
  credentials: true,

  // Handle legacy browsers that might not support status 204
  optionsSuccessStatus: 200,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],

  // Allowed headers in requests
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Client-Version',
    'Accept-Language',
    'Accept-Encoding',
  ],

  // Headers exposed to the browser
  exposedHeaders: [
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Limit',
    'X-Request-ID',
    'X-Response-Time',
    'X-Total-Count',
    'Content-Range',
  ],

  // Cache preflight requests for 24 hours
  maxAge: 86400,

  // Enable preflight for all requests
  preflightContinue: false,
};

/**
 * Strict CORS options for sensitive endpoints
 */
export const strictCorsOptions: CorsOptions = {
  ...corsOptions,

  // More restrictive origin checking
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // No origin requests not allowed for sensitive endpoints
    if (!origin) {
      return callback(new Error('Origin required for sensitive endpoints'), false);
    }

    // Use the regular validation but with stricter logging
    validateOrigin(origin, (err, allow) => {
      if (err || !allow) {
        console.error(`STRICT CORS: Blocked sensitive request from origin: ${origin}`, {
          timestamp: new Date().toISOString(),
          severity: 'HIGH',
        });
      }
      callback(err, allow);
    });
  },

  // Reduced cache time for sensitive endpoints
  maxAge: 3600, // 1 hour

  // More restrictive methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  // Reduced exposed headers
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
};

/**
 * Development-only CORS options (very permissive)
 */
export const developmentCorsOptions: CorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: '*',
  exposedHeaders: [
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Limit',
    'X-Request-ID',
    'X-Response-Time',
    'X-Total-Count',
    'Content-Range',
  ],
  maxAge: 86400,
  preflightContinue: false,
};

/**
 * Get appropriate CORS configuration based on environment and endpoint type
 */
export const getCorsConfig = (
  endpointType: 'public' | 'api' | 'auth' | 'admin' = 'api'
): CorsOptions => {
  const environment = process.env.NODE_ENV || 'development';

  // Use permissive CORS in development
  if (environment === 'development') {
    return developmentCorsOptions;
  }

  // Use strict CORS for sensitive endpoints
  if (endpointType === 'auth' || endpointType === 'admin') {
    return strictCorsOptions;
  }

  // Use standard CORS for other endpoints
  return corsOptions;
};

/**
 * CORS middleware factory for different endpoint types
 */
export const createCorsMiddleware = (endpointType: 'public' | 'api' | 'auth' | 'admin' = 'api') => {
  const config = getCorsConfig(endpointType);

  return (req: Request, res: Response, next: NextFunction) => {
    // Add request context to CORS validation
    const originalOrigin = config.origin;

    if (typeof originalOrigin === 'function') {
      config.origin = (origin, callback) => {
        // Add request information to logging context
        req.corsContext = {
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          xForwardedFor: req.get('X-Forwarded-For'),
          ip: req.ip,
        };

        originalOrigin(origin, callback);
      };
    }

    // Import cors dynamically to avoid issues with CommonJS/ESM
    import('cors').then(({ default: cors }) => {
      cors(config)(req, res, next);
    });
  };
};

/**
 * Security headers for CORS-related security
 */
export const corsSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Cross-Origin-Embedder-Policy (disabled for compatibility)
  // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  next();
};

/**
 * Type declaration for request extensions
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      corsContext?: {
        userAgent?: string;
        referer?: string;
        xForwardedFor?: string;
        ip?: string;
      };
    }
  }
}
