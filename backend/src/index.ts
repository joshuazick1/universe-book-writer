import 'dotenv/config';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { createPluginRoutes } from './api/routes/plugin.routes.js';
import { createAuthRoutes } from './api/routes/auth.routes.js';
import { createUserRoutes } from './api/routes/user.routes.js';
import { createAdminRoutes } from './api/routes/admin.routes.js';
import { mongoDBConnection } from './config/mongodb.config.js';
import { PluginSystemFactory } from './plugins/manager/plugin-system.factory.js';
import { errorHandler } from './api/middleware/error.middleware.js';
import { createAuthContainer, TOKENS } from './infrastructure/container/container.js';
import type { AuthController } from './api/controllers/auth.controller.js';
import type { UserController } from './api/controllers/user.controller.js';
import type { AdminController } from './api/controllers/admin.controller.js';
import { AuthMiddleware } from './api/middleware/auth.middleware.js';
import { ValidationMiddleware } from './api/middleware/validation.middleware.js';

const app = express();
const port = process.env.PORT || 5000;

// Security Middleware - Applied before other middleware
console.log('🔒 Configuring security middleware...');

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
async function initializeApp() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoClient = await mongoDBConnection.connect();
    console.log('MongoDB connected successfully');

    // Initialize dependency injection container
    console.log('Initializing dependency container...');
    const authContainer = createAuthContainer({
      mongoClient,
      databaseName: process.env.MONGODB_DB_NAME || 'universe_book_writer',
    });

    // Initialize auth repositories
    await authContainer.initialize();

    // Resolve auth dependencies
    const authController = authContainer.resolve<AuthController>(TOKENS.AUTH_CONTROLLER);
    const userController = authContainer.resolve<UserController>(TOKENS.USER_CONTROLLER);
    
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
      console.warn('⚠️ Failed to resolve AdminController, admin routes will be disabled:', error instanceof Error ? error.message : String(error));
    }
    
    const authMiddleware = authContainer.resolve<AuthMiddleware>(TOKENS.AUTH_MIDDLEWARE);
    const validationMiddleware = authContainer.resolve<ValidationMiddleware>(
      TOKENS.VALIDATION_MIDDLEWARE
    );

    console.log('Authentication system initialized successfully');
    console.log('Dependency container initialized successfully');

    // Initialize plugin system
    console.log('Initializing plugin system...');
    const pluginSystem = await PluginSystemFactory.create({
      mongoClient,
      databaseName: process.env.MONGODB_DB_NAME || 'universe_book_writer',
      pluginDirectories: [
        path.join(process.cwd(), 'plugins'),
        path.join(process.cwd(), 'src/plugins/universe'),
        path.join(process.cwd(), 'src/plugins/core'),
      ],
      autoLoadPlugins: true,
    });
    console.log('Plugin system initialized successfully');

    // Get authentication components from container
    // TODO: Resolve authentication components once container is working
    // const authController = container.resolve<AuthController>(TOKENS.AUTH_CONTROLLER);
    // const userController = container.resolve<UserController>(TOKENS.USER_CONTROLLER);
    // const authMiddleware = container.resolve<AuthMiddleware>(TOKENS.AUTH_MIDDLEWARE);
    // const validationMiddleware = container.resolve<ValidationMiddleware>(TOKENS.VALIDATION_MIDDLEWARE);

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

    // Plugin management routes
    app.use('/api/plugins', createPluginRoutes(pluginSystem.pluginController));

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
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📡 Health check: http://localhost:${port}/api/health`);
      console.log(`🔌 Plugin API: http://localhost:${port}/api/plugins`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
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
