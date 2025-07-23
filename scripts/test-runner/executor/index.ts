// executor/index.ts
// Test execution, retries, and output collection for the modular test runner

import { spawn } from 'child_process';
import { Plugin } from '../plugins.js';

export interface ExecutionResult {
    suite: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    output: string;
    retries: number;
    error?: Error;
}

/**
 * Execute a test suite (file) with retries and plugin hooks.
 */
export async function executeSuite(
    suitePath: string,
    options: { retries?: number; jestBin?: string; testNamePattern?: string;[key: string]: any },
    plugins: Plugin[]
): Promise<ExecutionResult> {
    const maxRetries = options.retries ?? 0;
    let attempt = 0;
    let lastError: Error | undefined;
    let output = '';
    let status: 'passed' | 'failed' | 'skipped' = 'failed';
    let start = Date.now();
    let duration = 0;

    for (; attempt <= maxRetries; attempt++) {
        plugins.forEach(p => p.onSuiteStart?.(suitePath));
        try {
            const result = await runJestForSuite(suitePath, options);
            output = result.output;
            duration = result.duration;
            status = result.status;
            if (status === 'passed' || status === 'skipped') {
                plugins.forEach(p => p.onSuiteEnd?.(suitePath, { status, output, duration, attempt }));
                return { suite: suitePath, status, duration, output, retries: attempt };
            }
            // else, failed: try again if allowed
            lastError = result.error;
        } catch (err: any) {
            lastError = err;
            output = err?.message || String(err);
            duration = Date.now() - start;
        }
        plugins.forEach(p => p.onSuiteEnd?.(suitePath, { status: 'failed', output, duration, attempt }));
    }
    return {
        suite: suitePath,
        status: 'failed',
        duration,
        output,
        retries: attempt - 1,
        error: lastError
    };
}

/**
 * Actually spawn Jest for a single suite (test file).
 */
function runJestForSuite(
    suitePath: string,
    options: { jestBin?: string; testNamePattern?: string;[key: string]: any }
): Promise<{ output: string; status: 'passed' | 'failed' | 'skipped'; duration: number; error?: Error }> {
    return new Promise((resolve, reject) => {
        const jestBin = options.jestBin || 'node_modules/.bin/jest';
        const args = [suitePath, '--runInBand', '--forceExit', '--detectOpenHandles'];
        if (options.testNamePattern) {
            args.push('--testNamePattern', options.testNamePattern);
        }
        const start = Date.now();
        const proc = spawn(jestBin, args, { shell: true });
        let output = '';
        proc.stdout.on('data', d => (output += d.toString()));
        proc.stderr.on('data', d => (output += d.toString()));
        proc.on('close', code => {
            const duration = Date.now() - start;
            // Parse output for pass/fail/skipped
            let status: 'passed' | 'failed' | 'skipped' = 'failed';
            if (/\bPASS\b/.test(output)) status = 'passed';
            else if (/\bSKIP\b|skipped/.test(output)) status = 'skipped';
            else status = 'failed';
            if (code === 0 && status === 'passed') {
                resolve({ output, status, duration });
            } else {
                resolve({ output, status, duration, error: new Error('Test failed') });
            }
        });
        proc.on('error', err => {
            reject(err);
        });
    });
}
