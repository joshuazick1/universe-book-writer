#!/usr/bin/env node

/**
 * Jest Configuration Validation Script
 * Tests all Jest configurations to ensure they load correctly
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const projects = [
  { name: 'root', path: rootDir },
  { name: 'backend', path: resolve(rootDir, 'backend') },
  { name: 'frontend', path: resolve(rootDir, 'frontend') },
  { name: 'ai-server', path: resolve(rootDir, 'ai-server') },
  { name: 'collaboration-server', path: resolve(rootDir, 'collaboration-server') },
  { name: 'packages/core', path: resolve(rootDir, 'packages', 'core') }
];

async function validateConfig(project) {
  console.log(`\n🔍 Validating ${project.name} configuration...`);
  
  try {
    const { stdout, stderr } = await execAsync(
      'npx jest --showConfig --passWithNoTests',
      { 
        cwd: project.path,
        timeout: 30000
      }
    );
    
    if (stderr && stderr.includes('Validation Error')) {
      console.log(`❌ ${project.name}: Configuration validation failed`);
      console.log(stderr);
      return false;
    }
    
    if (stdout.includes('"displayName"')) {
      const displayNameMatch = stdout.match(/"displayName":\s*{[^}]*"name":\s*"([^"]+)"/);
      const displayName = displayNameMatch ? displayNameMatch[1] : 'unknown';
      console.log(`✅ ${project.name}: Configuration valid (displayName: ${displayName})`);
    } else {
      console.log(`✅ ${project.name}: Configuration valid`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${project.name}: Configuration failed`);
    console.log(error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Jest configuration validation...');
  
  let successful = 0;
  let failed = 0;
  
  for (const project of projects) {
    const result = await validateConfig(project);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total projects: ${projects.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All Jest configurations are valid!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some configurations have issues. Please review the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
