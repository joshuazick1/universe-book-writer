// orchestrator.utils.ts
// Utility functions for AI orchestrator

/**
 * Detect if model is a huge (>70B param) model by name
 * Matches 70b, 130b, 180b, etc. (case-insensitive, allow spaces, underscores, dashes)
 */
export function isHugeModel(model: string): boolean {
    return /([7-9][0-9]{1,2}|[1-9][0-9]{2,})[ _-]*b/i.test(model);
}
