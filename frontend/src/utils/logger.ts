/**
 * Development Logger Utility
 * Provides controlled logging for development that can be easily disabled in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];

  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry = this.createLogEntry(level, message, data);
    this.logHistory.push(entry);

    // Keep only last 100 entries to prevent memory leaks
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }

    // Only log to console in development
    if (this.isDevelopment) {
      const logMessage = data ? `${message}` : message;

      switch (level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(`[DEBUG] ${logMessage}`, data);
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(`[INFO] ${logMessage}`, data);
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(`[WARN] ${logMessage}`, data);
          break;
        case 'error':
          // eslint-disable-next-line no-console
          console.error(`[ERROR] ${logMessage}`, data);
          break;
      }
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  // Get log history for debugging
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory(): void {
    this.logHistory = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogEntry };
