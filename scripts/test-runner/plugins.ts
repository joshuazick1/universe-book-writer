// plugins.ts
// Plugin loader and interface for the modular test runner

export interface Plugin {
    name: string;
    onPreRun?: () => void;
    onPostRun?: () => void;
    onSuiteStart?: (suite: string) => void;
    onSuiteEnd?: (suite: string, result: any) => void;
    // ...more hooks as needed
}

export function loadPlugins(config: any, options: any): Plugin[] {
    // TODO: Discover and load plugins based on config/options
    // For now, return an empty array
    return [];
}
