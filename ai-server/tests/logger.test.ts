import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { logInfo, logWarn, logError, logDebug } from '../src/logger';

describe('logger.ts', () => {
    const LOG_DIR = path.join(process.cwd(), 'logs');
    const LOG_FILE = path.join(
        LOG_DIR,
        `ai-server-${new Date().toISOString().slice(0, 10)}.log`
    );

    beforeEach(() => {
        if (fs.existsSync(LOG_FILE)) {
            fs.unlinkSync(LOG_FILE);
        }
    });

    afterAll(() => {
        if (fs.existsSync(LOG_FILE)) {
            fs.unlinkSync(LOG_FILE);
        }
    });

    it('should log info, warn, error, and debug messages to the log file', () => {
        logInfo('info test');
        logWarn('warn test');
        logError('error test');
        logDebug('debug test');
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        expect(content).toMatch(/INFO.*info test/);
        expect(content).toMatch(/WARN.*warn test/);
        expect(content).toMatch(/ERROR.*error test/);
        expect(content).toMatch(/DEBUG.*debug test/);
    });

    it('should handle logging errors (simulate unwritable file)', () => {
        // Simulate fs.appendFileSync throwing
        const original = fs.appendFileSync;
        fs.appendFileSync = jest.fn(() => { throw new Error('Disk full'); });
        expect(() => logError('fail')).toThrow('Disk full');
        expect(() => logDebug('fail')).toThrow('Disk full');
        fs.appendFileSync = original;
    });
});
