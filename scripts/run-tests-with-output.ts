#!/usr/bin/env node

/**
 * Enhanced Test Runner with Output Management - Modular Version
 *
 * Features:
 * - Uses modular test runner architecture from scripts/test-runner/
 * - Maintains all existing CLI compatibility and features
 * - Enhanced with plugin system and better error handling
 *
 * Usage:
 *   npx tsx scripts/run-tests-with-output.ts [options] [target] [pattern]
 *
 * Examples:
 *   npx tsx scripts/run-tests-with-output.ts --all
 *   npx tsx scripts/run-tests-with-output.ts backend
 *   npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button"
 *   npx tsx scripts/run-tests-with-output.ts --comment "Fixing auth bug" backend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import modular test runner components
import { loadConfig } from './test-runner/config.js';
import { loadPlugins, Plugin } from './test-runner/plugins.js';
import { executeSuite, ExecutionResult } from './test-runner/executor/index.js';
import { reportToConsole } from './test-runner/reporters/consoleReporter.js';
import { saveLog, rotateLogs } from './test-runner/logs/logManager.js';
import { processCoverage } from './test-runner/coverage/coverageManager.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestRunOptions {
  target: string;
  pattern: string | null;
  testPathPattern: string | null;
  comment: string | null;
  coverage: boolean;
  watch: boolean;
  verbose: boolean;
  passthroughArgs: string[];
  ci: boolean;
  json: boolean;
}

interface TestSummary {
  timestamp: string;
  target: string;
  pattern: string | null;
  testPathPattern: string | null;
  comment: string | null;
  duration: number;
  exitCode: number;
  results: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  files: string[];
  coverageFile?: string;
  targets?: TestSummary[]; // For aggregate 'all' results
}

class ModularTestRunner {
  private projectRoot: string;
  private testResultsDir: string;
  private maxLogDirs: number = 10;

  constructor() {
    // Find and change to project root directory
    this.projectRoot = this.findProjectRoot();
    process.chdir(this.projectRoot);
    this.testResultsDir = path.join(this.projectRoot, 'test-results');
  }

  /**
   * Find the project root by looking for package.json with monorepo structure
   */
  private findProjectRoot(): string {
    let currentDir = process.cwd();

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

          // Check if this is the monorepo root by looking for our specific structure
          if (
            packageJson.name === 'verseforge' ||
            (packageJson.workspaces && Array.isArray(packageJson.workspaces)) ||
            (fs.existsSync(path.join(currentDir, 'frontend')) &&
              fs.existsSync(path.join(currentDir, 'backend')) &&
              fs.existsSync(path.join(currentDir, 'scripts')))
          ) {
            console.log(`📁 Found project root: ${currentDir}`);
            return currentDir;
          }
        } catch (error) {
          // Continue searching if package.json is invalid
        }
      }

      currentDir = path.dirname(currentDir);
    }

    // Fallback to current directory if no root found
    console.warn('⚠️  Could not find project root, using current directory');
    return process.cwd();
  }

  /**
   * Parse command line arguments using enhanced options parsing
   */
  parseArgs(): TestRunOptions & { ci: boolean; json: boolean } {
    // Support npm passthrough: npm run test -- frontend --pattern "Button" --runInBand
    let args = process.argv.slice(2);
    const doubleDashIdx = args.indexOf('--');
    let passthroughArgs: string[] = [];
    if (doubleDashIdx !== -1) {
      passthroughArgs = args.slice(doubleDashIdx + 1);
      args = args.slice(0, doubleDashIdx);
    }

    const options: TestRunOptions & { ci: boolean; json: boolean } = {
      target: 'all',
      pattern: null,
      testPathPattern: null,
      comment: null,
      coverage: false,
      watch: false,
      verbose: false,
      passthroughArgs,
      ci: false,
      json: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--ci':
          options.ci = true;
          break;
        case '--json':
          options.json = true;
          break;
        case '--comment':
        case '-c':
          options.comment = args[++i];
          break;
        case '--pattern':
        case '-p':
          options.pattern = args[++i];
          break;
        case '--test-path-pattern':
        case '--file':
        case '-f':
          options.testPathPattern = args[++i];
          break;
        case '--coverage':
          options.coverage = true;
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--all':
          options.target = 'all';
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (
            !arg.startsWith('--') &&
            [
              'backend',
              'frontend',
              'ai-server',
              'collaboration-server',
              'packages',
              'e2e',
            ].includes(arg)
          ) {
            options.target = arg;
          } else if (!arg.startsWith('--') && !options.pattern && !options.testPathPattern) {
            // If no flags are set, treat as a pattern first
            options.pattern = arg;
          } else if (arg.startsWith('--')) {
            // Forward unknown flags to Jest
            options.passthroughArgs.push(arg);
            // If next arg is not a flag, treat as value
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
              options.passthroughArgs.push(args[++i]);
            }
          }
          break;
      }
    }
    return options;
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.log(`
Enhanced Test Runner with Output Management - Modular Version

Usage: npx tsx scripts/run-tests-with-output.ts [options] [target] [pattern]

Targets:
  all                    Run all available test targets sequentially (default)
  backend               Run backend tests only
  frontend              Run frontend tests only
  ai-server             Run AI server tests only
  collaboration-server  Run collaboration server tests only
  packages              Run package tests only
  shared                Run shared utilities/types tests only
  e2e                   Run end-to-end tests only

Options:
  -c, --comment <text>      Add a comment to the test run
  -p, --pattern <text>      Run tests matching test name pattern (within test files)
  -f, --file <text>         Run tests matching file path pattern (test file paths)
  --test-path-pattern <text> Same as --file (Jest option)
  --coverage               Generate coverage report
  -w, --watch              Run tests in watch mode
  -v, --verbose            Verbose output
  -h, --help               Show this help
  --ci                     CI-friendly output (prints summary.json to stdout)
  --json                   Print summary as JSON to stdout

Pattern Matching:
  --pattern: Matches test names/descriptions within test files (e.g., "should validate user")
  --file: Matches test file paths (e.g., "auth" matches auth.test.ts, user-auth.test.ts)

Behavior Notes:
  - Uses modular test runner architecture with plugin system
  - Each target runs from its own directory sequentially
  - Each target maintains separate test output logs and results
  - Final summary aggregates results from all targets
  - Failed targets don't stop execution of remaining targets
  
Examples:
  npx tsx scripts/run-tests-with-output.ts --all
  npx tsx scripts/run-tests-with-output.ts backend
  npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button"
  npx tsx scripts/run-tests-with-output.ts frontend --file "auth"
  npx tsx scripts/run-tests-with-output.ts backend --pattern "should validate" --file "user"
  npx tsx scripts/run-tests-with-output.ts -c "Fixing auth bug" backend
  npx tsx scripts/run-tests-with-output.ts --coverage
`);
  }

  /**
   * Discover test suites for given targets using modular approach
   */
  private discoverTestSuites(targets: string[]): string[] {
    const suites: string[] = [];
    for (const target of targets) {
      const targetPath = path.join(this.projectRoot, target);
      if (!fs.existsSync(targetPath)) continue;

      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (/\.test\.(ts|js|tsx|jsx)$/.test(entry.name)) {
            suites.push(fullPath);
          }
        }
      };
      walk(targetPath);
    }
    return suites;
  }

  /**
   * Main execution method using modular test runner
   */
  async run(): Promise<void> {
    const options = this.parseArgs();

    console.log('🚀 Enhanced Test Runner Starting (Modular Architecture)...');

    // Load configuration and plugins using modular approach
    const config = loadConfig(options);
    const plugins: Plugin[] = loadPlugins(config, options);

    console.log(`⚙️  Configuration loaded`);
    console.log(`🔌 Loaded ${plugins.length} plugins`);

    // Setup output directory with timestamp
    const outputDir = path.join(this.testResultsDir, `run_${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').slice(0, 19)}`);

    // Rotate old logs
    rotateLogs(this.testResultsDir, this.maxLogDirs);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📁 Test results will be saved to: ${path.relative(this.projectRoot, outputDir)}`);

    // Determine target directories
    const targetDirs = options.target === 'all'
      ? ['backend', 'frontend', 'ai-server', 'collaboration-server', 'packages', 'shared', 'e2e']
      : [options.target];

    // Discover test suites
    const suites = this.discoverTestSuites(targetDirs);

    if (suites.length === 0) {
      console.log('❌ No test suites found.');
      return;
    }

    console.log(`🔍 Discovered ${suites.length} test suites in targets: ${targetDirs.join(', ')}`);

    // Execute test suites using modular executor
    const results: ExecutionResult[] = [];
    const startTime = Date.now();

    for (const suite of suites) {
      console.log(`\n🧪 Running suite: ${path.relative(this.projectRoot, suite)}`);

      // Prepare execution options
      const executionOptions = {
        retries: 0,
        testNamePattern: options.pattern,
        testPathPattern: options.testPathPattern,
        coverage: options.coverage,
        watch: options.watch,
        verbose: options.verbose,
        ...options.passthroughArgs.reduce((acc, arg, index, arr) => {
          if (arg.startsWith('--')) {
            const key = arg.replace('--', '');
            const value = arr[index + 1] && !arr[index + 1].startsWith('--') ? arr[index + 1] : true;
            acc[key] = value;
          }
          return acc;
        }, {} as any)
      };

      // Execute the suite
      const result = await executeSuite(suite, executionOptions, plugins);
      results.push(result);

      // Save log for this suite
      saveLog(suite, result.output, outputDir);

      // Process coverage if enabled
      if (options.coverage) {
        processCoverage(suite, outputDir);
      }

      // Print immediate feedback
      const statusEmoji = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      console.log(`${statusEmoji} ${result.status.toUpperCase()} (${result.duration}ms, ${result.retries} retries)`);
    }

    const totalDuration = Date.now() - startTime;

    // Generate summary using modular reporter
    if (!options.ci && !options.json) {
      console.log('\n📊 Final Results:');
      reportToConsole(results);
    }

    // Create summary object
    const summary: TestSummary = {
      timestamp: new Date().toISOString(),
      target: options.target,
      pattern: options.pattern,
      testPathPattern: options.testPathPattern,
      comment: options.comment,
      duration: totalDuration,
      exitCode: results.some(r => r.status === 'failed') ? 1 : 0,
      results: {
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        total: results.length
      },
      files: results.map(r => path.relative(this.projectRoot, r.suite)),
      coverageFile: options.coverage ? path.join(outputDir, 'coverage', 'lcov.info') : undefined
    };

    // Write summary.json
    const summaryPath = path.join(outputDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Output for CI/JSON modes
    if (options.ci || options.json) {
      console.log('CI_SUMMARY_JSON_START');
      console.log(JSON.stringify(summary, null, 2));
      console.log('CI_SUMMARY_JSON_END');
    }

    console.log(`\n📊 Summary written to: ${path.relative(this.projectRoot, summaryPath)}`);
    console.log(`⏱️  Total duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`🎉 Modular test runner completed successfully!`);

    // Exit with appropriate code
    process.exit(summary.exitCode);
  }
}

// Entry point - create and run the modular test runner
// Handle Windows path formatting differences between import.meta.url and process.argv[1]
const currentScriptPath = import.meta.url;
const expectedPath = `file://${process.argv[1].replace(/\\/g, '/')}`;
const isMainModule = currentScriptPath === expectedPath ||
  currentScriptPath.endsWith(path.basename(process.argv[1] || ''));

if (isMainModule) {
  console.log('🚀 Starting modular test runner...');
  const runner = new ModularTestRunner();
  runner.run().catch((error) => {
    console.error('❌ Modular test runner failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
}
