/* eslint-disable no-console */
import { jest } from '@jest/globals';
import { Logger, ChildLogger } from '../utils/logger.js';

describe('Logger', () => {
  let originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
    debug: typeof console.debug;
    log: typeof console.log;
  };

  beforeEach(() => {
    // Mock console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
      log: console.log,
    };

    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.log = originalConsole.log;

    // Reset singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Logger as any).instance = undefined;
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();

      expect(logger1).toBe(logger2);
    });

    it('should create new instance when configured', () => {
      const logger1 = Logger.getInstance();
      Logger.configure({ level: 'debug' });
      const logger2 = Logger.getInstance();

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('log levels', () => {
    it('should respect log level hierarchy', () => {
      const logger = Logger.getInstance({ level: 'warn' });

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('error message'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('warn message'));
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should allow changing log level', () => {
      const logger = Logger.getInstance({ level: 'error' });

      logger.info('should not log');
      expect(console.info).not.toHaveBeenCalled();

      logger.setLevel('info');
      logger.info('should log');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('should log'));
    });

    it('should return current log level', () => {
      const logger = Logger.getInstance({ level: 'debug' });
      expect(logger.getLevel()).toBe('debug');
    });
  });

  describe('logging methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = Logger.getInstance({ level: 'debug' });
    });

    it('should log error messages', () => {
      logger.error('test error');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR: test error'));
    });

    it('should log warn messages', () => {
      logger.warn('test warning');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN: test warning'));
    });

    it('should log info messages', () => {
      logger.info('test info');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO: test info'));
    });

    it('should log debug messages', () => {
      logger.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('DEBUG: test debug'));
    });

    it('should log with context', () => {
      const context = { userId: '123', action: 'login' };
      logger.info('user action', context);

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('user action'));
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(context)));
    });

    it('should log errors with stack trace', () => {
      const error = new Error('test error');
      logger.error('operation failed', { userId: '123' }, error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error: test error'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Stack:'));
    });
  });

  describe('child logger', () => {
    let logger: Logger;
    let childLogger: ChildLogger;

    beforeEach(() => {
      logger = Logger.getInstance({ level: 'debug' });
      childLogger = logger.createChildLogger('TestModule');
    });

    it('should create child logger with prefix', () => {
      expect(childLogger).toBeInstanceOf(ChildLogger);
    });

    it('should include prefix in log messages', () => {
      childLogger.info('test message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] test message')
      );
    });

    it('should support all log levels', () => {
      childLogger.error('error message');
      childLogger.warn('warn message');
      childLogger.info('info message');
      childLogger.debug('debug message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] error message')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] warn message')
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] info message')
      );
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] debug message')
      );
    });

    it('should support context and errors', () => {
      const context = { operation: 'test' };
      const error = new Error('test error');

      childLogger.error('operation failed', context, error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] operation failed')
      );
    });
  });

  describe('configuration options', () => {
    it('should support disabling console logging', () => {
      const logger = Logger.getInstance({
        level: 'info',
        enableConsole: false,
      });

      logger.info('test message');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should use default options when not provided', () => {
      const logger = Logger.getInstance();

      expect(logger.getLevel()).toBe('info');

      logger.info('test message');
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('log formatting', () => {
    it('should include timestamp in log messages', () => {
      const logger = Logger.getInstance({ level: 'info' });

      logger.info('test message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('should format log level in uppercase', () => {
      const logger = Logger.getInstance({ level: 'debug' });

      logger.error('error');
      logger.warn('warn');
      logger.info('info');
      logger.debug('debug');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR:'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN:'));
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO:'));
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('DEBUG:'));
    });
  });
});
