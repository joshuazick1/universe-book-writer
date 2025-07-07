/**
 * Content Key Manager Service
 * 
 * CRITICAL: Manages content keys that are shared between backend and ai-server.
 * Both services must be able to retrieve and use the same content keys for
 * the same universe/book to ensure seamless encryption/decryption.
 */

import { BaseEncryptionService, EncryptedData, WrappedContentKey } from './base-encryption.service.js';
import { contentKeysService, ContentKeysDocument } from '../../schemas/content-keys.schema.js';
import { userKeysService } from '../../schemas/user-keys.schema.js';

// TODO: Create proper logger utility
class Logger {
    constructor(private context: string) { }
    info(message: string, ...args: any[]) { console.log(`[${this.context}] INFO:`, message, ...args); }
    debug(message: string, ...args: any[]) { console.log(`[${this.context}] DEBUG:`, message, ...args); }
    warn(message: string, ...args: any[]) { console.warn(`[${this.context}] WARN:`, message, ...args); }
    error(message: string, ...args: any[]) { console.error(`[${this.context}] ERROR:`, message, ...args); }
}

/**
 * Content key metadata
 */
export interface ContentKeyMetadata {
    /** Unique identifier for the content key */
    contentKeyId: string;
    /** Universe/book this key belongs to */
    universeId: string;
    /** Encryption algorithm used */
    algorithm: string;
    /** When the key was created */
    createdAt: Date;
    /** When the key was last rotated */
    rotatedAt?: Date;
    /** Key version for rotation tracking */
    version: number;
}

/**
 * Content key storage format
 */
export interface StoredContentKey {
    /** Key metadata */
    metadata: ContentKeyMetadata;
    /** Content key wrapped for each collaborator */
    wrappedKeys: WrappedContentKey[];
    /** Current key status */
    status: 'active' | 'rotated' | 'revoked';
}

/**
 * Content Key Manager
 * 
 * DESIGN: This service manages content keys that MUST be accessible to both
 * backend (for storage/indexing) and ai-server (for RAG operations).
 * 
 * KEY SHARING STRATEGY:
 * 1. Content keys are stored in a shared database
 * 2. Keys are wrapped (encrypted) with each collaborator's public key
 * 3. Both backend and ai-server can retrieve and unwrap the same keys
 * 4. This ensures both services can encrypt/decrypt the same content
 */
export class ContentKeyManager {
    private readonly logger = new Logger('ContentKeyManager');
    private readonly baseEncryption: BaseEncryptionService;

    constructor(baseEncryption: BaseEncryptionService) {
        this.baseEncryption = baseEncryption;
    }

    /**
     * Generate a new content key for a universe
     * 
     * CRITICAL: This key will be used by BOTH backend and ai-server
     * for encrypting/decrypting RAG nodes in this universe.
     * 
     * @param universeId - Universe to create key for
     * @param collaboratorPublicKeys - Public keys of initial collaborators
     * @returns Content key metadata and wrapped keys
     */
    async generateContentKey(
        universeId: string,
        collaboratorPublicKeys: { userId: string; publicKey: string }[]
    ): Promise<StoredContentKey> {
        try {
            // Generate a new random content key
            const contentKey = this.baseEncryption.generateContentKey();
            const contentKeyId = this.generateContentKeyId();

            // Create metadata
            const metadata: ContentKeyMetadata = {
                contentKeyId,
                universeId,
                algorithm: 'aes-256-gcm',
                createdAt: new Date(),
                version: 1
            };

            // Wrap the content key for each collaborator
            const wrappedKeys: WrappedContentKey[] = [];
            for (const collaborator of collaboratorPublicKeys) {
                const wrappedKey = await this.wrapContentKey(
                    contentKey,
                    collaborator.publicKey
                );

                wrappedKeys.push({
                    userId: collaborator.userId,
                    wrappedKey,
                    algorithm: 'rsa-oaep'
                });
            }

            const storedKey: StoredContentKey = {
                metadata,
                wrappedKeys,
                status: 'active'
            };

            // TODO: Store in database (shared between backend and ai-server)
            await this.storeContentKey(storedKey);

            this.logger.info(`Generated content key for universe ${universeId} with ${wrappedKeys.length} collaborators`);

            return storedKey;

        } catch (error) {
            this.logger.error(`Failed to generate content key for universe ${universeId}:`, error);
            throw new Error(`Content key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieve content key for a universe and user
     * 
     * USAGE: Called by both backend and ai-server to get the same content key
     * for encrypting/decrypting nodes in the specified universe.
     * 
     * @param universeId - Universe to get key for
     * @param userId - User requesting access
     * @param userPrivateKey - User's private key for unwrapping
     * @returns Unwrapped content key or null if no access
     */
    async getContentKey(
        universeId: string,
        userId: string,
        userPrivateKey: string
    ): Promise<Buffer | null> {
        try {
            // Retrieve stored content key from database
            const storedKey = await this.retrieveContentKey(universeId);
            if (!storedKey || storedKey.status !== 'active') {
                return null;
            }

            // Find wrapped key for this user
            const userWrappedKey = storedKey.wrappedKeys.find(
                wk => wk.userId === userId
            );

            if (!userWrappedKey) {
                this.logger.warn(`User ${userId} has no access to content key for universe ${universeId}`);
                return null;
            }

            // Unwrap (decrypt) the content key using user's private key
            const contentKey = await this.unwrapContentKey(
                userWrappedKey.wrappedKey,
                userPrivateKey
            );

            this.logger.debug(`Retrieved content key for universe ${universeId}, user ${userId}`);
            return contentKey;

        } catch (error) {
            this.logger.error(`Failed to retrieve content key for universe ${universeId}, user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Add a new collaborator to an existing content key
     * 
     * @param universeId - Universe to add collaborator to
     * @param newCollaborator - New collaborator details
     * @param adminUserId - Admin user authorizing the addition
     * @param adminPrivateKey - Admin's private key for unwrapping content key
     */
    async addCollaborator(
        universeId: string,
        newCollaborator: { userId: string; publicKey: string },
        adminUserId: string,
        adminPrivateKey: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Get the current content key
            const contentKey = await this.getContentKey(universeId, adminUserId, adminPrivateKey);
            if (!contentKey) {
                return { success: false, error: 'Admin does not have access to content key' };
            }

            // Retrieve stored key metadata
            const storedKey = await this.retrieveContentKey(universeId);
            if (!storedKey) {
                return { success: false, error: 'Content key not found' };
            }

            // Check if collaborator already has access
            const existingAccess = storedKey.wrappedKeys.find(
                wk => wk.userId === newCollaborator.userId
            );

            if (existingAccess) {
                this.logger.warn(`User ${newCollaborator.userId} already has access to universe ${universeId}`);
                return { success: false, error: 'User already has access to this content key' };
            }

            // Wrap content key for new collaborator
            const wrappedKey = await this.wrapContentKey(
                contentKey,
                newCollaborator.publicKey
            );

            // Add wrapped key to stored key
            storedKey.wrappedKeys.push({
                userId: newCollaborator.userId,
                wrappedKey,
                algorithm: 'rsa-oaep'
            });

            // Update stored key
            await this.storeContentKey(storedKey);

            this.logger.info(`Added collaborator ${newCollaborator.userId} to universe ${universeId}`);
            return { success: true };

        } catch (error) {
            this.logger.error(`Failed to add collaborator to universe ${universeId}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Remove a collaborator from a content key
     * 
     * @param universeId - Universe to remove collaborator from
     * @param collaboratorUserId - User to remove access for
     * @param adminUserId - Admin user authorizing the removal
     */
    async removeCollaborator(
        universeId: string,
        collaboratorUserId: string,
        adminUserId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Retrieve stored key
            const storedKey = await this.retrieveContentKey(universeId);
            if (!storedKey) {
                return { success: false, error: 'Content key not found' };
            }

            // Remove wrapped key for collaborator
            storedKey.wrappedKeys = storedKey.wrappedKeys.filter(
                wk => wk.userId !== collaboratorUserId
            );

            // Update stored key
            await this.storeContentKey(storedKey);

            this.logger.info(`Removed collaborator ${collaboratorUserId} from universe ${universeId}`);
            return { success: true };

        } catch (error) {
            this.logger.error(`Failed to remove collaborator from universe ${universeId}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * List users who have access to a universe's content key
     * 
     * @param universeId - Universe to check access for
     * @returns Array of user IDs with access
     */
    async getCollaborators(universeId: string): Promise<string[]> {
        try {
            const storedKey = await this.retrieveContentKey(universeId);
            if (!storedKey) {
                return [];
            }

            return storedKey.wrappedKeys.map(wk => wk.userId);

        } catch (error) {
            this.logger.error(`Failed to get collaborators for universe ${universeId}:`, error);
            return [];
        }
    }

    /**
     * Check if a user has access to a universe's content
     * 
     * USAGE: Called by both backend and ai-server to verify access before
     * allowing encryption/decryption operations.
     * 
     * @param universeId - Universe to check access for
     * @param userId - User to check access for
     * @returns True if user has access
     */
    async hasAccess(universeId: string, userId: string): Promise<boolean> {
        try {
            const collaborators = await this.getCollaborators(universeId);
            return collaborators.includes(userId);

        } catch (error) {
            this.logger.error(`Failed to check access for universe ${universeId}, user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Rotate (change) a content key for enhanced security
     * 
     * NOTE: This is a complex operation that requires re-encrypting all
     * content in the universe with the new key.
     * 
     * @param universeId - Universe to rotate key for
     * @param adminUserId - Admin authorizing rotation
     * @param adminPrivateKey - Admin's private key
     */
    async rotateContentKey(
        universeId: string,
        adminUserId: string,
        adminPrivateKey: string
    ): Promise<StoredContentKey> {
        try {
            // Get current stored key
            const oldStoredKey = await this.retrieveContentKey(universeId);
            if (!oldStoredKey) {
                throw new Error('Content key not found');
            }

            // Generate new content key
            const newContentKey = this.baseEncryption.generateContentKey();
            const newContentKeyId = this.generateContentKeyId();

            // Create new metadata with incremented version
            const newMetadata: ContentKeyMetadata = {
                contentKeyId: newContentKeyId,
                universeId,
                algorithm: 'aes-256-gcm',
                createdAt: new Date(),
                rotatedAt: new Date(),
                version: oldStoredKey.metadata.version + 1
            };

            // Wrap new key for all existing collaborators
            const wrappedKeys: WrappedContentKey[] = [];
            for (const oldWrappedKey of oldStoredKey.wrappedKeys) {
                // Get user's public key (would need to be retrieved from user key storage)
                // For now, we'll assume we have access to it
                const userPublicKey = await this.getUserPublicKey(oldWrappedKey.userId);

                const wrappedKey = await this.wrapContentKey(newContentKey, userPublicKey);

                wrappedKeys.push({
                    userId: oldWrappedKey.userId,
                    wrappedKey,
                    algorithm: 'rsa-oaep'
                });
            }

            // Create new stored key
            const newStoredKey: StoredContentKey = {
                metadata: newMetadata,
                wrappedKeys,
                status: 'active'
            };

            // Mark old key as rotated
            oldStoredKey.status = 'rotated';
            await this.storeContentKey(oldStoredKey);

            // Store new key
            await this.storeContentKey(newStoredKey);

            this.logger.info(`Rotated content key for universe ${universeId} from version ${oldStoredKey.metadata.version} to ${newStoredKey.metadata.version}`);

            // TODO: Trigger re-encryption of all content in the universe
            // This would involve coordinating with both backend and ai-server
            // to re-encrypt all RAG nodes with the new key

            return newStoredKey;

        } catch (error) {
            this.logger.error(`Failed to rotate content key for universe ${universeId}:`, error);
            throw error;
        }
    }

    /**
     * Get or create a content key for a universe
     * 
     * @param universeId - Universe to get/create key for
     * @param userId - User requesting the key
     * @param userPrivateKey - User's private key for unwrapping
     * @param collaboratorIds - List of collaborator user IDs
     * @returns Unwrapped content key buffer, or null if access denied
     */
    async getOrCreateContentKey(
        universeId: string,
        userId: string,
        userPrivateKey: string,
        collaboratorIds: string[]
    ): Promise<Buffer | null> {
        try {
            // First try to get existing key
            const existingKey = await this.retrieveContentKey(universeId);
            if (existingKey && existingKey.status === 'active') {
                // Check if user has access and return the unwrapped key
                const contentKey = await this.getContentKey(universeId, userId, userPrivateKey);
                if (contentKey) {
                    return contentKey;
                }
            }

            // Create new key if none exists or user doesn't have access
            if (!existingKey) {
                // Get public keys for all collaborators
                const collaboratorPublicKeys = [];
                for (const collaboratorId of collaboratorIds) {
                    try {
                        const publicKey = await this.getUserPublicKey(collaboratorId);
                        collaboratorPublicKeys.push({ userId: collaboratorId, publicKey });
                    } catch (error) {
                        this.logger.warn(`Failed to get public key for user ${collaboratorId}:`, error);
                        // Continue without this collaborator rather than failing entirely
                    }
                }

                if (collaboratorPublicKeys.length === 0) {
                    throw new Error('No valid collaborator public keys found');
                }

                const newKey = await this.generateContentKey(universeId, collaboratorPublicKeys);
                await this.storeContentKey(newKey);

                // Return the unwrapped content key
                return await this.getContentKey(universeId, userId, userPrivateKey);
            }

            return null; // User doesn't have access to existing key
        } catch (error) {
            this.logger.error('Failed to get or create content key:', error);
            return null;
        }
    }

    /**
     * Get or create content key with metadata
     * 
     * @param universeId - Universe to get/create key for
     * @param userId - User requesting the key
     * @param userPrivateKey - User's private key for unwrapping
     * @param collaboratorIds - List of collaborator user IDs
     * @returns Content key with metadata, or null if access denied
     */
    async getOrCreateContentKeyWithMetadata(
        universeId: string,
        userId: string,
        userPrivateKey: string,
        collaboratorIds: string[]
    ): Promise<{ key: Buffer; id: string } | null> {
        try {
            // First try to get existing key
            const existingKey = await this.retrieveContentKey(universeId);
            if (existingKey && existingKey.status === 'active') {
                // Check if user has access and return the unwrapped key
                const contentKey = await this.getContentKey(universeId, userId, userPrivateKey);
                if (contentKey) {
                    return { key: contentKey, id: existingKey.metadata.contentKeyId };
                }
            }

            // Create new key if none exists or user doesn't have access
            if (!existingKey) {
                // Get public keys for all collaborators
                const collaboratorPublicKeys = [];
                for (const collaboratorId of collaboratorIds) {
                    try {
                        const publicKey = await this.getUserPublicKey(collaboratorId);
                        collaboratorPublicKeys.push({ userId: collaboratorId, publicKey });
                    } catch (error) {
                        this.logger.warn(`Failed to get public key for user ${collaboratorId}:`, error);
                        // Continue without this collaborator rather than failing entirely
                    }
                }

                if (collaboratorPublicKeys.length === 0) {
                    throw new Error('No valid collaborator public keys found');
                }

                const newKey = await this.generateContentKey(universeId, collaboratorPublicKeys);
                await this.storeContentKey(newKey);

                // Return the unwrapped content key with metadata
                const contentKey = await this.getContentKey(universeId, userId, userPrivateKey);
                if (contentKey) {
                    return { key: contentKey, id: newKey.metadata.contentKeyId };
                }
            }

            return null; // User doesn't have access to existing key
        } catch (error) {
            this.logger.error('Failed to get or create content key with metadata:', error);
            return null;
        }
    }

    // === PRIVATE HELPER METHODS ===

    /**
     * Generate a unique content key ID
     */
    private generateContentKeyId(): string {
        return `ck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Wrap (encrypt) a content key with a user's public key
     */
    private async wrapContentKey(contentKey: Buffer, publicKey: string): Promise<string> {
        try {
            return await this.baseEncryption.wrapContentKey(contentKey, publicKey);
        } catch (error) {
            this.logger.error('Failed to wrap content key:', error);
            throw new Error(`Content key wrapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Unwrap (decrypt) a content key with a user's private key
     */
    private async unwrapContentKey(wrappedKey: string, privateKey: string): Promise<Buffer> {
        try {
            return await this.baseEncryption.unwrapContentKey(wrappedKey, privateKey);
        } catch (error) {
            this.logger.error('Failed to unwrap content key:', error);
            throw new Error(`Content key unwrapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Store content key in shared database
     * 
     * CRITICAL: This database must be accessible to both backend and ai-server
     */
    private async storeContentKey(storedKey: StoredContentKey): Promise<void> {
        try {
            const document: Omit<ContentKeysDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                universeId: storedKey.metadata.universeId,
                contentKeyId: storedKey.metadata.contentKeyId,
                wrappedKeys: storedKey.wrappedKeys.map(wk => ({
                    userId: wk.userId,
                    wrappedKey: wk.wrappedKey,
                    algorithm: wk.algorithm,
                    createdAt: new Date()
                })),
                keyMetadata: {
                    algorithm: storedKey.metadata.algorithm,
                    keyLength: 32, // AES-256 key length
                    createdAt: storedKey.metadata.createdAt,
                    rotatedAt: storedKey.metadata.rotatedAt,
                    version: storedKey.metadata.version
                },
                status: storedKey.status
            };

            await contentKeysService.storeContentKey(document);
            this.logger.debug(`Stored content key ${storedKey.metadata.contentKeyId} in database`);

        } catch (error) {
            this.logger.error(`Failed to store content key ${storedKey.metadata.contentKeyId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve content key from shared database
     */
    private async retrieveContentKey(universeId: string): Promise<StoredContentKey | null> {
        try {
            const document = await contentKeysService.getActiveContentKey(universeId);
            if (!document) {
                return null;
            }

            // Convert database document to StoredContentKey format
            const storedKey: StoredContentKey = {
                metadata: {
                    contentKeyId: document.contentKeyId,
                    universeId: document.universeId,
                    algorithm: document.keyMetadata.algorithm,
                    createdAt: document.keyMetadata.createdAt,
                    rotatedAt: document.keyMetadata.rotatedAt,
                    version: document.keyMetadata.version
                },
                wrappedKeys: document.wrappedKeys.map(wk => ({
                    userId: wk.userId,
                    wrappedKey: wk.wrappedKey,
                    algorithm: wk.algorithm
                })),
                status: document.status
            };

            this.logger.debug(`Retrieved content key for universe ${universeId} from database`);
            return storedKey;

        } catch (error) {
            this.logger.error(`Failed to retrieve content key for universe ${universeId}:`, error);
            return null;
        }
    }

    /**
     * Get user's public key from user key storage
     */
    private async getUserPublicKey(userId: string): Promise<string> {
        try {
            const publicKey = await userKeysService.getUserPublicKey(userId);
            if (!publicKey) {
                throw new Error(`No public key found for user ${userId}`);
            }

            this.logger.debug(`Retrieved public key for user ${userId}`);
            return publicKey;

        } catch (error) {
            this.logger.error(`Failed to retrieve public key for user ${userId}:`, error);
            throw error;
        }
    }
}

/**
 * Singleton instance for consistent key management across backend
 */
export const contentKeyManager = new ContentKeyManager(
    new BaseEncryptionService()
);
