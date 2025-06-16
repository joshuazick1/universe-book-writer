#!/usr/bin/env node

/**
 * Enhanced Test Runner with Output Management
 *
 * Features:
 * - Breaks output into manageable sizes (separate files per test suite)
 * - Strips ANSI encoding from saved output
 * - Implements log rotation (keeps only recent test runs)
 * - Supports individual test/pattern execution
 * - Creates timestamped subdirectories for organization
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

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestRunOptions {
  target: string;
  pattern: string | null;
  comment: string | null;
  coverage: boolean;
  watch: boolean;
  verbose: boolean;
}

interface TestRunMetadata {
  timestamp: string;
  target: string;
  pattern: string | null;
  comment: string | null;
  coverage: boolean;
  watch: boolean;
  nodeVersion: string;
  platform: string;
  cwd: string;
}

interface TestSummary {
  timestamp: string;
  target: string;
  pattern: string | null;
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
}

interface LogEntry {
  name: string;
  path: string;
  mtime: Date;
}

class TestRunner {
  private testResultsDir: string;
  private maxLogDirs: number;
  private currentRunDir: string | null;
  private testSuiteOutputs: Map<string, string>;
  private currentTestSuite: string | null;
  private totalTests: number;
  private passedTests: number;
  private failedTests: number;
  private skippedTests: number;
  private projectRoot: string;

  constructor() {
    // Find and change to project root directory
    this.projectRoot = this.findProjectRoot();
    process.chdir(this.projectRoot);

    this.testResultsDir = path.join(this.projectRoot, 'test-results');
    this.maxLogDirs = 10; // Keep only last 10 test runs
    this.currentRunDir = null;
    this.testSuiteOutputs = new Map();
    this.currentTestSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
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
            packageJson.name === 'universe-book-writer' ||
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
   * Parse command line arguments
   */
  parseArgs(): TestRunOptions {
    const args = process.argv.slice(2);
    const options: TestRunOptions = {
      target: 'all',
      pattern: null,
      comment: null,
      coverage: false,
      watch: false,
      verbose: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--comment':
        case '-c':
          options.comment = args[++i];
          break;
        case '--pattern':
        case '-p':
          options.pattern = args[++i];
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
          } else if (!arg.startsWith('--') && !options.pattern) {
            options.pattern = arg;
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
Enhanced Test Runner with Output Management

Usage: npx tsx scripts/run-tests-with-output.ts [options] [target] [pattern]

Targets:
  all                    Run all tests (default)
  backend               Run backend tests only
  frontend              Run frontend tests only
  ai-server             Run AI server tests only
  collaboration-server  Run collaboration server tests only
  packages              Run package tests only
  e2e                   Run end-to-end tests only

Options:
  -c, --comment <text>   Add a comment to the test run
  -p, --pattern <text>   Run tests matching pattern
  --coverage            Generate coverage report
  -w, --watch           Run tests in watch mode
  -v, --verbose         Verbose output
  -h, --help            Show this help

Examples:
  npx tsx scripts/run-tests-with-output.ts --all
  npx tsx scripts/run-tests-with-output.ts backend
  npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button"
  npx tsx scripts/run-tests-with-output.ts -c "Fixing auth bug" backend
  npx tsx scripts/run-tests-with-output.ts --coverage
`);
  }

  /**
   * Strip ANSI escape codes from text
   */
  stripAnsi(text: string): string {
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
  }

  /**
   * Create timestamped directory for current test run
   */
  setupTestRunDirectory(): void {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-').slice(0, 19); // Format: 2025-06-14T10-30-45

    this.currentRunDir = path.join(this.testResultsDir, `run_${timestamp}`);

    // Ensure test results directory exists
    if (!fs.existsSync(this.testResultsDir)) {
      fs.mkdirSync(this.testResultsDir, { recursive: true });
    }
    // Create current run directory
    fs.mkdirSync(this.currentRunDir, { recursive: true });

    console.log(
      `📁 Test results will be saved to: ${path.relative(this.projectRoot, this.currentRunDir)}`
    );
  }

  /**
   * Implement log rotation - keep only recent test runs
   */
  rotateLogDirectories(): void {
    if (!fs.existsSync(this.testResultsDir)) return;

    const entries: LogEntry[] = fs
      .readdirSync(this.testResultsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('run_'))
      .map(entry => ({
        name: entry.name,
        path: path.join(this.testResultsDir, entry.name),
        mtime: fs.statSync(path.join(this.testResultsDir, entry.name)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by modification time, newest first

    // Remove old directories if we exceed the limit
    if (entries.length >= this.maxLogDirs) {
      const toRemove = entries.slice(this.maxLogDirs - 1); // Keep maxLogDirs - 1, remove the rest

      for (const entry of toRemove) {
        try {
          fs.rmSync(entry.path, { recursive: true, force: true });
          console.log(`🗑️  Removed old test run: ${entry.name}`);
        } catch (error) {
          console.warn(`⚠️  Could not remove ${entry.name}: ${(error as Error).message}`);
        }
      }
    }
  }

  /**
   * Create test run metadata file
   */
  createRunMetadata(options: TestRunOptions): void {
    if (!this.currentRunDir) return;

    const metadata: TestRunMetadata = {
      timestamp: new Date().toISOString(),
      target: options.target,
      pattern: options.pattern,
      comment: options.comment,
      coverage: options.coverage,
      watch: options.watch,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    };

    const metadataPath = path.join(this.currentRunDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }
  /**
   * Save test suite output to file
   */
  saveTestSuiteOutput(suiteName: string, output: string): void {
    if (!this.currentRunDir) return;

    // Create a more descriptive filename from the test file path
    const sanitizedName = suiteName
      .replace(/[/\\]/g, '_') // Replace path separators
      .replace(/[^a-zA-Z0-9-_.]/g, '_') // Replace other special chars
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    const outputPath = path.join(this.currentRunDir, `${sanitizedName}.log`);

    // Strip ANSI codes and save
    const cleanOutput = this.stripAnsi(output);

    // Add a header to identify the test suite
    const header =
      `=== Test Suite: ${suiteName} ===\n` + `=== Generated: ${new Date().toISOString()} ===\n\n`;

    fs.writeFileSync(outputPath, header + cleanOutput);
    console.log(`💾 Saved output for: ${suiteName}`);
  }
  /**
   * Process test output line by line
   */
  processTestOutput(data: Buffer): void {
    const lines = data.toString().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Detect test suite start - look for actual test file paths in PASS/FAIL lines
      const suiteMatch = line.match(/(?:PASS|FAIL)\s+(.+\.test\.(js|ts|jsx|tsx))/);
      if (suiteMatch) {
        // Save previous suite output if exists
        if (this.currentTestSuite && this.testSuiteOutputs.has(this.currentTestSuite)) {
          this.saveTestSuiteOutput(
            this.currentTestSuite,
            this.testSuiteOutputs.get(this.currentTestSuite)!
          );
        }

        // Use the actual test file path as the suite name
        this.currentTestSuite = suiteMatch[1];
        this.testSuiteOutputs.set(this.currentTestSuite, '');
        console.log(`\n📋 Starting test suite: ${this.currentTestSuite}`);
      }

      // Add line to current test suite output
      if (this.currentTestSuite) {
        const currentOutput = this.testSuiteOutputs.get(this.currentTestSuite) || '';
        this.testSuiteOutputs.set(this.currentTestSuite, currentOutput + line + '\n');
      } // Parse test results for summary - look for individual test results
      if (line.includes('√')) {
        this.passedTests++;
        process.stdout.write('✅');
      } else if (line.includes('×')) {
        this.failedTests++;
        process.stdout.write('❌');
      } else if (line.includes('○ skipped')) {
        this.skippedTests++;
        process.stdout.write('⏭️');
      }

      // Also parse the final Jest summary line for accurate totals
      const testSummaryMatch = line.match(
        /Tests:\s+(?:(\d+) failed,?\s*)?(?:(\d+) skipped,?\s*)?(?:(\d+) passed,?\s*)?(\d+) total/
      );
      if (testSummaryMatch) {
        const [, failed, skipped, passed, total] = testSummaryMatch;
        this.failedTests = parseInt(failed || '0');
        this.skippedTests = parseInt(skipped || '0');
        this.passedTests = parseInt(passed || '0');
        this.totalTests = parseInt(total || '0');
        console.log(
          `\n📊 Jest Summary: ${passed || 0} passed, ${failed || 0} failed, ${skipped || 0} skipped, ${total} total`
        );
      }

      // Display important lines immediately
      if (
        line.includes('PASS') ||
        line.includes('FAIL') ||
        line.includes('Test Suites:') ||
        line.includes('Tests:')
      ) {
        console.log(this.stripAnsi(line));
      }
    }
  }

  /**
   * Build Jest command based on options
   */
  buildJestCommand(options: TestRunOptions): { command: string; args: string[] } {
    let command = 'npx';
    let args = ['jest'];

    // Add Node.js flags for ES modules
    const nodeOptions = ['--experimental-vm-modules', '--no-warnings'];

    // For ES modules, we need to use node directly with jest
    command = 'node';
    args = [...nodeOptions, 'node_modules/jest/bin/jest.js'];

    // Add coverage if requested
    if (options.coverage) {
      args.push('--coverage');
    }

    // Add watch mode if requested
    if (options.watch) {
      args.push('--watch');
    }

    // Add verbose if requested
    if (options.verbose) {
      args.push('--verbose');
    }

    // Add pattern if specified
    if (options.pattern) {
      args.push('--testNamePattern', options.pattern);
    } // Add Jest options for better output
    args.push('--detectOpenHandles', '--forceExit');

    // Add runInBand for frontend tests to prevent module mock conflicts
    if (options.target === 'frontend') {
      args.push('--runInBand');
    }

    // Target specific project
    if (options.target !== 'all') {
      switch (options.target) {
        case 'backend':
          args.push('--testPathPattern', 'backend');
          break;
        case 'frontend':
          args.push('--testPathPattern', 'frontend');
          break;
        case 'ai-server':
          args.push('--testPathPattern', 'ai-server');
          break;
        case 'collaboration-server':
          args.push('--testPathPattern', 'collaboration-server');
          break;
        case 'packages':
          args.push('--testPathPattern', 'packages');
          break;
        case 'e2e':
          args.push('--testPathPattern', 'e2e');
          break;
      }
    }

    return { command, args };
  }

  /**
   * Create test summary report
   */
  createSummaryReport(options: TestRunOptions, exitCode: number, duration: number): TestSummary {
    if (!this.currentRunDir) {
      throw new Error('No current run directory set');
    }

    const summary: TestSummary = {
      timestamp: new Date().toISOString(),
      target: options.target,
      pattern: options.pattern,
      comment: options.comment,
      duration,
      exitCode,
      results: {
        passed: this.passedTests,
        failed: this.failedTests,
        skipped: this.skippedTests,
        total: this.passedTests + this.failedTests + this.skippedTests,
      },
      files: fs.readdirSync(this.currentRunDir).filter(f => f.endsWith('.log')),
    };

    const summaryPath = path.join(this.currentRunDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    return summary;
  }

  /**
   * Run tests with enhanced output management
   */
  async runTests(): Promise<number> {
    const options = this.parseArgs();
    const startTime = Date.now();

    console.log('🚀 Starting Enhanced Test Runner...');

    if (options.comment) {
      console.log(`📝 Comment: ${options.comment}`);
    }

    // Setup directories and rotation
    this.rotateLogDirectories();
    this.setupTestRunDirectory();
    this.createRunMetadata(options);

    // Build Jest command
    const { command, args } = this.buildJestCommand(options);

    console.log(`📋 Running: ${command} ${args.join(' ')}`);
    console.log('');

    return new Promise(resolve => {
      const testProcess: ChildProcess = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      let allOutput = '';

      // Process stdout
      testProcess.stdout?.on('data', (data: Buffer) => {
        allOutput += data.toString();
        this.processTestOutput(data);
      });

      // Process stderr
      testProcess.stderr?.on('data', (data: Buffer) => {
        allOutput += data.toString();
        this.processTestOutput(data);
      });

      testProcess.on('close', (code: number | null) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const exitCode = code ?? 1;

        // Save any remaining test suite output
        if (this.currentTestSuite && this.testSuiteOutputs.has(this.currentTestSuite)) {
          this.saveTestSuiteOutput(
            this.currentTestSuite,
            this.testSuiteOutputs.get(this.currentTestSuite)!
          );
        }

        // Save complete output
        if (this.currentRunDir) {
          const completeOutputPath = path.join(this.currentRunDir, 'complete-output.log');
          fs.writeFileSync(completeOutputPath, this.stripAnsi(allOutput));
        }

        // Create summary report
        const summary = this.createSummaryReport(options, exitCode, duration);

        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Run Complete!');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
        if (this.currentRunDir) {
          console.log(`📁 Results saved to: ${path.relative(process.cwd(), this.currentRunDir)}`);
        }
        console.log('');
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`⏭️ Skipped: ${this.skippedTests}`);
        console.log(`📊 Total: ${summary.results.total}`);

        if (options.comment) {
          console.log(`📝 Comment: ${options.comment}`);
        }

        resolve(exitCode);
      });

      testProcess.on('error', (error: Error) => {
        console.error('❌ Failed to start test process:', error);
        resolve(1);
      });
    });
  }
}

// Run the test runner
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const runner = new TestRunner();
  runner.runTests().then(exitCode => {
    process.exit(exitCode);
  });
}

export default TestRunner;
