// core.ts
// Orchestration, CLI parsing, and plugin loading for the modular test runner

import { loadConfig } from './config.js';
import { loadPlugins, Plugin } from './plugins.js';
import { executeSuite, ExecutionResult } from './executor/index.js';
import { reportToConsole } from './reporters/consoleReporter.js';
import { saveLog, rotateLogs } from './logs/logManager.js';
import { processCoverage } from './coverage/coverageManager.js';
import fs from 'fs';
import path from 'path';

export interface RunnerOptions {
    parallel?: number;
    outputDir?: string;
    reporter?: string;
    tag?: string[];
    excludeTag?: string[];
    retries?: number;
    interactive?: boolean;
    [key: string]: any;
}

function parseArgs(argv: string[]): RunnerOptions {
    // Minimal CLI arg parsing for demo; expand as needed
    const options: RunnerOptions = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--parallel') options.parallel = parseInt(argv[++i]);
        else if (arg === '--output-dir') options.outputDir = argv[++i];
        else if (arg === '--reporter') options.reporter = argv[++i];
        else if (arg === '--tag') (options.tag ||= []).push(argv[++i]);
        else if (arg === '--exclude-tag') (options.excludeTag ||= []).push(argv[++i]);
        else if (arg === '--retries') options.retries = parseInt(argv[++i]);
        else if (arg === '--interactive') options.interactive = true;
        // Add more as needed
    }
    return options;
}

function discoverTestSuites(targetDirs: string[]): string[] {
    // Recursively find *.test.ts, *.test.js, *.test.tsx, *.test.jsx in targetDirs
    const suites: string[] = [];
    for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) continue;
        const walk = (d: string) => {
            for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                const full = path.join(d, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (/\.test\.(ts|js|tsx|jsx)$/.test(entry.name)) suites.push(full);
            }
        };
        walk(dir);
    }
    return suites;
}

export async function main(argv: string[]) {
    const options = parseArgs(argv);
    const config = loadConfig(options);
    const plugins: Plugin[] = loadPlugins(config, options);
    const outputDir = config.outputDir || path.join(process.cwd(), 'test-results', `run_${Date.now()}`);
    rotateLogs(path.dirname(outputDir), 10);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // For demo, hardcode targets; in real use, discover from config or CLI
    const targetDirs = ['backend', 'frontend', 'ai-server', 'collaboration-server', 'packages', 'shared', 'e2e'].map(t => path.join(process.cwd(), t));
    const suites = discoverTestSuites(targetDirs);
    if (suites.length === 0) {
        console.log('No test suites found.');
        return;
    }
    console.log(`Discovered ${suites.length} test suites.`);

    const results: ExecutionResult[] = [];
    for (const suite of suites) {
        const result = await executeSuite(suite, options, plugins);
        results.push(result);
        saveLog(suite, result.output, outputDir);
        processCoverage(suite, outputDir);
    }

    if (options.reporter === 'console' || !options.reporter) {
        reportToConsole(results);
    }
    // TODO: Add support for other reporters/plugins

    // Write summary.json
    const summary = {
        timestamp: new Date().toISOString(),
        results,
        outputDir,
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length
    };
    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(`\nSummary written to: ${path.join(outputDir, 'summary.json')}`);
}

// Entry point for CLI
if (process.argv[1] && process.argv[1].endsWith('core.ts')) {
    main(process.argv.slice(2));
}
