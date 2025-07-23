/**
 * RegexValidator: Checks if a string matches a given regex pattern.
 * @module backend/application/quality-judger/validators/regexValidator
 */
/**
 * Type for a validator function result.
 */
export interface ValidatorResult {
    metric: string;
    passed: boolean;
    score: number;
    rationale: string;
}

/**
 * Type for a validator function.
 */
export type Validator = (value: unknown, options?: Record<string, unknown>) => ValidatorResult;

/**
 * Validates that the value matches the provided regex pattern.
 * @param value - The string to validate
 * @param pattern - The regex pattern to match
 * @returns ValidatorResult
 */
export const regexValidator: Validator = (value: unknown, options?: Record<string, unknown>): ValidatorResult => {
    const { pattern, flags, metric = 'regex' } = options || {};
    if (typeof value !== 'string' || typeof pattern !== 'string') {
        return {
            metric: String(metric),
            passed: false,
            score: 0,
            rationale: 'Value or pattern missing or not a string.'
        };
    }
    const regex = new RegExp(pattern as string, typeof flags === 'string' ? flags : undefined);
    const passed = regex.test(value);
    return {
        metric: String(metric),
        passed,
        score: passed ? 1 : 0,
        rationale: passed ? 'Pattern matched.' : 'Pattern did not match.'
    };
};

export default regexValidator;
