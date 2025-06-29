import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `backend-${new Date().toISOString().slice(0, 10)}.log`);

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

function formatMsg(level: string, msg: string) {
    return `[${new Date().toISOString()}] [${level}] ${msg}\n`;
}

export function logInfo(msg: string) {
    fs.appendFileSync(LOG_FILE, formatMsg('INFO', msg));
}

export function logWarn(msg: string) {
    fs.appendFileSync(LOG_FILE, formatMsg('WARN', msg));
}

export function logError(msg: string) {
    fs.appendFileSync(LOG_FILE, formatMsg('ERROR', msg));
}

export function logDebug(msg: string) {
    fs.appendFileSync(LOG_FILE, formatMsg('DEBUG', msg));
}
