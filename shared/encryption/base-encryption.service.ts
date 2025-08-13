/**
 * BaseEncryptionService
 *
 * Abstract base class for encryption services. All encryption services should extend this class.
 *
 * @remarks
 * - Provides interface for encrypt/decrypt.
 * - Not intended for direct use.
 */

/**
 * Encryption strategy interface for pluggable encryption
 */
export interface EncryptionStrategy {
    id: string;
    algorithm: string;
    encrypt(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData>;
    decrypt(encryptedData: EncryptedData, key: Buffer): Promise<string>;
    generateIV(): Buffer;
    validateKey(key: Buffer): boolean;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
    data: string;
    iv: string;
    authTag?: string;
    algorithm: string;
    strategyId: string;
    checksum: string;
    encryptedAt: Date;
}

export interface KeyDerivationParams {
    password: string;
    salt: Buffer;
    keyLength: number;
    cost: number;
    context?: string[];
}

export class HierarchicalKeyManager {
    private masterKey: Buffer | null = null;
    private keyCache = new Map<string, Buffer>();

    async initializeMasterKey(password: string, salt?: Buffer): Promise<void> {
        const actualSalt = salt || Buffer.from('default_salt');
        this.masterKey = Buffer.from(password, 'utf8');
    }

    async deriveContextKey(context: string[], keyLength: number = 32): Promise<Buffer> {
        if (!this.masterKey) throw new Error('Master key not initialized');
        const contextPath = context.join('/');
        const cached = this.keyCache.get(contextPath);
        if (cached) return cached;
        const contextSalt = Buffer.from(contextPath, 'utf8');
        const derivedKey = Buffer.concat([this.masterKey, contextSalt]).subarray(0, keyLength);
        this.keyCache.set(contextPath, derivedKey);
        return derivedKey;
    }

    static getNodeKeyPath(universeId: string, nodeId: string, sensitivity: string): string[] {
        return ['universe', universeId, 'nodes', sensitivity, nodeId];
    }
    static getRelationshipKeyPath(universeId: string, relationshipId: string): string[] {
        return ['universe', universeId, 'relationships', relationshipId];
    }
    clearCache(): void {
        this.keyCache.clear();
    }
}

export abstract class BaseEncryptionService {
    abstract encryptContent(content: string, context: string[], sensitivity?: string, strategyId?: string): Promise<EncryptedData>;
    abstract decryptContent(encryptedData: EncryptedData, context: string[]): Promise<string>;
    abstract classifyAndEncrypt(content: string, nodeType: string, metadata: any): { classification: any; shouldEncrypt: boolean; recommendedStrategy?: string };
}
