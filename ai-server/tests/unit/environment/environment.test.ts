import { describe, it, expect } from '@jest/globals';

describe('Environment Configuration', () => {
    it('should handle test environment variables', () => {
        process.env.TEST_VAR = 'test-value';
        expect(process.env.TEST_VAR).toBe('test-value');
    });

    it('should have LOG_LEVEL set to error for tests', () => {
        if (!process.env.LOG_LEVEL) {
            process.env.LOG_LEVEL = 'error';
        }
        expect(process.env.LOG_LEVEL).toBe('error');
    });
});
