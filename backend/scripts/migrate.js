import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migratePath = path.join(__dirname, '..', 'node_modules', '.bin', 'migrate-mongo');

function runMigration(command) {
  try {
    execSync(`${migratePath} ${command}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error running migration command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

const command = process.argv[2];
if (!command) {
  console.error('Please specify a command: up, down, status');
  process.exit(1);
}

runMigration(command);
