import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import logger from '../../shared/logging/logger.js';

const logInfo = logger.info.bind(logger);
const logWarn = logger.warn.bind(logger);
const logError = logger.error.bind(logger);
const logDebug = logger.debug.bind(logger);

describe('logger.ts', () => {
    it('should create the log file if it does not exist', () => {
        if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
        logInfo('file creation test');
        expect(fs.existsSync(LOG_FILE)).toBe(true);
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        expect(content).toMatch(/file creation test/);
    });

    it('should log edge-case messages (empty, long, special chars, multiline)', () => {
        logInfo('');
        logWarn('!@#$%^&*()_+-=[]{}|;:",.<>/?');
        const longMsg = 'x'.repeat(10000);
        logError(longMsg);
        logDebug('line1\nline2\nline3');
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        expect(content).toMatch(/INFO.*\n/);
        expect(content).toMatch(/WARN.*!@#\$%\^&\*\(\)_\+\-=\[\]\{\}\|;:",.<>\/?/);
        expect(content).toMatch(/ERROR.*x{10000}/);
        // Find the DEBUG log line and check for multiline content
        const debugLineIdx = content.split('\n').findIndex(l => l.includes('[DEBUG]'));
        expect(debugLineIdx).toBeGreaterThan(-1);
        const debugLines = content.split('\n').slice(debugLineIdx, debugLineIdx + 3).join('\n');
        expect(debugLines).toContain('line1');
        expect(debugLines).toContain('line2');
        expect(debugLines).toContain('line3');
    });

    it('should handle concurrent logging', () => {
        for (let i = 0; i < 10; i++) {
            logInfo(`concurrent ${i}`);
        }
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        for (let i = 0; i < 10; i++) {
            expect(content).toMatch(new RegExp(`concurrent ${i}`));
        }
    });
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

    it('should log multiple levels in correct order and format', () => {
        logInfo('multi info');
        logWarn('multi warn');
        logError('multi error');
        logDebug('multi debug');
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        const lines = content.trim().split(/\r?\n/).filter(Boolean);
        const lastFour = lines.slice(-4);
        expect(lastFour[0]).toMatch(/\[INFO\].*multi info/);
        expect(lastFour[1]).toMatch(/\[WARN\].*multi warn/);
        expect(lastFour[2]).toMatch(/\[ERROR\].*multi error/);
        expect(lastFour[3]).toMatch(/\[DEBUG\].*multi debug/);
        // Check ISO timestamp format
        lastFour.forEach(line => {
            expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[[A-Z]+\]/);
        });
    });

    it('should not throw or log for undefined/null/empty messages', () => {
        expect(() => logInfo(undefined as any)).not.toThrow();
        expect(() => logWarn(null as any)).not.toThrow();
        expect(() => logError('')).not.toThrow();
        expect(() => logDebug('')).not.toThrow();
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        // Should still log lines, but with empty message (no trailing space)
        expect(content).toMatch(/\[INFO\]$/m);
        expect(content).toMatch(/\[WARN\]$/m);
    });

    it('should handle very large log messages', () => {
        const bigMsg = 'A'.repeat(100_000);
        logInfo(bigMsg);
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        expect(content).toMatch(/INFO.*A{100000}/);
    });

    it('should log special unicode and emoji characters', () => {
        logInfo('unicode: 你好 🌟 🚀');
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        expect(content).toMatch(/unicode: 你好 🌟 🚀/);
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
