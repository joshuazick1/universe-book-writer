/**
 * Estimate resource allocation for a given server/model pair.
 * @module estimateResourceAllocation
 * @description Utility to estimate resource allocation for a model on a server, based on model and server identifiers.
 * @example
 * import { estimateResourceAllocation } from './estimateResourceAllocation';
 * const allocation = estimateResourceAllocation('server-1', 'llama-2-7b');
 * // allocation: { cpu: 'medium', memory: 'high', gpu: 'optional', notes: 'Estimated for 7B model' }
 *
 * Edge cases: unknown model or server returns 'unknown' for all fields.
 */

/**
 * Resource allocation estimate structure
 */
export interface ResourceAllocationEstimate {
    readonly cpu: 'low' | 'medium' | 'high' | 'unknown';
    readonly memory: 'low' | 'medium' | 'high' | 'unknown';
    readonly gpu: 'required' | 'optional' | 'none' | 'unknown';
    readonly notes?: string;
}

/**
 * Estimate resource allocation for a model on a server.
 * @param serverId - The server identifier
 * @param modelName - The model name
 * @returns ResourceAllocationEstimate
 */
export function estimateResourceAllocation(
    serverId: string,
    modelName: string
): ResourceAllocationEstimate {
    const name = modelName.toLowerCase();
    // Try to extract model size (e.g., 7b, 13b, 23b, 34b, 70b, etc.)
    const sizeMatch = name.match(/(\d+)(b)/);
    if (sizeMatch) {
        const size = parseInt(sizeMatch[1], 10);
        if (size >= 50) {
            return { cpu: 'high', memory: 'high', gpu: 'required', notes: `Estimated for ${size}B model` };
        } else if (size >= 20) {
            return { cpu: 'high', memory: 'high', gpu: 'optional', notes: `Estimated for ${size}B model` };
        } else if (size >= 10) {
            return { cpu: 'high', memory: 'high', gpu: 'optional', notes: `Estimated for ${size}B model` };
        } else if (size >= 5) {
            return { cpu: 'medium', memory: 'high', gpu: 'optional', notes: `Estimated for ${size}B model` };
        } else {
            return { cpu: 'medium', memory: 'medium', gpu: 'none', notes: `Estimated for small model (${size}B)` };
        }
    }
    // Heuristic for known model families if no size is found
    if (name.includes('mistral') || name.includes('phi') || name.includes('qwen')) {
        return { cpu: 'medium', memory: 'medium', gpu: 'optional', notes: 'Estimated for mid-size model' };
    }
    if (name.includes('code') || name.includes('chat') || name.includes('instruct')) {
        return { cpu: 'medium', memory: 'medium', gpu: 'none', notes: 'Estimated for code/chat model' };
    }
    // Fallback for unknown models
    return { cpu: 'unknown', memory: 'unknown', gpu: 'unknown', notes: 'Unknown model or server' };
}
