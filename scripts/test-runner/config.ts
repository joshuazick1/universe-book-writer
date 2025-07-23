// config.ts
// Config loading and validation for the modular test runner

export interface RunnerConfig {
    outputDir?: string;
    reporter?: string;
    parallel?: number;
    [key: string]: any;
}

export function loadConfig(options: any): RunnerConfig {
    // TODO: Load config from file (e.g., test-runner.config.ts/json/yaml) and merge with CLI options
    // For now, just return CLI options
    return { ...options };
}
