#!/usr/bin/env node

/**
 * Simplified Modular Test Runner - Proof of Concept
 * 
 * This validates that the modular approach works with basic functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import modular components
import { loadConfig } from './test-runner/config.js';
import { loadPlugins } from './test-runner/plugins.js';
import { executeSuite } from './test-runner/executor/index.js';
import { reportToConsole } from './test-runner/reporters/consoleReporter.js';
import { saveLog, rotateLogs } from './test-runner/logs/logManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SimpleModularTestRunner {
  private projectRoot: string;

  constructor() {
    this.projectRoot = this.findProjectRoot();
    process.chdir(this.projectRoot);
  }

  private findProjectRoot(): string {
    let currentDir = process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === 'verseforge' ||
            (fs.existsSync(path.join(currentDir, 'frontend')) &&
              fs.existsSync(path.join(currentDir, 'backend')))) {
            return currentDir;
          }
        } catch {
          // Continue searching
        }
      }
      currentDir = path.dirname(currentDir);
    }
    return process.cwd();
  }

  private parseSimpleArgs() {
    const args = process.argv.slice(2);
    return {
      target: args[0] || 'help',
      showHelp: args.includes('--help') || args.includes('-h') || args[0] === 'help'
    };
  }

  private showHelp() {
    console.log(`
🧪 Simple Modular Test Runner - Proof of Concept

Usage: npx tsx scripts/simple-modular-runner.ts [target] [options]

Targets:
  help        Show this help (default)
  test        Run a simple test demonstration
  discover    Discover test files in the project

Options:
  --help, -h  Show this help

Examples:
  npx tsx scripts/simple-modular-runner.ts test
  npx tsx scripts/simple-modular-runner.ts discover
`);
  }

  private discoverTestFiles(): string[] {
    const testDirs = ['backend', 'frontend', 'ai-server', 'packages'];
    const testFiles: string[] = [];

    for (const dir of testDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        const walk = (dirPath: string): void => {
          for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              walk(fullPath);
            } else if (/\.test\.(ts|js|tsx|jsx)$/.test(entry.name)) {
              testFiles.push(fullPath);
            }
          }
        };
        walk(dirPath);
      }
    }

    return testFiles;
  }

  async run(): Promise<void> {
    const options = this.parseSimpleArgs();

    if (options.showHelp) {
      this.showHelp();
      return;
    }

    console.log('🚀 Simple Modular Test Runner Starting...');
    console.log(`📁 Project root: ${this.projectRoot}`);

    // Load modular components
    const config = loadConfig({ outputDir: './test-results' });
    const plugins = loadPlugins(config, {});

    console.log(`⚙️  Config loaded: ${JSON.stringify(config)}`);
    console.log(`🔌 Plugins loaded: ${plugins.length}`);

    if (options.target === 'discover') {
      const testFiles = this.discoverTestFiles();
      console.log(`\n🔍 Discovered ${testFiles.length} test files:`);
      testFiles.slice(0, 10).forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.relative(this.projectRoot, file)}`);
      });
      if (testFiles.length > 10) {
        console.log(`  ... and ${testFiles.length - 10} more`);
      }
      return;
    }

    if (options.target === 'test') {
      console.log('\n🧪 Running test demonstration...');

      // Setup output directory
      const outputDir = path.join(this.projectRoot, 'test-results', `simple_run_${Date.now()}`);
      rotateLogs(path.dirname(outputDir), 5);
      fs.mkdirSync(outputDir, { recursive: true });

      // Create mock execution results
      const mockResults = [
        {
          suite: path.join(this.projectRoot, 'mock/test1.test.ts'),
          status: 'passed' as const,
          duration: 1500,
          output: 'Mock test 1: All assertions passed\n✅ 5 tests passed',
          retries: 0
        },
        {
          suite: path.join(this.projectRoot, 'mock/test2.test.ts'),
          status: 'failed' as const,
          duration: 2300,
          output: 'Mock test 2: Some assertions failed\n❌ 2 tests failed, 3 passed',
          retries: 1,
          error: new Error('Mock test failure')
        },
        {
          suite: path.join(this.projectRoot, 'mock/test3.test.ts'),
          status: 'skipped' as const,
          duration: 100,
          output: 'Mock test 3: Tests skipped due to conditions',
          retries: 0
        }
      ];

      // Save logs using modular log manager
      for (const result of mockResults) {
        saveLog(result.suite, result.output, outputDir);
      }

      // Report using modular console reporter
      console.log('\n📊 Test Results:');
      reportToConsole(mockResults);

      // Create summary
      const summary = {
        timestamp: new Date().toISOString(),
        total: mockResults.length,
        passed: mockResults.filter(r => r.status === 'passed').length,
        failed: mockResults.filter(r => r.status === 'failed').length,
        skipped: mockResults.filter(r => r.status === 'skipped').length,
        outputDir: path.relative(this.projectRoot, outputDir)
      };

      fs.writeFileSync(
        path.join(outputDir, 'summary.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log(`\n💾 Results saved to: ${summary.outputDir}`);
      console.log('🎉 Modular test runner demonstration complete!');
      return;
    }

    console.log(`❓ Unknown target: ${options.target}`);
    this.showHelp();
  }
}

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SimpleModularTestRunner();
  runner.run().catch((error) => {
    console.error('❌ Simple modular test runner failed:', error);
    process.exit(1);
  });
}
