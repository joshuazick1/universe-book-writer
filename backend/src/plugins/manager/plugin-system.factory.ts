/**
 * Plugin manager factory - Creates and configures the plugin management system
 */

import { MongoClient } from 'mongodb';
import { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';
import { PluginDomainService } from '../../core/services/plugin.domain.service.js';
import { MongoPluginRepository } from '../../infrastructure/persistence/mongo-plugin.repository.js';
import { FileSystemPluginLoader } from '../../infrastructure/loaders/plugin.loader.js';
import { PluginController } from '../../api/controllers/plugin.controller.js';

/**
 * Plugin system configuration
 */
export interface PluginSystemConfig {
  mongoClient: MongoClient;
  databaseName?: string;
  pluginDirectories?: string[];
  autoLoadPlugins?: boolean;
}

/**
 * Plugin system factory
 */
export class PluginSystemFactory {
  /**
   * Create and configure the complete plugin management system
   */
  static async create(config: PluginSystemConfig): Promise<{
    pluginUseCase: PluginUseCase;
    pluginController: PluginController;
    repository: MongoPluginRepository;
  }> {
    // Create repository
    const repository = new MongoPluginRepository(config.mongoClient, config.databaseName);

    // Initialize repository (create indexes)
    await repository.initialize();

    // Create domain service
    const domainService = new PluginDomainService(repository);

    // Create loader
    const loader = new FileSystemPluginLoader();

    // Create use case
    const pluginUseCase = new PluginUseCase(repository, domainService, loader);

    // Create controller
    const pluginController = new PluginController(pluginUseCase);

    // Auto-load plugins if requested
    if (config.autoLoadPlugins) {
      await pluginUseCase.loadAllPlugins();
    }

    return {
      pluginUseCase,
      pluginController,
      repository,
    };
  }

  /**
   * Load plugins from directories
   */
  static async loadPluginsFromDirectories(
    pluginUseCase: PluginUseCase,
    directories: string[]
  ): Promise<void> {
    const loader = new FileSystemPluginLoader();

    for (const directory of directories) {
      try {
        const plugins = await loader.loadFromDirectory(directory);

        for (const plugin of plugins) {
          try {
            await pluginUseCase.register(plugin);
            console.log(`Loaded plugin: ${plugin.metadata.name}@${plugin.metadata.version}`);
          } catch (error) {
            console.error(`Failed to register plugin ${plugin.metadata.name}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to load plugins from directory ${directory}:`, error);
      }
    }
  }
}
