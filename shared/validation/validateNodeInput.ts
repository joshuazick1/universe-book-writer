import { NodeInput } from '../types/nodeTypes.js';

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errorMessage?: string;
}

/**
 * Validates the shape and required fields of a node input object.
 * @param input NodeInput to validate
 * @returns ValidationResult
 * @example
 * const result = validateNodeInput({ type: 'universe', title: 'My Universe', metadata: { universeId: 'abc123' } });
 * if (!result.valid) throw new Error(result.errorMessage);
 */
export function validateNodeInput(input: NodeInput): ValidationResult {
    if (!input || typeof input !== 'object') {
        return { valid: false, errorMessage: 'Input must be an object.' };
    }
    if (!input.type || typeof input.type !== 'string') {
        return { valid: false, errorMessage: 'Node type is required.' };
    }
    if (!input.title || typeof input.title !== 'string') {
        return { valid: false, errorMessage: 'Node title is required.' };
    }
    if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
        return { valid: false, errorMessage: 'Node metadata must be a plain object.' };
    }
    // Optionally, validate allowed node types here if shared/types/NodeType is available
    return { valid: true };
}
