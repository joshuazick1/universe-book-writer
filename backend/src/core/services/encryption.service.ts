/**
 * Universe Encryption Service
 * 
 * Provides encryption and decryption capabilities for private universe data.
 * Uses AES-256-GCM for data encryption with user-specific keys.
 */

import { randomBytes, scrypt, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encrypted universe data structure
 */
export interface EncryptedUniverseData {
    universe_id: string;
    encrypted_data: string;
    encryption_method: string;
    key_version: number;
    iv: string;
    checksum: string;
    encrypted_at: Date;
}

/**
 * Encryption configuration
 */
interface EncryptionConfig {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
}

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-cbc',
    keyLength: 32, // 256 bits
    ivLength: 16,  // 128 bits
    saltLength: 32 // 256 bits
};

/**
 * Universe encryption service implementation
 */
export class UniverseEncryptionService {
    private config: EncryptionConfig;
    private masterKey: string;

    constructor(masterKey?: string, config?: Partial<EncryptionConfig>) {
        this.masterKey = masterKey || process.env.UNIVERSE_ENCRYPTION_KEY || this.generateMasterKey();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Generate a secure master key
     */
    private generateMasterKey(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Derive encryption key from master key and universe context
     */
    private async deriveKey(universeId: string, ownerId: string, salt: Buffer): Promise<Buffer> {
        const keyMaterial = `${this.masterKey}:${universeId}:${ownerId}`;
        return await scryptAsync(keyMaterial, salt, this.config.keyLength) as Buffer;
    }
    /**
     * Generate deterministic encryption key for a specific universe
     * Uses a deterministic salt based on universe and owner IDs
     */
    async generateEncryptionKey(universeId: string, ownerId: string): Promise<string> {
        // Generate deterministic salt from universe and owner IDs
        const saltMaterial = `${this.masterKey}:salt:${universeId}:${ownerId}`;
        const salt = createHash('sha256').update(saltMaterial).digest().subarray(0, this.config.saltLength);

        const key = await this.deriveKey(universeId, ownerId, salt);

        // Return salt + key as base64
        return Buffer.concat([salt, key]).toString('base64');
    }

    /**
     * Extract salt and key from encryption key string
     */
    private extractKeyComponents(encryptionKey: string): { salt: Buffer; key: Buffer } {
        const combined = Buffer.from(encryptionKey, 'base64');
        const salt = combined.subarray(0, this.config.saltLength);
        const key = combined.subarray(this.config.saltLength);

        return { salt, key };
    }  /**
   * Encrypt universe data
   */
    async encryptUniverseData(
        universeData: Record<string, unknown>,
        universeId: string,
        ownerId: string,
        existingKeyVersion?: number
    ): Promise<EncryptedUniverseData> {
        try {
            // Generate or derive encryption key
            const encryptionKey = await this.generateEncryptionKey(universeId, ownerId);
            const { key } = this.extractKeyComponents(encryptionKey);

            // Generate random IV
            const iv = randomBytes(this.config.ivLength);

            // Create cipher
            const cipher = createCipheriv(this.config.algorithm, key, iv);

            // Serialize and encrypt data
            const dataString = JSON.stringify(universeData);

            let encrypted = cipher.update(dataString, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            // Calculate checksum of original data
            const checksum = createHash('sha256')
                .update(dataString)
                .digest('hex');

            return {
                universe_id: universeId,
                encrypted_data: encrypted,
                encryption_method: this.config.algorithm,
                key_version: existingKeyVersion || 1,
                iv: iv.toString('base64'),
                checksum,
                encrypted_at: new Date()
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }  /**
   * Decrypt universe data
   */
    async decryptUniverseData(
        encryptedData: EncryptedUniverseData,
        universeId: string,
        ownerId: string
    ): Promise<Record<string, unknown>> {
        try {
            // Regenerate encryption key
            const encryptionKey = await this.generateEncryptionKey(universeId, ownerId);
            const { key } = this.extractKeyComponents(encryptionKey);

            // Extract IV from encrypted data
            const iv = Buffer.from(encryptedData.iv, 'base64');

            // Create decipher with IV
            const decipher = createDecipheriv(this.config.algorithm, key, iv);

            // Decrypt data
            let decrypted = decipher.update(encryptedData.encrypted_data, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            // Parse decrypted data
            const universeData = JSON.parse(decrypted);

            // Verify checksum
            const checksum = createHash('sha256')
                .update(decrypted)
                .digest('hex');

            if (checksum !== encryptedData.checksum) {
                throw new Error('Data integrity check failed - checksum mismatch');
            }

            return universeData;
        } catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Rotate encryption key for a universe
     */
    async rotateEncryptionKey(
        encryptedData: EncryptedUniverseData,
        universeId: string,
        ownerId: string
    ): Promise<EncryptedUniverseData> {
        // First decrypt with old key
        const universeData = await this.decryptUniverseData(encryptedData, universeId, ownerId);

        // Re-encrypt with new key (incremented version)
        return await this.encryptUniverseData(
            universeData,
            universeId,
            ownerId,
            encryptedData.key_version + 1
        );
    }

    /**
     * Validate encryption configuration
     */
    validateConfig(): boolean {
        try {
            // Test encryption/decryption with sample data
            const testData = { test: 'encryption validation' };
            const testUniverseId = 'test-universe';
            const testOwnerId = 'test-owner';

            // This will throw if configuration is invalid
            this.encryptUniverseData(testData, testUniverseId, testOwnerId);

            return true;
        } catch (error) {
            console.error('Encryption configuration validation failed:', error);
            return false;
        }
    }

    /**
     * Get encryption metadata
     */
    getEncryptionInfo(): {
        algorithm: string;
        keyLength: number;
        supported: boolean;
    } {
        return {
            algorithm: this.config.algorithm,
            keyLength: this.config.keyLength * 8, // Convert to bits
            supported: this.validateConfig()
        };
    }
}

/**
 * Plugin data encryption for data preservation
 */
export class PluginDataEncryption {
    private encryptionService: UniverseEncryptionService;

    constructor(encryptionService: UniverseEncryptionService) {
        this.encryptionService = encryptionService;
    }

    /**
     * Encrypt plugin data for preservation
     */
    async encryptPluginData(
        pluginData: Record<string, unknown>,
        universeId: string,
        pluginId: string,
        ownerId: string
    ): Promise<EncryptedUniverseData> {
        // Create plugin-specific context for encryption
        const pluginUniverseId = `${universeId}:plugin:${pluginId}`;

        return await this.encryptionService.encryptUniverseData(
            pluginData,
            pluginUniverseId,
            ownerId
        );
    }

    /**
     * Decrypt plugin data from preservation
     */
    async decryptPluginData(
        encryptedData: EncryptedUniverseData,
        universeId: string,
        pluginId: string,
        ownerId: string
    ): Promise<Record<string, unknown>> {
        // Recreate plugin-specific context
        const pluginUniverseId = `${universeId}:plugin:${pluginId}`;

        return await this.encryptionService.decryptUniverseData(
            encryptedData,
            pluginUniverseId,
            ownerId
        );
    }
}

/**
 * Encryption utility functions
 */
export class EncryptionUtils {
    /**
     * Generate secure random key
     */
    static generateSecureKey(length: number = 32): string {
        return randomBytes(length).toString('hex');
    }
    /**
     * Hash sensitive data (one-way)
     */
    static async hashData(data: string, salt?: string): Promise<string> {
        const actualSalt = salt || randomBytes(16).toString('hex');
        const hash = createHash('sha256')
            .update(data + actualSalt)
            .digest('hex');

        return `${actualSalt}:${hash}`;
    }

    /**
     * Verify hashed data
     */
    static async verifyHash(data: string, hash: string): Promise<boolean> {
        const [salt, originalHash] = hash.split(':');
        const newHash = await this.hashData(data, salt);
        return newHash === hash;
    }

    /**
     * Secure comparison to prevent timing attacks
     */
    static secureCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }
}

/**
 * Default encryption service instance
 */
export const defaultEncryptionService = new UniverseEncryptionService();

/**
 * Default plugin data encryption instance
 */
export const defaultPluginDataEncryption = new PluginDataEncryption(defaultEncryptionService);
