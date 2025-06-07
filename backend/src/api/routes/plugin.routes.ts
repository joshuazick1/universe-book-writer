/**
 * Plugin routes - API routing for plugin management
 */

import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller.js';

/**
 * Create plugin routes
 */
export function createPluginRoutes(pluginController: PluginController): Router {
  const router = Router();

  // Get all plugins
  router.get('/', (req, res) => pluginController.getAllPlugins(req, res));

  // Get plugin details
  router.get('/:name', (req, res) => pluginController.getPlugin(req, res));

  // Load plugin from path
  router.post('/load', (req, res) => pluginController.loadPlugin(req, res));

  // Activate plugin
  router.post('/:name/activate', (req, res) => pluginController.activatePlugin(req, res));

  // Deactivate plugin
  router.post('/:name/deactivate', (req, res) => pluginController.deactivatePlugin(req, res));

  // Unload plugin
  router.delete('/:name', (req, res) => pluginController.unloadPlugin(req, res));

  // Update plugin configuration
  router.put('/:name/config', (req, res) => pluginController.updatePluginConfig(req, res));

  // Get dependency graph
  router.get('/system/dependencies', (req, res) => pluginController.getDependencyGraph(req, res));

  // Validate plugin
  router.post('/:name/validate', (req, res) => pluginController.validatePlugin(req, res));

  // Reload all plugins
  router.post('/system/reload', (req, res) => pluginController.reloadAllPlugins(req, res));

  return router;
}
