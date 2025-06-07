const { execSync } = require('child_process');
const path = require('path');

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
