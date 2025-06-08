/**
 * Security middleware barrel file
 * Exports all security-related middleware and configurations
 */

// Main security configuration
export {
  configureGlobalSecurity,
  configureEndpointSecurity,
  createEndpointValidation,
  securityPresets,
  performSecurityHealthCheck,
  type SecurityConfig,
} from './security.config.js';

// Security middleware components
export {
  inputSanitization,
  createRateLimit,
  createSlowDown,
  rateLimitPresets,
  slowDownPresets,
  securityHeaders,
  corsConfig,
  securityAuditLogger,
  requestSizeLimiter,
  securityMiddleware,
} from './security.middleware.js';

// Validation pipeline
export {
  createSecureValidationMiddleware,
  securityValidationSchemas,
  suspiciousRequestDetector,
  validationPipeline,
  type ValidationOptions,
} from './validation.pipeline.js';

// CORS configuration
export {
  corsOptions,
  strictCorsOptions,
  developmentCorsOptions,
  getCorsConfig,
  createCorsMiddleware,
  corsSecurityHeaders,
} from './cors.config.js';

// Re-export existing validation middleware for compatibility
export { validateRequest, validationErrorHandler } from './validation.js';
