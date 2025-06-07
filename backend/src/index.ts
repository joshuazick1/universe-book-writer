import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { createPluginRoutes } from './api/routes/plugin.routes.js';
import { mongoDBConnection } from './config/mongodb.config.js';
import { PluginSystemFactory } from './plugins/manager/plugin-system.factory.js';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the application
async function initializeApp() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoClient = await mongoDBConnection.connect();
    console.log('MongoDB connected successfully');

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

    // Setup routes
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        pluginCount: pluginSystem.pluginUseCase.getAllPlugins().length,
      });
    });

    // Plugin management routes
    app.use('/api/plugins', createPluginRoutes(pluginSystem.pluginController));

    // Global error handling middleware
    app.use(
      (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
