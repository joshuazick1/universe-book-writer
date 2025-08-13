#!/usr/bin/env node

/**
 * Debug entry point for test runner
 */

console.log('🔍 Debug: Script starting...');
console.log('🔍 Debug: process.argv[1]:', process.argv[1]);
console.log('🔍 Debug: import.meta.url:', import.meta.url);

// Test the entry point condition
const expected = `file://${process.argv[1]}`;
const actual = import.meta.url;

console.log('🔍 Debug: expected:', expected);
console.log('🔍 Debug: actual:', actual);
console.log('🔍 Debug: match:', actual === expected);

// Alternative condition test
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
console.log('🔍 Debug: alternative match:', isMainModule);

// Try simpler approach
const scriptName = process.argv[1].split(/[/\\]/).pop();
const urlPath = import.meta.url.split('/').pop();
console.log('🔍 Debug: script name:', scriptName);
console.log('🔍 Debug: url path:', urlPath);
console.log('🔍 Debug: simple match:', scriptName === urlPath);

console.log('🎉 Entry point debug complete!');
