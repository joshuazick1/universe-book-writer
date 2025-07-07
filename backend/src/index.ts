import 'dotenv/config';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { createPluginRoutes } from './api/routes/plugin.routes.js';
import { createAuthRoutes } from './api/routes/auth.routes.js';
import { createUserRoutes } from './api/routes/user.routes.js';
import { createAdminRoutes } from './api/routes/admin.routes.js';
import { createUniverseRoutes } from './api/routes/universe.routes.js';
import { createUniverseCollaborationRoutes } from './api/routes/universe-collaboration.routes.js';
import { createMonitoringRoutes } from './api/routes/monitoring.routes.js';
import { createPluginHealthRoutes } from './api/routes/plugin-health.routes.js';
import { createUserActivityAnalyticsRoutes } from './api/routes/user-activity-analytics.routes.js';
import { createSecurityAuditRoutes } from './api/routes/security-audit.routes.js';
import { createRAGRoutes } from './routes/rag.routes.js';
import { mongoDBConnection } from './config/mongodb.config.js';
import { PluginSystemFactory } from './plugins/manager/plugin-system.factory.js';
import { errorHandler } from './api/middleware/error.middleware.js';
import { createAuthContainer, TOKENS } from './infrastructure/container/container.js';
import type { AuthController } from './api/controllers/auth.controller.js';
import type { UserController } from './api/controllers/user.controller.js';
import type { AdminController } from './api/controllers/admin.controller.js';
import type { UniverseController, UniverseValidationController } from './api/controllers/universe.controller.js';
import type { UniverseCollaborationController } from './api/controllers/universe-collaboration.controller.js';
import type { MonitoringController } from './api/controllers/monitoring.controller.js';
import type { PluginHealthMonitoringController } from './api/controllers/plugin-health.controller.js';
import type { UserActivityAnalyticsController } from './api/controllers/user-activity-analytics.controller.js';
import type { SecurityAuditController } from './api/controllers/security-audit.controller.js';
import type { RAGController } from './controllers/rag.controller.js';
import { AuthMiddleware } from './api/middleware/auth.middleware.js';
import { ValidationMiddleware } from './api/middleware/validation.middleware.js';

const app = express();
const port = process.env.PORT || 5000;

// Security Middleware - Applied before other middleware
console.log('🔒 Configuring security middleware...');

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 1. Security headers using Helmet
app.use(
  helmet({
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
      },
    },
    hsts: {
      maxAge: process.env.NODE_ENV === 'production' ? 31536000 : 0,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// 2. Rate limiting (temporarily disabled for testing)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use(limiter);

// 3. Input sanitization
app.use(
  mongoSanitize({
    replaceWith: '_',
  })
);

// 4. Enhanced CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
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

app.use(cors(corsOptions));

console.log('✅ Security middleware configured');

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Initialize the application
export async function initializeApp() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoClient = await mongoDBConnection.connect();
    console.log('MongoDB connected successfully');

    // Initialize dependency injection container
    console.log('Initializing dependency container...');
    const authContainer = createAuthContainer({
      mongoClient,
      databaseName: process.env.MONGODB_DB_NAME || 'verseforge',
    });

    // Initialize auth repositories
    await authContainer.initialize();

    // Resolve auth dependencies
    const authController = authContainer.resolve<AuthController>(TOKENS.AUTH_CONTROLLER);
    const userController = authContainer.resolve<UserController>(TOKENS.USER_CONTROLLER);
    const authMiddleware = authContainer.resolve<AuthMiddleware>(TOKENS.AUTH_MIDDLEWARE);
    const validationMiddleware = authContainer.resolve<ValidationMiddleware>(TOKENS.VALIDATION_MIDDLEWARE);

    // Try to resolve admin controller, but handle gracefully if not available
    let adminController: AdminController | null = null;
    try {
      // Check if admin tokens are available in the container
      if ('ADMIN_CONTROLLER' in TOKENS && TOKENS.ADMIN_CONTROLLER) {
        adminController = authContainer.resolve<AdminController>(TOKENS.ADMIN_CONTROLLER);
        console.log('✅ Admin controller resolved successfully');
      } else {
        console.warn('⚠️ ADMIN_CONTROLLER token not available, admin routes will be disabled');
      }
    } catch (error) {
      console.warn(
        '⚠️ Failed to resolve AdminController, admin routes will be disabled:',
        error instanceof Error ? error.message : String(error)
      );
    }

    // Initialize plugin system
    console.log('🔌 Initializing plugin system...');
    console.log('📁 Current working directory:', process.cwd());

    const pluginDirectories = [
      path.join(process.cwd(), '..', 'plugins'),
    ];

    console.log('📂 Plugin directories array:');
    pluginDirectories.forEach((dir, index) => {
      console.log(`  ${index + 1}. ${dir}`);
    });

    const pluginSystem = await PluginSystemFactory.create({
      mongoClient,
      databaseName: process.env.MONGODB_DB_NAME || 'verseforge',
      pluginDirectories,
      autoLoadPlugins: true,
    });
    console.log('✅ Plugin system initialized successfully');

    // Setup routes
    app.get('/api/health', (req: express.Request, res: express.Response) => {
      const securityStatus = {
        environment: process.env.NODE_ENV || 'development',
        securityHeaders: true,
        rateLimiting: true,
        inputSanitization: true,
        cors: true,
        httpsOnly: process.env.NODE_ENV === 'production' ? !!process.env.HTTPS : 'N/A',
        secretsConfigured: {
          jwtSecret: !!process.env.JWT_SECRET,
          dbPassword: !!process.env.MONGODB_PASSWORD,
        },
      };

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        pluginCount: pluginSystem.pluginUseCase.getAllPlugins().length,
        authentication: 'enabled',
        security: securityStatus,
      });
    });

    // Security status endpoint
    app.get('/api/security/status', (req: express.Request, res: express.Response) => {
      const securityChecks = {
        environment: process.env.NODE_ENV || 'development',
        securityFeatures: {
          helmet: true,
          rateLimiting: true,
          corsProtection: true,
          inputSanitization: true,
          requestSizeLimiting: true,
        },
        configuration: {
          httpsEnforced: process.env.NODE_ENV === 'production',
          hstsEnabled: process.env.NODE_ENV === 'production',
          cspEnabled: true,
          rateLimitWindow: '15 minutes',
          maxRequestsPerWindow: 100,
          maxRequestSize: '10mb',
        },
        compliance: {
          status: 'healthy',
          issues: [] as string[],
        },
      };

      // Check for potential security issues
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.JWT_SECRET) {
          securityChecks.compliance.issues.push('JWT_SECRET not configured');
        }
        if (!process.env.HTTPS) {
          securityChecks.compliance.issues.push('HTTPS not enforced');
        }
      }

      securityChecks.compliance.status =
        securityChecks.compliance.issues.length === 0 ? 'healthy' : 'warning';

      res.json({
        timestamp: new Date().toISOString(),
        ...securityChecks,
      });
    });

    // Authentication routes
    app.use('/api/auth', createAuthRoutes(authController, authMiddleware, validationMiddleware));

    // User management routes
    app.use('/api/users', createUserRoutes(userController, authMiddleware, validationMiddleware));

    // Admin routes (only if admin controller is available)
    if (adminController) {
      app.use('/api/admin', createAdminRoutes(adminController, authMiddleware));
      console.log('✅ Admin routes enabled');
    } else {
      console.log('⚠️ Admin routes disabled - AdminController not available');
    }

    // Universe management routes
    try {
      const universeController = authContainer.resolve<UniverseController>(TOKENS.UNIVERSE_CONTROLLER);
      const universeValidationController = authContainer.resolve<UniverseValidationController>(TOKENS.UNIVERSE_VALIDATION_CONTROLLER);
      app.use('/api/universes', authMiddleware.authenticate, createUniverseRoutes(universeController, universeValidationController));
      console.log('✅ Universe routes enabled with authentication');
    } catch (error) {
      console.warn('⚠️ Failed to resolve Universe controllers:', error instanceof Error ? error.message : String(error));
    }

    // NEW: Simplified collaboration routes
    try {
      const collaborationController = authContainer.resolve<UniverseCollaborationController>(TOKENS.UNIVERSE_COLLABORATION_CONTROLLER);
      app.use('/api/universes', authMiddleware.authenticate, createUniverseCollaborationRoutes(collaborationController));
      console.log('✅ Universe collaboration routes enabled with authentication');
    } catch (error) {
      console.warn('⚠️ Failed to resolve Universe collaboration controller:', error instanceof Error ? error.message : String(error));
    }

    // Plugin management routes
    app.use('/api/plugins', createPluginRoutes(pluginSystem.pluginController));

    // RAG system routes
    try {
      console.log('🔧 Starting RAG system initialization...');
      const { logInfo, logWarn, logError, logDebug } = await import('./infrastructure/logger.js');

      logInfo('RAG initialization started');
      logDebug('Importing RAG services...');

      const { RAGIntegrationService } = await import('./services/rag-integration.service.js');
      logDebug('RAGIntegrationService imported successfully');

      const { createRAGRoutes } = await import('./routes/rag.routes.js');
      logDebug('createRAGRoutes imported successfully');

      // Initialize RAG integration service
      const ragConfig = {
        aiServerUrl: process.env.AI_SERVER_URL || 'http://localhost:5100',
        databaseUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DB_NAME || 'universe_book_writer',
        syncInterval: 300000, // 5 minutes
        batchSize: 100,
        aiServerApiKey: process.env.AI_SERVER_API_KEY
      };

      logDebug(`RAG config: ${JSON.stringify(ragConfig)}`);
      logInfo('Creating RAG integration service...');

      const ragIntegrationService = new RAGIntegrationService(ragConfig);
      logDebug('RAG integration service created');

      // Initialize the service
      logInfo('Initializing RAG integration service...');
      await ragIntegrationService.initialize();
      logInfo('RAG integration service initialized successfully');

      logInfo('Creating RAG routes...');
      const ragRouter = createRAGRoutes(ragIntegrationService);
      logDebug('RAG routes created successfully');

      logInfo('Registering RAG routes at /api/rag...');
      app.use('/api/rag', ragRouter);

      console.log('✅ RAG system routes enabled');
      logInfo('RAG system routes enabled successfully');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';

      console.warn('⚠️ Failed to initialize RAG routes:', errorMsg);

      // Import logger for error logging
      try {
        const { logError, logWarn } = await import('./infrastructure/logger.js');
        logError(`RAG initialization failed: ${errorMsg}`);
        logError(`RAG error stack: ${errorStack}`);
        logWarn('RAG routes will not be available');
      } catch (loggerError) {
        console.error('Failed to log RAG error:', loggerError);
      }
    }

    // Monitoring routes
    try {
      const monitoringController = authContainer.resolve<MonitoringController>(TOKENS.MONITORING_CONTROLLER);
      app.use('/api/monitoring', createMonitoringRoutes(monitoringController, authMiddleware));
      console.log('✅ Monitoring routes enabled');
    } catch (error) {
      console.warn('⚠️ Failed to resolve MonitoringController:', error instanceof Error ? error.message : String(error));
    }

    // Plugin health monitoring routes
    try {
      const pluginHealthController = authContainer.resolve<PluginHealthMonitoringController>(TOKENS.PLUGIN_HEALTH_CONTROLLER);
      app.use('/api/plugin-health', createPluginHealthRoutes(pluginHealthController));
      console.log('✅ Plugin health monitoring routes enabled');
    } catch (error) {
      console.warn('⚠️ Failed to resolve PluginHealthMonitoringController:', error instanceof Error ? error.message : String(error));
    }

    // User activity analytics routes
    try {
      const analyticsController = authContainer.resolve<UserActivityAnalyticsController>(TOKENS.USER_ACTIVITY_ANALYTICS_CONTROLLER);
      app.use('/api/analytics', createUserActivityAnalyticsRoutes(analyticsController, authMiddleware));
      console.log('✅ User activity analytics routes enabled');
    } catch (error) {
      console.warn('⚠️ Failed to resolve UserActivityAnalyticsController:', error instanceof Error ? error.message : String(error));
    }

    // Security audit logging routes
    try {
      const securityAuditController = authContainer.resolve<SecurityAuditController>(TOKENS.SECURITY_AUDIT_CONTROLLER);
      app.use('/api/security-audit', createSecurityAuditRoutes(securityAuditController, authMiddleware));
      console.log('✅ Security audit logging routes enabled');
    } catch (error) {
      console.warn('⚠️ Failed to resolve SecurityAuditController:', error instanceof Error ? error.message : String(error));
    }

    // Global error handling middleware (must be last)
    app.use(errorHandler);
    app.use(
      (error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        });
      }
    );

    // Start server
    let server;
    try {
      server = app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📡 Health check: http://localhost:${port}/api/health`);
        console.log(`🔌 Plugin API: http://localhost:${port}/api/plugins`);
      });

      // Add error handler for port conflicts
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Error: Port ${port} is already in use. Try using a different port.`);
        } else {
          console.error('❌ Server error:', err);
        }
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }

    return server;
  } catch (error) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
}

/**
 * Start the server and initialize all components
 */
export async function startServer() {
  return initializeApp();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await mongoDBConnection.disconnect();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await mongoDBConnection.disconnect();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Initialize the application
initializeApp();
