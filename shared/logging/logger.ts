/**
 * Shared Logger Utility
 *
 * Provides a consistent, environment-aware logging interface for all packages.
 *
 * Usage:
 *   import { logger } from 'shared/logging';
 *   logger.info('Message', { context: 'optional' });
 *
 * Edge Cases:
 *   - Handles JSON and string messages.
 *   - Supports log level filtering via NODE_ENV or LOG_LEVEL.
 *   - Safe for use in backend, ai-server, and plugins.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
    readonly context?: string;
    readonly error?: unknown;
    readonly [key: string]: unknown;
}

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

// Rotating log file config
import fs from 'fs';
import path from 'path';
const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE_PREFIX = 'ai-server';
const LOG_FILE_EXT = '.log';
const LOG_RETENTION_DAYS = 7;

function getLogFileName(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${LOG_FILE_PREFIX}-${y}-${m}-${d}${LOG_FILE_EXT}`;
}

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateOldLogs() {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR)
        .filter(f => f.startsWith(LOG_FILE_PREFIX) && f.endsWith(LOG_FILE_EXT))
        .sort();
    if (files.length > LOG_RETENTION_DAYS) {
        for (let i = 0; i < files.length - LOG_RETENTION_DAYS; i++) {
            fs.unlinkSync(path.join(LOG_DIR, files[i]));
        }
    }
}

function writeLogToFile(msg: string) {
    ensureLogDir();
    rotateOldLogs();
    const filePath = path.join(LOG_DIR, getLogFileName());
    fs.appendFileSync(filePath, msg + '\n', { encoding: 'utf8' });
}

function getLogLevel(): LogLevel {
    const env = (process.env.LOG_LEVEL || process.env.NODE_ENV || 'info').toLowerCase();
    if (LEVELS.includes(env as LogLevel)) return env as LogLevel;
    if (env === 'development') return 'debug';
    if (env === 'production') return 'warn';
    return 'info';
}

function formatMessage(level: LogLevel, message: unknown, options?: LoggerOptions): string {
    const time = new Date().toISOString();
    const ctx = options?.context ? `[${options.context}]` : '';
    let msg = typeof message === 'string' ? message : JSON.stringify(message);
    if (options?.error) {
        msg += `\nError: ${options.error instanceof Error ? options.error.stack : JSON.stringify(options.error)}`;
    }
    return `${time} ${level.toUpperCase()}${ctx ? ' ' + ctx : ''}: ${msg}`;
}

function shouldLog(level: LogLevel): boolean {
    const current = getLogLevel();
    return LEVELS.indexOf(level) >= LEVELS.indexOf(current);
}

function sanitizeFileName(fileName: string): string {
    // Remove protocol prefix and replace invalid Windows filename characters
    return fileName
        .replace(/^https?:\/\//, '') // Remove http:// or https://
        .replace(/[:\\/*?"<>|]/g, '_') // Replace invalid characters with underscores
        .replace(/_{2,}/g, '_'); // Replace multiple underscores with single underscore
}

function getServerLogFileName(serverId: string, date = new Date()) {
    const sanitizedServerId = sanitizeFileName(serverId);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return path.resolve(LOG_DIR, 'servers', `${sanitizedServerId}-${y}-${m}-${d}${LOG_FILE_EXT}`);
}

function logToServerFile(serverId: string, level: LogLevel, message: string, options?: LoggerOptions) {
    ensureLogDir();
    const serverLogDir = path.resolve(LOG_DIR, 'servers');
    if (!fs.existsSync(serverLogDir)) fs.mkdirSync(serverLogDir, { recursive: true });

    const logFileName = getServerLogFileName(serverId);
    const logEntry = `${new Date().toISOString()} [${level.toUpperCase()}] ${message} ${options ? JSON.stringify(options) : ''}\n`;
    fs.appendFileSync(logFileName, logEntry, 'utf8');
}

export { logToServerFile };

export const logger = {
    debug(message: unknown, options?: LoggerOptions) {
        if (shouldLog('debug')) {
            const msg = formatMessage('debug', message, options);
            console.debug(msg);
            writeLogToFile(msg);
        }
    },
    info(message: unknown, options?: LoggerOptions) {
        if (shouldLog('info')) {
            const msg = formatMessage('info', message, options);
            console.info(msg);
            writeLogToFile(msg);
        }
    },
    warn(message: unknown, options?: LoggerOptions) {
        if (shouldLog('warn')) {
            const msg = formatMessage('warn', message, options);
            console.warn(msg);
            writeLogToFile(msg);
        }
    },
    error(message: unknown, options?: LoggerOptions) {
        if (shouldLog('error')) {
            const msg = formatMessage('error', message, options);
            console.error(msg);
            writeLogToFile(msg);
        }
    },
};

export default logger;
