/**
 * Schema validator for quality judger metrics.
 * Checks if an object matches a simple required property schema.
 */
export function schemaValidator(obj: unknown, params: { type: string; required: string[] }): boolean {
    if (params.type !== 'object' || typeof obj !== 'object' || obj === null) return false;
    for (const key of params.required) {
        if (!(key in obj)) return false;
    }
    return true;
}
