/**
 * Entity count validator for quality judger metrics.
 * Checks if the number of entities in a result matches the expected count or range.
 * @module backend/application/quality-judger/validators/entityCountValidator
 */

/**
 * Validates that the number of entities matches the expected count or falls within a range.
 * @param value - Array of entities or object with an 'entities' array
 * @param params - { min?: number, max?: number, exact?: number }
 * @returns { passed, score, rationale }
 */
export function entityCountValidator(
    value: unknown,
    params: { min?: number; max?: number; exact?: number }
) {
    let count = 0;
    if (Array.isArray(value)) {
        count = value.length;
    } else if (value && typeof value === 'object' && Array.isArray((value as any).entities)) {
        count = (value as any).entities.length;
    }
    let passed = true;
    let rationale = '';
    if (typeof params.exact === 'number') {
        passed = count === params.exact;
        rationale = `Expected exactly ${params.exact}, got ${count}`;
    } else {
        if (typeof params.min === 'number' && count < params.min) {
            passed = false;
            rationale = `Expected at least ${params.min}, got ${count}`;
        }
        if (typeof params.max === 'number' && count > params.max) {
            passed = false;
            rationale = `Expected at most ${params.max}, got ${count}`;
        }
        if (passed) rationale = `Entity count ${count} within expected range.`;
    }
    return {
        metric: 'entityCount',
        passed,
        score: passed ? 1 : 0,
        rationale
    };
}
