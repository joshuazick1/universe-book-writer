/**
 * Plugin loader for the VerseForge multi-universe book writing assistant
 * Loads and validates plugins from the configured plugin directory
 */

import fs from 'fs/promises';
import path from 'path';

export interface Plugin {
    name: string;
    version: string;
    universe: string;
    rules: any[];
    templates: any[];
}

/**
 * Loads all plugins from the configured plugin directory
 * @returns Array of loaded and validated plugins
 */
export async function loadPlugins(): Promise<Plugin[]> {
    const pluginDir = process.env.PLUGIN_DIR;
    if (!pluginDir) {
        throw new Error('PLUGIN_DIR environment variable not set');
    }

    // Read plugin directory
    const files = await fs.readdir(pluginDir);
    const plugins: Plugin[] = [];

    // Load each plugin
    for (const file of files) {
        if (path.extname(file) === '.json') {
            const pluginPath = path.join(pluginDir, file);
            const content = await fs.readFile(pluginPath, 'utf-8');
            try {
                const plugin = JSON.parse(content) as Plugin;
                await validatePlugin(plugin);
                plugins.push(plugin);
            } catch (error) {
                console.warn(`Failed to load plugin ${file}:`, error);
            }
        }
    }

    return plugins;
}

/**
 * Validates a loaded plugin has all required fields and correct types
 * @param plugin Plugin to validate
 */
async function validatePlugin(plugin: Plugin): Promise<void> {
    const requiredFields = ['name', 'version', 'universe'];
    for (const field of requiredFields) {
        if (!(field in plugin)) {
            throw new Error(`Plugin missing required field: ${field}`);
        }
    }

    if (!Array.isArray(plugin.rules)) {
        throw new Error('Plugin rules must be an array');
    }

    if (!Array.isArray(plugin.templates)) {
        throw new Error('Plugin templates must be an array');
    }
}
