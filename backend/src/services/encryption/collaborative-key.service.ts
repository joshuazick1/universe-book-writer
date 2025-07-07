/**
 * Collaborative Key Service
 * 
 * Manages RSA key pairs for users to enable collaborative encryption.
 * Handles user key generation, storage, and management for multi-user access
 * to encrypted universe content.
 */

import { BaseEncryptionService, KeyPair, EncryptedData } from './base-encryption.service.js';
import { userKeysService, UserKeysDocument } from '../../schemas/user-keys.schema.js';
import { contentKeysService, WrappedContentKey } from '../../schemas/content-keys.schema.js';

// TODO: Create proper logger utility
class Logger {
    constructor(private context: string) { }
    info(message: string, ...args: any[]) { console.log(`[${this.context}] INFO:`, message, ...args); }
    debug(message: string, ...args: any[]) { console.log(`[${this.context}] DEBUG:`, message, ...args); }
    warn(message: string, ...args: any[]) { console.warn(`[${this.context}] WARN:`, message, ...args); }
    error(message: string, ...args: any[]) { console.error(`[${this.context}] ERROR:`, message, ...args); }
}

/**
 * User key storage format
 */
export interface StoredUserKeys {
    /** User identifier */
    userId: string;
    /** RSA public key in PEM format */
    publicKey: string;
    /** Private key encrypted with user's password */
    encryptedPrivateKey: EncryptedData;
    /** Key pair type */
    keyType: 'RSA';
    /** When the keys were created */
    createdAt: Date;
    /** Key pair version for rotation */
    version: number;
    /** Current key status */
    status: 'active' | 'rotated' | 'revoked';
}

/**
 * User authentication credentials for key operations
 */
export interface UserCredentials {
    userId: string;
    password: string;
}

/**
 * Collaborative Key Service
 * 
 * DESIGN: This service manages user key pairs that enable collaborative
 * encryption. Users can generate key pairs, encrypt their private keys
 * with passwords, and share content by wrapping content keys with their
 * public keys.
 * 
 * KEY SHARING INTEGRATION:
 * - User public keys are used to wrap content keys for collaboration
 * - User private keys decrypt wrapped content keys for access
 * - Both backend and ai-server can access user public keys for wrapping
 * - Private keys remain encrypted and only user can decrypt them
 */
export class CollaborativeKeyService {
    private readonly logger = new Logger('CollaborativeKeyService');
    private readonly baseEncryption: BaseEncryptionService;

    constructor(baseEncryption: BaseEncryptionService) {
        this.baseEncryption = baseEncryption;
    }

    /**
     * Generate a new RSA key pair for a user
     * 
     * CRITICAL: This creates the foundation for collaborative encryption.
     * The public key will be used to wrap content keys, and the private key
     * (encrypted with user's password) will be used to unwrap them.
     * 
     * @param userId - User to generate keys for
     * @param password - User's password for encrypting private key
     * @returns Stored user keys with encrypted private key
     */
    async generateUserKeyPair(userId: string, password: string): Promise<StoredUserKeys> {
        try {
            // Check if user already has keys
            const existingKeys = await this.getUserKeys(userId);
            if (existingKeys && existingKeys.status === 'active') {
                throw new Error(`User ${userId} already has active keys`);
            }

            this.logger.info(`Generating RSA key pair for user ${userId}`);

            // Generate RSA key pair
            const keyPair = await this.baseEncryption.generateRSAKeyPair();

            // Encrypt private key with user's password
            const { encryptedPrivateKey } = await this.baseEncryption.encryptPrivateKey(
                keyPair.privateKey,
                password
            );

            // Create stored user keys
            const storedKeys: StoredUserKeys = {
                userId,
                publicKey: keyPair.publicKey,
                encryptedPrivateKey,
                keyType: 'RSA',
                createdAt: new Date(),
                version: 1,
                status: 'active'
            };

            // Store keys in database
            await this.storeUserKeys(storedKeys);

            this.logger.info(`Generated and stored RSA key pair for user ${userId}`);

            return storedKeys;

        } catch (error) {
            this.logger.error(`Failed to generate key pair for user ${userId}:`, error);
            throw new Error(`Key pair generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a user's public key
     * 
     * USAGE: Called by ContentKeyManager to wrap content keys for collaboration.
     * Both backend and ai-server need access to user public keys.
     * 
     * @param userId - User to get public key for
     * @returns User's RSA public key in PEM format, or null if not found
     */
    async getUserPublicKey(userId: string): Promise<string | null> {
        try {
            const userKeys = await this.getUserKeys(userId);

            if (!userKeys || userKeys.status !== 'active') {
                this.logger.warn(`No active public key found for user ${userId}`);
                return null;
            }

            return userKeys.publicKey;

        } catch (error) {
            this.logger.error(`Failed to get public key for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Get a user's decrypted private key
     * 
     * CRITICAL: Only returns private key after password verification.
     * Used for unwrapping content keys that were wrapped with the user's public key.
     * 
     * @param credentials - User credentials (userId and password)
     * @returns Decrypted private key in PEM format, or null if authentication fails
     */
    async getUserPrivateKey(credentials: UserCredentials): Promise<string | null> {
        try {
            const userKeys = await this.getUserKeys(credentials.userId);

            if (!userKeys || userKeys.status !== 'active') {
                this.logger.warn(`No active keys found for user ${credentials.userId}`);
                return null;
            }

            // Decrypt private key using user's password
            const privateKey = await this.baseEncryption.decryptPrivateKey(
                userKeys.encryptedPrivateKey,
                credentials.password
            );

            this.logger.debug(`Successfully decrypted private key for user ${credentials.userId}`);
            return privateKey;

        } catch (error) {
            this.logger.error(`Failed to decrypt private key for user ${credentials.userId}:`, error);
            // Don't expose specific error details for security
            return null;
        }
    }

    /**
     * Validate a user's password by attempting to decrypt their private key
     * 
     * @param credentials - User credentials to validate
     * @returns True if password is correct
     */
    async validateUserPassword(credentials: UserCredentials): Promise<boolean> {
        try {
            const privateKey = await this.getUserPrivateKey(credentials);
            return privateKey !== null;

        } catch (error) {
            this.logger.debug(`Password validation failed for user ${credentials.userId}`);
            return false;
        }
    }

    /**
     * Validate a user's key pair integrity
     * 
     * Ensures the stored public and private keys are a valid pair.
     * 
     * @param credentials - User credentials to validate keys for
     * @returns True if key pair is valid
     */
    async validateUserKeyPair(credentials: UserCredentials): Promise<boolean> {
        try {
            const userKeys = await this.getUserKeys(credentials.userId);
            if (!userKeys) {
                return false;
            }

            const privateKey = await this.getUserPrivateKey(credentials);
            if (!privateKey) {
                return false;
            }

            // Validate key pair using BaseEncryptionService
            return await this.baseEncryption.validateKeyPair(
                userKeys.publicKey,
                privateKey
            );

        } catch (error) {
            this.logger.error(`Key pair validation failed for user ${credentials.userId}:`, error);
            return false;
        }
    }

    /**
     * Change a user's password
     * 
     * Re-encrypts the private key with a new password while keeping
     * the same RSA key pair.
     * 
     * @param userId - User to change password for
     * @param oldPassword - Current password
     * @param newPassword - New password
     * @returns True if password change succeeded
     */
    async changeUserPassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ): Promise<boolean> {
        try {
            // Get current private key with old password
            const privateKey = await this.getUserPrivateKey({ userId, password: oldPassword });
            if (!privateKey) {
                this.logger.warn(`Failed to decrypt private key with old password for user ${userId}`);
                return false;
            }

            // Re-encrypt private key with new password
            const { encryptedPrivateKey } = await this.baseEncryption.encryptPrivateKey(
                privateKey,
                newPassword
            );

            // Update stored keys
            const userKeys = await this.getUserKeys(userId);
            if (!userKeys) {
                throw new Error('User keys not found');
            }

            userKeys.encryptedPrivateKey = encryptedPrivateKey;
            await this.storeUserKeys(userKeys);

            this.logger.info(`Successfully changed password for user ${userId}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to change password for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Rotate (replace) a user's key pair
     * 
     * Generates new RSA keys while marking old keys as rotated.
     * Note: This will require re-wrapping all content keys the user has access to.
     * 
     * @param credentials - User credentials for current keys
     * @returns New stored user keys
     */
    async rotateUserKeyPair(credentials: UserCredentials): Promise<StoredUserKeys> {
        try {
            // Validate current credentials
            const isValid = await this.validateUserPassword(credentials);
            if (!isValid) {
                throw new Error('Invalid credentials for key rotation');
            }

            // Get current keys
            const currentKeys = await this.getUserKeys(credentials.userId);
            if (!currentKeys) {
                throw new Error('Current keys not found');
            }

            // Generate new key pair
            const newKeyPair = await this.baseEncryption.generateRSAKeyPair();

            // Encrypt new private key with same password
            const { encryptedPrivateKey } = await this.baseEncryption.encryptPrivateKey(
                newKeyPair.privateKey,
                credentials.password
            );

            // Create new stored keys with incremented version
            const newStoredKeys: StoredUserKeys = {
                userId: credentials.userId,
                publicKey: newKeyPair.publicKey,
                encryptedPrivateKey,
                keyType: 'RSA',
                createdAt: new Date(),
                version: currentKeys.version + 1,
                status: 'active'
            };

            // Mark old keys as rotated
            currentKeys.status = 'rotated';
            await this.storeUserKeys(currentKeys);

            // Store new keys
            await this.storeUserKeys(newStoredKeys);

            this.logger.info(`Rotated key pair for user ${credentials.userId} from version ${currentKeys.version} to ${newStoredKeys.version}`);

            // TODO: Trigger re-wrapping of all content keys this user has access to
            // This would involve coordinating with ContentKeyManager

            return newStoredKeys;

        } catch (error) {
            this.logger.error(`Failed to rotate key pair for user ${credentials.userId}:`, error);
            throw error;
        }
    }

    /**
     * Revoke a user's key pair
     * 
     * Marks keys as revoked and prevents further use.
     * This effectively removes the user's access to all encrypted content.
     * 
     * @param userId - User to revoke keys for
     * @param adminUserId - Admin authorizing the revocation
     */
    async revokeUserKeyPair(userId: string, adminUserId: string): Promise<void> {
        try {
            const userKeys = await this.getUserKeys(userId);
            if (!userKeys) {
                throw new Error('User keys not found');
            }

            // Mark keys as revoked
            userKeys.status = 'revoked';
            await this.storeUserKeys(userKeys);

            this.logger.info(`Revoked key pair for user ${userId} by admin ${adminUserId}`);

            // TODO: Remove user's wrapped keys from all content keys
            // This would involve coordinating with ContentKeyManager

        } catch (error) {
            this.logger.error(`Failed to revoke key pair for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * List all users who have active key pairs
     * 
     * @returns Array of user IDs with active keys
     */
    async listUsersWithKeys(): Promise<string[]> {
        try {
            // TODO: Implement database query for all active user keys
            this.logger.debug('Listing users with active keys');
            return [];

        } catch (error) {
            this.logger.error('Failed to list users with keys:', error);
            return [];
        }
    }

    /**
     * Check if a user has active keys
     * 
     * @param userId - User to check
     * @returns True if user has active keys
     */
    async hasActiveKeys(userId: string): Promise<boolean> {
        try {
            const userKeys = await this.getUserKeys(userId);
            return userKeys !== null && userKeys.status === 'active';

        } catch (error) {
            this.logger.error(`Failed to check active keys for user ${userId}:`, error);
            return false;
        }
    }

    // === PRIVATE HELPER METHODS ===

    /**
     * Store user keys in database
     * 
     * CRITICAL: This database must be accessible to both backend and ai-server
     * for public key retrieval during content key wrapping.
     */
    private async storeUserKeys(userKeys: StoredUserKeys): Promise<void> {
        // TODO: Implement MongoDB storage
        // This should store in a collection accessible to both services
        this.logger.debug(`Storing keys for user ${userKeys.userId}, version ${userKeys.version}`);
    }

    /**
     * Retrieve user keys from database
     */
    private async getUserKeys(userId: string): Promise<StoredUserKeys | null> {
        // TODO: Implement MongoDB retrieval
        // This should query for the most recent active keys for the user
        this.logger.debug(`Retrieving keys for user ${userId}`);
        return null;
    }
}

/**
 * Singleton instance for consistent key management across backend
 */
export const collaborativeKeyService = new CollaborativeKeyService(
    new BaseEncryptionService()
);
