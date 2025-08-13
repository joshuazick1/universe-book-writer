#!/usr/bin/env node

/**
 * Debug test runner to identify issues
 */

console.log('🔍 Debug: Script starting...');
console.log('🔍 Debug: process.argv[1]:', process.argv[1]);
console.log('🔍 Debug: import.meta.url:', import.meta.url);

try {
  console.log('🔍 Debug: Testing imports...');

  // Test basic imports first
  import('./test-runner/config.js').then((config) => {
    console.log('✅ Config import successful');
    return import('./test-runner/plugins.js');
  }).then((plugins) => {
    console.log('✅ Plugins import successful');
    return import('./test-runner/reporters/consoleReporter.js');
  }).then((reporter) => {
    console.log('✅ Reporter import successful');
    console.log('🎉 All imports successful, issue is likely in main logic');
  }).catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Script failed:', error);
  process.exit(1);
}
