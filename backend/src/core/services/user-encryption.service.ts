/**
 * User Encryption Service
 * Manages user-level encryption salts and keys for universe encryption
 */

import crypto from 'crypto';
import { UserRepository } from '../interfaces/user.repository.js';

export interface UserEncryptionConfig {
    encryption_salt?: string;
    encryption_salt_created_at?: Date;
}

/**
 * Service for managing user-level encryption configuration
 */
export class UserEncryptionService {
    private userRepository: UserRepository;
    private readonly saltLength = 32; // 256 bits

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Get or create encryption salt for a user
     */
    async getUserEncryptionSalt(userId: string): Promise<string> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Check if user already has an encryption salt
        const encryptionConfig = user.metadata?.encryption_config as UserEncryptionConfig | undefined;

        if (encryptionConfig?.encryption_salt) {
            return encryptionConfig.encryption_salt;
        }

        // Generate new salt for the user
        const newSalt = crypto.randomBytes(this.saltLength).toString('hex');

        // Update user metadata with the new salt
        const updatedMetadata = {
            ...user.metadata,
            encryption_config: {
                encryption_salt: newSalt,
                encryption_salt_created_at: new Date()
            } as UserEncryptionConfig
        };

        await this.userRepository.updateMetadata(userId, updatedMetadata);

        return newSalt;
    }

    /**
     * Generate encryption key for a user using their persistent salt
     */
    async generateUserEncryptionKey(userId: string, password: string = 'default-password'): Promise<Buffer> {
        const salt = await this.getUserEncryptionSalt(userId);

        // Use PBKDF2 with the user's persistent salt
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });
    }

    /**
     * Check if user has encryption configured
     */
    async hasEncryptionConfigured(userId: string): Promise<boolean> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return false;
        }

        const encryptionConfig = user.metadata?.encryption_config as UserEncryptionConfig | undefined;
        return !!encryptionConfig?.encryption_salt;
    }

    /**
     * Get user encryption configuration info (for debugging/admin)
     */
    async getUserEncryptionInfo(userId: string): Promise<{
        has_encryption_configured: boolean;
        salt_created_at?: Date;
        salt_length?: number;
    }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const encryptionConfig = user.metadata?.encryption_config as UserEncryptionConfig | undefined;

        return {
            has_encryption_configured: !!encryptionConfig?.encryption_salt,
            salt_created_at: encryptionConfig?.encryption_salt_created_at,
            salt_length: encryptionConfig?.encryption_salt?.length
        };
    }

    /**
     * Rotate user encryption salt (advanced operation - will invalidate all encrypted data!)
     */
    async rotateUserEncryptionSalt(userId: string): Promise<{
        old_salt: string;
        new_salt: string;
        warning: string;
    }> {
        const oldSalt = await this.getUserEncryptionSalt(userId);

        // Generate new salt
        const newSalt = crypto.randomBytes(this.saltLength).toString('hex');

        // Update user metadata
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const updatedMetadata = {
            ...user.metadata,
            encryption_config: {
                encryption_salt: newSalt,
                encryption_salt_created_at: new Date(),
                previous_salt: oldSalt // Keep old salt for potential recovery
            } as UserEncryptionConfig & { previous_salt: string }
        };

        await this.userRepository.updateMetadata(userId, updatedMetadata);

        return {
            old_salt: oldSalt,
            new_salt: newSalt,
            warning: 'Salt rotation will invalidate all previously encrypted universe data. Consider re-encrypting all private universes.'
        };
    }
}
