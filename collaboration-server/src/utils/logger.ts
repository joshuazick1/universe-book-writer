export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerOptions {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  format?: 'json' | 'text';
}

export class Logger {
  private static instance: Logger;
  private readonly options: LoggerOptions;
  private readonly logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: options.level ?? 'info',
      enableConsole: options.enableConsole ?? true,
      enableFile: options.enableFile ?? false,
      filePath: options.filePath ?? './logs/collaboration-server.log',
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles ?? 5,
      format: options.format ?? 'json',
    };
  }

  public static getInstance(options?: Partial<LoggerOptions>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  public static configure(options: Partial<LoggerOptions>): void {
    Logger.instance = new Logger(options);
  }

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, context, error);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  public setLevel(level: LogLevel): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.options as any).level = level;
  }

  public getLevel(): LogLevel {
    return this.options.level;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (this.logLevels[level] > this.logLevels[this.options.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    if (this.options.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.options.enableFile) {
      this.logToFile(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, context, error } = entry;

    let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (context) {
      output += ` ${JSON.stringify(context)}`;
    }

    if (error) {
      output += `\nError: ${error.message}\nStack: ${error.stack}`;
    }

    switch (level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(output);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(output);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(output);
        break;
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(output);
        break;
    }
  }

  private logToFile(entry: LogEntry): void {
    // File logging implementation would go here
    // For now, we'll just use console logging
    // In a production environment, you'd want to use a proper file logging library
    // like winston or pino with file rotation

    if (this.options.format === 'json') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    } else {
      this.logToConsole(entry);
    }
  }

  public createChildLogger(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }
}

export class ChildLogger {
  constructor(
    private readonly parent: Logger,
    private readonly prefix: string
  ) {}

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.parent.error(`[${this.prefix}] ${message}`, context, error);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(`[${this.prefix}] ${message}`, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(`[${this.prefix}] ${message}`, context);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(`[${this.prefix}] ${message}`, context);
  }
}
