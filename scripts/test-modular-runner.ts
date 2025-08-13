#!/usr/bin/env node

/**
 * Simple test of the modular test runner architecture
 */

import { loadConfig } from './test-runner/config.js';
import { loadPlugins } from './test-runner/plugins.js';
import { reportToConsole } from './test-runner/reporters/consoleReporter.js';

console.log('🧪 Testing modular test runner components...');

// Test config loading
try {
  const config = loadConfig({ outputDir: './test-output' });
  console.log('✅ Config loaded:', config);
} catch (error) {
  console.error('❌ Config loading failed:', error);
}

// Test plugin loading
try {
  const plugins = loadPlugins({}, {});
  console.log('✅ Plugins loaded:', plugins.length, 'plugins');
} catch (error) {
  console.error('❌ Plugin loading failed:', error);
}

// Test console reporter
try {
  const mockResults = [
    {
      suite: 'test1.test.ts',
      status: 'passed' as const,
      duration: 1000,
      output: 'All tests passed',
      retries: 0
    },
    {
      suite: 'test2.test.ts',
      status: 'failed' as const,
      duration: 2000,
      output: 'Some tests failed',
      retries: 1
    }
  ];

  console.log('\n📊 Testing console reporter:');
  reportToConsole(mockResults);
  console.log('✅ Console reporter works');
} catch (error) {
  console.error('❌ Console reporter failed:', error);
}

console.log('\n🎉 Modular test runner components test complete!');
