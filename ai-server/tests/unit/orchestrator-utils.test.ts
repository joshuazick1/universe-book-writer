// orchestrator-utils.test.ts
// Unit tests for orchestrator.utils.ts

import { isHugeModel } from '../../src/orchestrator.utils';

describe('isHugeModel', () => {
    it('returns true for 70b, 130b, 180b, 1000b, etc. (case-insensitive, with spaces/underscores/dashes)', () => {
        expect(isHugeModel('70b')).toBe(true);
        expect(isHugeModel('130B')).toBe(true);
        expect(isHugeModel('180_b')).toBe(true);
        expect(isHugeModel('1000-b')).toBe(true);
        expect(isHugeModel('256 B')).toBe(true);
        expect(isHugeModel('512_b')).toBe(true);
        expect(isHugeModel('1024-b')).toBe(true);
    });

    it('returns false for small/medium models (7b, 13b, 33b, 65b, etc.)', () => {
        expect(isHugeModel('7b')).toBe(false);
        expect(isHugeModel('13B')).toBe(false);
        expect(isHugeModel('33_b')).toBe(false);
        expect(isHugeModel('65-b')).toBe(false);
        expect(isHugeModel('1b')).toBe(false);
        expect(isHugeModel('')).toBe(false);
    });

    it('returns false for non-model strings', () => {
        expect(isHugeModel('foobar')).toBe(false);
        expect(isHugeModel('model-abc')).toBe(false);
        expect(isHugeModel('')).toBe(false);
        expect(isHugeModel(' ')).toBe(false);
    });

    it('handles edge cases with extra text', () => {
        expect(isHugeModel('llama-2-70b-chat')).toBe(true);
        expect(isHugeModel('llama-2-13b-chat')).toBe(false);
        expect(isHugeModel('mistral-180b-v2')).toBe(true);
        expect(isHugeModel('falcon-40b')).toBe(false);
        expect(isHugeModel('70b-variant')).toBe(true);
        expect(isHugeModel('variant-70b')).toBe(true);
    });
});
