/**
 * HierarchicalKeyManager for multi-level key derivation (RAG/Universe)
 * Compatible with backend and AI server key sharing architecture.
 */
import { randomBytes, scryptSync } from 'crypto';

export class HierarchicalKeyManager {
    private static defaultKeyLength = 32;

    /**
     * Get key derivation path for RAG node
     */
    static getNodeKeyPath(universeId: string, nodeId: string, sensitivity: string): string[] {
        return ['universe', universeId, 'node', nodeId, sensitivity];
    }

    /**
     * Get key derivation path for RAG relationship
     */
    static getRelationshipKeyPath(universeId: string, relationshipId: string): string[] {
        return ['universe', universeId, 'relationship', relationshipId];
    }

    /**
     * Derive a key for a given context
     */
    static deriveContextKey(context: string[], password: string, keyLength: number = HierarchicalKeyManager.defaultKeyLength): Buffer {
        const salt = Buffer.from(context.join(':'), 'utf8');
        return scryptSync(password, salt, keyLength);
    }
}
