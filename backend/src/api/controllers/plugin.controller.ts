/**
 * Plugin controller - API layer for plugin management endpoints
 */

import { PluginState, PluginType } from '@universe-book-writer/core';
import type { Request, Response } from 'express';
import type { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';

/**
 * Plugin management controller
 */
export class PluginController {
  constructor(private pluginUseCase: PluginUseCase) {}

  /**
   * GET /api/plugins - Get all plugins
   */
  async getAllPlugins(req: Request, res: Response): Promise<void> {
    try {
      const { type, state, includeInactive } = req.query;

      interface PluginListItem {
        name: string;
        version: string;
        type: PluginType;
        state: PluginState;
        description: string;
        author: string;
      }

      let plugins: PluginListItem[];

      if (includeInactive === 'true') {
        // Get all plugins including inactive ones from registry
        const registryEntries = await this.pluginUseCase.getAllAvailablePlugins();
        plugins = registryEntries.map(entry => ({
          name: entry.pluginMetadata.name,
          version: entry.pluginMetadata.version,
          type: entry.pluginMetadata.type,
          state: entry.state,
          description: entry.pluginMetadata.description,
          author: entry.pluginMetadata.author,
        }));
      } else {
        // Get only loaded plugins
        if (type && Object.values(PluginType).includes(type as PluginType)) {
          const loadedPlugins = this.pluginUseCase.getPluginsByType(type as PluginType);
          plugins = loadedPlugins.map(p => ({
            name: p.metadata.name,
            version: p.metadata.version,
            type: p.metadata.type,
            state: p.state,
            description: p.metadata.description,
            author: p.metadata.author,
          }));
        } else {
          const loadedPlugins = this.pluginUseCase.getAllPlugins();
          plugins = loadedPlugins.map(p => ({
            name: p.metadata.name,
            version: p.metadata.version,
            type: p.metadata.type,
            state: p.state,
            description: p.metadata.description,
            author: p.metadata.author,
          }));
        }
      }

      // Filter by state if provided (only for loaded plugins, not inactive ones)
      if (
        state &&
        Object.values(PluginState).includes(state as PluginState) &&
        includeInactive !== 'true'
      ) {
        plugins = plugins.filter(p => p.state === state);
      }

      res.json({
        success: true,
        data: plugins,
        count: plugins.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/plugins/:name - Get plugin details
   */
  async getPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      const status = await this.pluginUseCase.getPluginStatus(name);

      if (!status) {
        res.status(404).json({
          success: false,
          error: `Plugin '${name}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/plugins/load - Load a plugin from path
   */
  async loadPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { path } = req.body;

      if (!path) {
        res.status(400).json({
          success: false,
          error: 'Plugin path is required',
        });
        return;
      }

      const plugin = await this.pluginUseCase.loadPlugin(path);

      res.status(201).json({
        success: true,
        data: {
          name: plugin.metadata.name,
          version: plugin.metadata.version,
          type: plugin.metadata.type,
          state: plugin.state,
          message: 'Plugin loaded successfully',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load plugin',
      });
    }
  }

  /**
   * POST /api/plugins/:name/activate - Activate a plugin
   */
  async activatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      await this.pluginUseCase.activatePlugin(name);

      res.json({
        success: true,
        message: `Plugin '${name}' activated successfully`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate plugin',
      });
    }
  }

  /**
   * POST /api/plugins/:name/deactivate - Deactivate a plugin
   */
  async deactivatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      await this.pluginUseCase.deactivatePlugin(name);

      res.json({
        success: true,
        message: `Plugin '${name}' deactivated successfully`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate plugin',
      });
    }
  }

  /**
   * DELETE /api/plugins/:name - Unload a plugin
   */
  async unloadPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      await this.pluginUseCase.unregister(name);

      res.json({
        success: true,
        message: `Plugin '${name}' unloaded successfully`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unload plugin',
      });
    }
  }

  /**
   * PUT /api/plugins/:name/config - Update plugin configuration
   */
  async updatePluginConfig(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const config = req.body;

      await this.pluginUseCase.updatePluginConfig(name, config);

      res.json({
        success: true,
        message: `Plugin '${name}' configuration updated successfully`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update plugin configuration',
      });
    }
  }

  /**
   * GET /api/plugins/dependencies - Get plugin dependency graph
   */
  async getDependencyGraph(req: Request, res: Response): Promise<void> {
    try {
      const graph = await this.pluginUseCase.getDependencyGraph();

      // Convert Map to object for JSON serialization
      const graphObject = Object.fromEntries(graph);

      res.json({
        success: true,
        data: graphObject,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dependency graph',
      });
    }
  }

  /**
   * POST /api/plugins/validate/:name - Validate plugin dependencies
   */
  async validatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      const plugin = this.pluginUseCase.getPlugin(name);
      if (!plugin) {
        res.status(404).json({
          success: false,
          error: `Plugin '${name}' not found`,
        });
        return;
      }

      const isValid = await this.pluginUseCase.validateDependencies(plugin);

      res.json({
        success: true,
        data: {
          valid: isValid,
          plugin: name,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate plugin',
      });
    }
  }

  /**
   * POST /api/plugins/reload-all - Reload all plugins from registry
   */
  async reloadAllPlugins(req: Request, res: Response): Promise<void> {
    try {
      await this.pluginUseCase.loadAllPlugins();

      const plugins = this.pluginUseCase.getAllPlugins();

      res.json({
        success: true,
        message: 'All plugins reloaded successfully',
        data: {
          loaded: plugins.length,
          plugins: plugins.map(p => ({
            name: p.metadata.name,
            state: p.state,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reload plugins',
      });
    }
  }
}
