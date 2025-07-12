/**
 * Length validator for quality judger metrics.
 * Checks if a string is within a specified length range.
 */
export function lengthValidator(value: string, params: { min: number; max: number }): boolean {
    const len = value.length;
    return len >= params.min && len <= params.max;
}
