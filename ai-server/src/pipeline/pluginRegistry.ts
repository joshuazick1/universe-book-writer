/**
 * Plugin/Extension Registry for Universe-Specific Pipeline Logic
 *
 * This registry allows dynamic registration and lookup of universe-specific plugins
 * (e.g., Star Trek, Star Wars, custom universes) for pipeline steps, validation, and customization.
 *
 * Plugins can override or extend default pipeline step behavior, validation, and context enrichment.
 */

import type { PipelineStep, PipelineContext } from './types.js';

export interface UniversePlugin {
    /** Optional: Override or extend pipeline steps by name */
    steps?: Partial<Record<string, PipelineStep<any, any>>>;
    /** Optional: Universe-specific validation for nodes/entities */
    validateNode?: (node: any, context: PipelineContext) => Promise<void>;
    /** Optional: Add/override context fields for this universe */
    extendContext?: (context: PipelineContext) => Promise<PipelineContext>;
    /** Optional: Universe-specific config or metadata */
    config?: Record<string, unknown>;
}

/**
 * Plugin registry singleton
 */
class PluginRegistry {
    private plugins: Map<string, UniversePlugin> = new Map();

    /** Register a plugin for a universe (by universeId or key) */
    register(universeKey: string, plugin: UniversePlugin) {
        this.plugins.set(universeKey, plugin);
    }

    /** Get a plugin for a universe, or undefined if none registered */
    get(universeKey: string): UniversePlugin | undefined {
        return this.plugins.get(universeKey);
    }

    /** List all registered universe keys */
    list(): string[] {
        return Array.from(this.plugins.keys());
    }
}

export const pluginRegistry = new PluginRegistry();

/**
 * Example usage:
 *
 * import { pluginRegistry } from './pluginRegistry';
 *
 * pluginRegistry.register('star-trek', {
 *   steps: {
 *     aiEntityExtraction: customStarTrekEntityExtractor,
 *   },
 *   validateNode: async (node, context) => { ... },
 *   config: { ... }
 * });
 *
 * // In pipeline runner:
 * const plugin = pluginRegistry.get(context.submission.universeId);
 * if (plugin?.steps?.[stepName]) {
 *   await plugin.steps[stepName](input, context);
 * } else {
 *   await defaultStep(input, context);
 * }
 */
