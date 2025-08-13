#!/usr/bin/env node

console.log('Hello from simple test runner!');
console.log('Arguments:', process.argv);
console.log('Working directory:', process.cwd());

// Test if basic file operations work
import fs from 'fs';
import path from 'path';

try {
  const exists = fs.existsSync('package.json');
  console.log('package.json exists:', exists);

  if (exists) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('Project name:', pkg.name);
  }
} catch (error) {
  console.error('Error:', error);
}

console.log('Simple test complete!');
