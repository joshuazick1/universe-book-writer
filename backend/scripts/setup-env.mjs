import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const copyEnvFile = () => {
    const envPath = join(__dirname, '..', '.env');
    const envExamplePath = join(__dirname, '..', '.env.example');

    if (!existsSync(envPath) && existsSync(envExamplePath)) {
        copyFileSync(envExamplePath, envPath);
        console.log('Created .env file from .env.example');
    } else if (!existsSync(envPath)) {
        console.error('No .env or .env.example file found!');
        process.exit(1);
    }
};

copyEnvFile();
