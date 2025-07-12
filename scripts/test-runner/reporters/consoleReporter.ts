// reporters/consoleReporter.ts
// Console reporter for the modular test runner

import { ExecutionResult } from '../executor/index.js';

export function reportToConsole(results: ExecutionResult[]): void {
    let passed = 0, failed = 0, skipped = 0;
    results.forEach(result => {
        let symbol = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
        let color = result.status === 'passed' ? '\x1b[32m' : result.status === 'failed' ? '\x1b[31m' : '\x1b[33m';
        console.log(`${color}${symbol} [${result.status.toUpperCase()}]\x1b[0m ${result.suite} (${result.duration}ms)`);
        if (result.status === 'passed') passed++;
        else if (result.status === 'failed') failed++;
        else skipped++;
        if (result.status === 'failed' && result.output) {
            console.log('\x1b[31m--- Failure Output ---\x1b[0m');
            console.log(result.output.slice(0, 1000)); // Print first 1000 chars
            if (result.output.length > 1000) console.log('...output truncated...');
        }
    });
    console.log('\n--- Test Summary ---');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`Total: ${results.length}`);
}
