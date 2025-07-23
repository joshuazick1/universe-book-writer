#!/usr/bin/env node
/**
 * Fix import paths to include .js extensions for ES modules
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          traverse(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir);
  return files;
}

function fixImportsInFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let modified = content;
    let hasChanges = false;

    // Fix import statements
    modified = modified.replace(
      /(?:import|export)(?:\s+[^'"]*)?(?:\s+from)?\s+['"](\.[^'"]+)['"];?/g,
      (match, importPath) => {
        // Skip if already has extension
        if (importPath.includes('.js') || importPath.includes('.ts') || importPath.includes('.tsx')) {
          return match;
        }
        
        // Add .js extension
        const newPath = importPath + '.js';
        hasChanges = true;
        return match.replace(importPath, newPath);
      }
    );

    if (hasChanges) {
      writeFileSync(filePath, modified, 'utf8');
      console.log(`Fixed imports in: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  return false;
}

function main() {
  console.log('🔧 Fixing import paths for ES modules...');
  
  // Define directories to process
  const dirsToProcess = [
    join(rootDir, 'frontend', 'src'),
    join(rootDir, 'packages'),
    join(rootDir, 'backend', 'src'),
    join(rootDir, 'ai-server', 'src'),
    join(rootDir, 'collaboration-server', 'src')
  ];

  let fixedCount = 0;
  
  for (const dir of dirsToProcess) {
    try {
      const files = getAllFiles(dir);
      
      for (const file of files) {
        if (fixImportsInFile(file)) {
          fixedCount++;
        }
      }
    } catch (error) {
      console.log(`Skipping ${dir}: ${error.message}`);
    }
  }
  
  console.log(`✅ Fixed imports in ${fixedCount} files`);
}

main();
