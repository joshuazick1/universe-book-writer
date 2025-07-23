/**
 * generateId
 *
 * Generates a cryptographically strong, URL-safe unique identifier string.
 *
 * @param length - The length of the ID (default: 21, like nanoid)
 * @returns A unique string ID
 *
 * @example
 *   const id = generateId(); // e.g. "V1StGXR8_Z5jdHi6B-myT"
 *   const shortId = generateId(10);
 *
 * @remarks
 * - Uses Node.js crypto for strong randomness.
 * - Safe for use in backend, ai-server, and plugins.
 * - Throws if length is not a positive integer.
 */
export function generateId(length: number = 21): string {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error('generateId: length must be a positive integer');
    }
    // Use Node.js crypto for strong randomness
    const bytes = require('crypto').randomBytes(length);
    // URL-safe base64 (replace +, /, =)
    return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, length);
}

export default generateId;
