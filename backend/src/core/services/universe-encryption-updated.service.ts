/**
 * Updated Universe Encryption Service
 * 
 * Provides encryption/decryption capabilities for private universe data using
 * user-level persistent salts for consistent key generation.
 * 
 * Uses AES-256-CBC encryption with PBKDF2 key derivation.
 */

import crypto from 'crypto';
import { UserEncryptionService } from './user-encryption.service.js';

/**
 * Encrypted universe data structure
 */
export interface EncryptedUniverseData {
    universe_id: string;
    owner_id: string;
    encrypted_data: string;
    iv: string;
    encryption_algorithm: string;
    key_derivation: string;
    encrypted_at: Date;
}

/**
 * Universe encryption service with user-level salt management
 */
export class UniverseEncryptionService {
    private userEncryptionService: UserEncryptionService;
    private readonly algorithm = 'aes-256-cbc';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits

    constructor(userEncryptionService: UserEncryptionService) {
        this.userEncryptionService = userEncryptionService;
    }

    /**
     * Encrypt universe data using user's persistent salt
     */
    async encryptUniverseData(
        data: Record<string, unknown>,
        universeId: string,
        ownerId: string
    ): Promise<EncryptedUniverseData> {
        try {
            // Get user's encryption key (uses persistent salt)
            const encryptionKey = await this.userEncryptionService.generateUserEncryptionKey(ownerId);

            // Generate random IV for this encryption
            const iv = crypto.randomBytes(this.ivLength);

            // Convert data to JSON string
            const jsonData = JSON.stringify(data);
            // Create cipher with IV
            const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);

            // Encrypt data
            let encryptedData = cipher.update(jsonData, 'utf8', 'hex');
            encryptedData += cipher.final('hex');

            return {
                universe_id: universeId,
                owner_id: ownerId,
                encrypted_data: encryptedData,
                iv: iv.toString('hex'),
                encryption_algorithm: this.algorithm,
                key_derivation: 'pbkdf2',
                encrypted_at: new Date()
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Decrypt universe data using user's persistent salt
     */
    async decryptUniverseData(
        encryptedData: EncryptedUniverseData,
        universeId: string,
        ownerId: string
    ): Promise<Record<string, unknown>> {
        try {
            // Verify ownership
            if (encryptedData.owner_id !== ownerId) {
                throw new Error('Access denied: User is not the owner of this encrypted universe');
            }

            if (encryptedData.universe_id !== universeId) {
                throw new Error('Universe ID mismatch');
            }

            // Get user's encryption key (uses persistent salt)
            const encryptionKey = await this.userEncryptionService.generateUserEncryptionKey(ownerId);

            // Convert IV from hex
            const iv = Buffer.from(encryptedData.iv, 'hex');

            // Validate IV length
            if (iv.length !== this.ivLength) {
                throw new Error(`Invalid IV length: expected ${this.ivLength}, got ${iv.length}`);
            }
            // Create decipher with IV
            const decipher = crypto.createDecipheriv(this.algorithm, encryptionKey, iv);

            // Decrypt data
            let decryptedData = decipher.update(encryptedData.encrypted_data, 'hex', 'utf8');
            decryptedData += decipher.final('utf8');

            // Parse JSON
            return JSON.parse(decryptedData);
        } catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if user can decrypt the given encrypted data
     */
    async canDecrypt(encryptedData: EncryptedUniverseData, ownerId: string): Promise<boolean> {
        try {
            // Check ownership
            if (encryptedData.owner_id !== ownerId) {
                return false;
            }

            // Check if user has encryption configured
            return await this.userEncryptionService.hasEncryptionConfigured(ownerId);
        } catch {
            return false;
        }
    }

    /**
     * Get encryption information for debugging/admin purposes
     */
    async getEncryptionInfo(ownerId: string): Promise<{
        user_has_encryption: boolean;
        user_encryption_info: any;
        algorithm: string;
        key_derivation: string;
    }> {
        const userEncryptionInfo = await this.userEncryptionService.getUserEncryptionInfo(ownerId);

        return {
            user_has_encryption: userEncryptionInfo.has_encryption_configured,
            user_encryption_info: userEncryptionInfo,
            algorithm: this.algorithm,
            key_derivation: 'pbkdf2'
        };
    }

    /**
     * Validate encrypted data structure
     */
    validateEncryptedData(encryptedData: any): encryptedData is EncryptedUniverseData {
        return (
            typeof encryptedData === 'object' &&
            encryptedData !== null &&
            typeof encryptedData.universe_id === 'string' &&
            typeof encryptedData.owner_id === 'string' &&
            typeof encryptedData.encrypted_data === 'string' &&
            typeof encryptedData.iv === 'string' &&
            typeof encryptedData.encryption_algorithm === 'string' &&
            typeof encryptedData.key_derivation === 'string' &&
            encryptedData.encrypted_at instanceof Date
        );
    }

    /**
     * Re-encrypt universe data (useful for key rotation)
     */
    async reEncryptUniverseData(
        encryptedData: EncryptedUniverseData,
        universeId: string,
        ownerId: string
    ): Promise<EncryptedUniverseData> {
        // First decrypt with current key
        const decryptedData = await this.decryptUniverseData(encryptedData, universeId, ownerId);

        // Then encrypt with current key (which may have been rotated)
        return await this.encryptUniverseData(decryptedData, universeId, ownerId);
    }
}
