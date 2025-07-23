/**
 * Simple Core Plugin   public config = {
    enabled: true,
    settings: {
      debugMode: false,
      timeout: 5000
    }
  };mple implementation
 */
import { type Plugin, PluginState, PluginType, type PluginConfig } from '@universe-book-writer/core';
export declare const metadata: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    keywords: string[];
    type: PluginType;
    dependencies: Record<string, string>;
    engines: {
        node: string;
    };
};
/**
 * Simple Core Plugin Implementation
 */
export default class SimpleCorePlugin implements Plugin {
    readonly metadata: {
        name: string;
        version: string;
        description: string;
        author: string;
        license: string;
        keywords: string[];
        type: PluginType;
        dependencies: Record<string, string>;
        engines: {
            node: string;
        };
    };
    state: PluginState;
    config: {
        enabled: boolean;
        settings: {
            debugMode: boolean;
            timeout: number;
        };
    };
    private initializationTime;
    private activationCount;
    /**
     * Initialize the plugin
     */
    initialize(): Promise<void>;
    /**
     * Activate the plugin
     */
    activate(): Promise<void>;
    /**
     * Deactivate the plugin
     */
    deactivate(): Promise<void>;
    /**
     * Destroy the plugin
     */
    destroy(): Promise<void>;
    /**
     * Check if plugin can be activated
     */
    canActivate(): boolean;
    /**
     * Check if plugin can be deactivated
     */
    canDeactivate(): boolean;
    /**
     * Validate plugin configuration
     */
    validateConfig(config: PluginConfig): Promise<boolean>;
    /**
     * Update plugin configuration
     */
    updateConfig(newConfig: Partial<typeof this.config>): Promise<void>;
    /**
     * Get plugin statistics
     */
    getStats(): {
        initializationTime: number;
        activationCount: number;
        state: PluginState;
        uptime: number;
    };
    /**
     * Test method for validation
     */
    testMethod(input: string): string;
    private simulateAsyncWork;
    private cleanup;
}
//# sourceMappingURL=simple-core.plugin.d.ts.map