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

export const logger = {
    debug(message: unknown, options?: LoggerOptions) {
        if (shouldLog('debug')) console.debug(formatMessage('debug', message, options));
    },
    info(message: unknown, options?: LoggerOptions) {
        if (shouldLog('info')) console.info(formatMessage('info', message, options));
    },
    warn(message: unknown, options?: LoggerOptions) {
        if (shouldLog('warn')) console.warn(formatMessage('warn', message, options));
    },
    error(message: unknown, options?: LoggerOptions) {
        if (shouldLog('error')) console.error(formatMessage('error', message, options));
    },
};

export default logger;
