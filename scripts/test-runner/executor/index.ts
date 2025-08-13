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
 * Updated to work with Jest projects and proper test discovery.
 */
function runJestForSuite(
    suitePath: string,
    options: { jestBin?: string; testNamePattern?: string; testPathPattern?: string;[key: string]: any }
): Promise<{ output: string; status: 'passed' | 'failed' | 'skipped'; duration: number; error?: Error }> {
    return new Promise((resolve, reject) => {
        // Use the correct Jest command for this project
        let jestCommand = options.jestBin;
        if (!jestCommand) {
            // Use the same Jest command as the project's test:console script
            jestCommand = 'node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js';
        }

        // Build Jest arguments
        const args = ['--runInBand', '--forceExit', '--detectOpenHandles'];

        // Determine which project this suite belongs to
        const projectMap: Record<string, string> = {
            'backend': 'backend',
            'frontend': 'frontend',
            'ai-server': 'ai-server',
            'collaboration-server': 'collaboration-server',
            'packages': 'packages',
            'shared': 'shared',
            'e2e': 'e2e'
        };

        // Find the project for this suite
        let targetProject = 'backend'; // default
        for (const [projectName, projectPath] of Object.entries(projectMap)) {
            if (suitePath.includes(projectPath)) {
                targetProject = projectName;
                break;
            }
        }

        // Add the project filter
        args.push('--selectProjects', targetProject);

        // Create a more specific test pattern from the file path
        const fileName = suitePath.split(/[/\\]/).pop()?.replace(/\.test\.(ts|js)$/, '') || '';

        // Use a simpler pattern that matches what we tested manually
        if (fileName) {
            args.push('--testPathPattern', fileName);
        }

        // Add verbose output if requested
        if (options.verbose) {
            args.push('--verbose');
        }

        if (options.testNamePattern) {
            args.push('--testNamePattern', options.testNamePattern);
        }

        // Add timeout to prevent hanging
        args.push('--testTimeout', '30000');

        console.log(`🔍 Executing: ${jestCommand} ${args.join(' ')}`);
        console.log(`📁 Target project: ${targetProject}, file pattern: ${fileName}`);

        const start = Date.now();

        // Split the command into command and initial args
        const [command, ...commandArgs] = jestCommand.split(' ');
        const allArgs = [...commandArgs, ...args];

        const proc = spawn(command, allArgs, {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: process.cwd()
        });

        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
            console.log(`⏰ Test timeout for: ${fileName}`);
            proc.kill('SIGTERM');
        }, 60000); // 60 second timeout

        let output = '';
        proc.stdout.on('data', d => (output += d.toString()));
        proc.stderr.on('data', d => (output += d.toString()));

        proc.on('close', code => {
            clearTimeout(timeout);
            const duration = Date.now() - start;

            // Enhanced output parsing for Jest results
            let status: 'passed' | 'failed' | 'skipped' = 'failed';

            if (output.includes('No tests found')) {
                status = 'skipped';
                console.log(`⏭️ No tests found for: ${fileName}`);
            } else if (/Tests:\s+\d+\s+passed/i.test(output) && !/Tests:\s+\d+\s+failed/i.test(output)) {
                status = 'passed';
                console.log(`✅ Tests passed for: ${fileName}`);
            } else if (/Tests:\s+\d+\s+failed/i.test(output)) {
                status = 'failed';
                console.log(`❌ Tests failed for: ${fileName}`);
            } else if (code === 0) {
                status = 'passed';
                console.log(`✅ Exit code 0 for: ${fileName}`);
            } else {
                status = 'failed';
                console.log(`❌ Exit code ${code} for: ${fileName}`);
            }

            resolve({ output, status, duration, error: code !== 0 ? new Error(`Jest exited with code ${code}`) : undefined });
        });

        proc.on('error', err => {
            console.error(`🚨 Spawn error for ${fileName}:`, err);
            reject(err);
        });
    });
}
