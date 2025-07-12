/**
 * CollaborativeKeyService
 *
 * Provides key generation and management for collaborative encryption scenarios.
 *
 * @remarks
 * - Generates random keys for use with node encryption.
 * - Safe for backend, ai-server, and plugins.
 */

import { randomBytes } from 'crypto';

export class CollaborativeKeyService {
    /**
     * Generates a new 256-bit (32-byte) hex key.
     */
    static generateKey(): string {
        return randomBytes(32).toString('hex');
    }
}

export default CollaborativeKeyService;
