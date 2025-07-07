/**
 * Backend Base Encryption Service
 * 
 * CRITICAL: This service must use the SAME encryption algorithms and key formats
 * as the ai-server to ensure seamless key sharing and decryption compatibility.
 */

import { randomBytes, scrypt, pbkdf2, createCipheriv, createDecipheriv, generateKeyPair, constants } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);
const generateKeyPairAsync = promisify(generateKeyPair);

/**
 * Encrypted data structure - MUST match ai-server format
 */
export interface EncryptedData {
    /** Encrypted content */
    data: string;
    /** Initialization vector */
    iv: string;
    /** Authentication tag (for AEAD algorithms) */
    authTag?: string;
    /** Algorithm used */
    algorithm: string;
    /** Salt for key derivation */
    salt?: string;
}

/**
 * Key pair structure for collaborative encryption
 */
export interface KeyPair {
    publicKey: string;
    privateKey: string;
    keyType: 'RSA' | 'ECDH';
}

/**
 * Wrapped content key structure
 */
export interface WrappedContentKey {
    userId: string;
    wrappedKey: string;  // Content key encrypted with user's public key
    algorithm: string;
}

/**
 * Base encryption service providing core cryptographic operations
 * 
 * DESIGN: This service ensures backend and ai-server use identical
 * encryption/decryption methods for seamless key sharing.
 */
export class BaseEncryptionService {
    private readonly AES_ALGORITHM = 'aes-256-gcm';
    private readonly CHACHA_ALGORITHM = 'chacha20-poly1305';
    private readonly KEY_LENGTH = 32; // 256 bits
    private readonly IV_LENGTH = 16;  // 128 bits
    private readonly SALT_LENGTH = 32; // 256 bits

    /**
     * Generate a secure random content key
     * Used for encrypting universe/book content
     */
    generateContentKey(): Buffer {
        return randomBytes(this.KEY_LENGTH);
    }

    /**
     * Generate a secure random IV
     */
    generateIV(): Buffer {
        return randomBytes(this.IV_LENGTH);
    }

    /**
     * Generate a secure random salt
     */
    generateSalt(): Buffer {
        return randomBytes(this.SALT_LENGTH);
    }

    /**
     * Encrypt data using AES-256-GCM
     * 
     * @param data - Plain text to encrypt
     * @param key - Encryption key (32 bytes)
     * @param iv - Initialization vector (optional, will generate if not provided)
     * @returns Encrypted data with IV and auth tag
     */
    async encryptAES(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData> {
        if (!iv) {
            iv = this.generateIV();
        }

        const cipher = createCipheriv(this.AES_ALGORITHM, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            data: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: this.AES_ALGORITHM
        };
    }

    /**
     * Decrypt data using AES-256-GCM
     * 
     * @param encryptedData - Encrypted data structure
     * @param key - Decryption key (32 bytes)
     * @returns Decrypted plain text
     */
    async decryptAES(encryptedData: EncryptedData, key: Buffer): Promise<string> {
        const decipher = createDecipheriv(
            this.AES_ALGORITHM,
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );

        if (encryptedData.authTag) {
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        }

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Encrypt data using ChaCha20-Poly1305
     * 
     * @param data - Plain text to encrypt
     * @param key - Encryption key (32 bytes)
     * @param iv - Initialization vector (optional)
     * @returns Encrypted data with IV and auth tag
     */
    async encryptChaCha(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData> {
        if (!iv) {
            iv = randomBytes(12); // ChaCha20 uses 12-byte nonce
        }

        const cipher = createCipheriv(this.CHACHA_ALGORITHM, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            data: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: this.CHACHA_ALGORITHM
        };
    }

    /**
     * Decrypt data using ChaCha20-Poly1305
     */
    async decryptChaCha(encryptedData: EncryptedData, key: Buffer): Promise<string> {
        const decipher = createDecipheriv(
            this.CHACHA_ALGORITHM,
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );

        if (encryptedData.authTag) {
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        }

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Generate RSA key pair for user encryption
     * 
     * @returns RSA key pair for collaborative encryption
     */
    async generateRSAKeyPair(): Promise<KeyPair> {
        const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return {
            publicKey,
            privateKey,
            keyType: 'RSA'
        };
    }

    /**
     * Derive key from password using PBKDF2
     * Used for encrypting user private keys
     * 
     * @param password - User password
     * @param salt - Salt (will generate if not provided)
     * @param iterations - PBKDF2 iterations (default: 100000)
     * @returns Derived key and salt
     */
    async deriveKeyFromPassword(
        password: string,
        salt?: Buffer,
        iterations: number = 100000
    ): Promise<{ key: Buffer; salt: Buffer }> {
        if (!salt) {
            salt = this.generateSalt();
        }

        const key = await pbkdf2Async(password, salt, iterations, this.KEY_LENGTH, 'sha256');

        return {
            key: key as Buffer,
            salt
        };
    }

    /**
     * Derive a key from a master key using a hierarchical path
     * 
     * @param masterKey - Master key to derive from
     * @param derivationPath - Path for key derivation (e.g., "universe/type/id")
     * @param keyLength - Length of derived key in bytes
     * @returns Derived key buffer
     */
    async deriveKey(masterKey: Buffer, derivationPath: string, keyLength: number): Promise<Buffer> {
        try {
            // Use HKDF (HMAC-based Key Derivation Function) for key derivation
            const salt = Buffer.from('RAG-Key-Derivation-Salt', 'utf8');
            const info = Buffer.from(derivationPath, 'utf8');

            // Use PBKDF2 as fallback for key derivation
            const derivedKey = await pbkdf2Async(
                masterKey,
                Buffer.concat([salt, info]),
                1000, // iterations
                keyLength,
                'sha256'
            );

            return derivedKey as Buffer;
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error(`Failed to derive key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate encryption key strength
     * 
     * @param key - Key to validate
     * @returns True if key meets security requirements
     */
    validateKey(key: Buffer): boolean {
        return key.length >= this.KEY_LENGTH;
    }

    /**
     * Get algorithm-specific IV length
     */
    getIVLength(algorithm: string): number {
        switch (algorithm) {
            case this.AES_ALGORITHM:
                return this.IV_LENGTH;
            case this.CHACHA_ALGORITHM:
                return 12; // ChaCha20 uses 12-byte nonce
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    /**
     * Wrap (encrypt) a content key using RSA public key
     * 
     * CRITICAL: This method enables collaborative encryption by encrypting
     * content keys with each collaborator's public key.
     * 
     * @param contentKey - The content key to wrap (32 bytes)
     * @param publicKeyPem - RSA public key in PEM format
     * @returns Wrapped (encrypted) content key as base64 string
     */
    async wrapContentKey(contentKey: Buffer, publicKeyPem: string): Promise<string> {
        try {
            const { publicEncrypt } = await import('crypto');

            const wrappedKey = publicEncrypt(
                {
                    key: publicKeyPem,
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                contentKey
            );

            return wrappedKey.toString('base64');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to wrap content key: ${errorMessage}`);
        }
    }

    /**
     * Unwrap (decrypt) a content key using RSA private key
     * 
     * CRITICAL: This method enables authorized users to decrypt content keys
     * and subsequently decrypt universe content.
     * 
     * @param wrappedKey - Base64 encoded wrapped content key
     * @param privateKeyPem - RSA private key in PEM format
     * @returns Unwrapped (decrypted) content key as Buffer
     */
    async unwrapContentKey(wrappedKey: string, privateKeyPem: string): Promise<Buffer> {
        try {
            const { privateDecrypt } = await import('crypto');

            const wrappedKeyBuffer = Buffer.from(wrappedKey, 'base64');

            const unwrappedKey = privateDecrypt(
                {
                    key: privateKeyPem,
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                wrappedKeyBuffer
            );

            return unwrappedKey;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to unwrap content key: ${errorMessage}`);
        }
    }

    /**
     * Wrap key (alias for wrapContentKey for API consistency)
     * 
     * @param key - Key to wrap
     * @param publicKeyPem - Public key for wrapping
     * @returns Wrapped key as base64 string
     */
    async wrapKey(key: Buffer, publicKeyPem: string): Promise<string> {
        return this.wrapContentKey(key, publicKeyPem);
    }

    /**
     * Unwrap key (alias for unwrapContentKey for API consistency)
     * 
     * @param wrappedKey - Wrapped key as base64 string
     * @param privateKeyPem - Private key for unwrapping
     * @returns Unwrapped key as Buffer
     */
    async unwrapKey(wrappedKey: string, privateKeyPem: string): Promise<Buffer> {
        return this.unwrapContentKey(wrappedKey, privateKeyPem);
    }

    /**
     * Encrypt a user's private key with a password-derived key
     * 
     * Used to securely store user private keys in the database.
     * 
     * @param privateKeyPem - RSA private key in PEM format
     * @param password - User's password
     * @param salt - Salt for key derivation (optional, will generate if not provided)
     * @returns Encrypted private key and salt
     */
    async encryptPrivateKey(
        privateKeyPem: string,
        password: string,
        salt?: Buffer
    ): Promise<{ encryptedPrivateKey: EncryptedData; salt: Buffer }> {
        try {
            // Derive key from password
            const keyDerivation = await this.deriveKeyFromPassword(password, salt);

            // Encrypt private key using derived key
            const encryptedPrivateKey = await this.encryptAES(
                privateKeyPem,
                keyDerivation.key
            );

            // Add salt to encrypted data for later decryption
            encryptedPrivateKey.salt = keyDerivation.salt.toString('hex');

            return {
                encryptedPrivateKey,
                salt: keyDerivation.salt
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to encrypt private key: ${errorMessage}`);
        }
    }

    /**
     * Decrypt a user's private key using their password
     * 
     * Used to retrieve user private keys from secure database storage.
     * 
     * @param encryptedPrivateKey - Encrypted private key data
     * @param password - User's password
     * @returns Decrypted private key in PEM format
     */
    async decryptPrivateKey(
        encryptedPrivateKey: EncryptedData,
        password: string
    ): Promise<string> {
        try {
            if (!encryptedPrivateKey.salt) {
                throw new Error('Salt is required for private key decryption');
            }

            // Derive key from password using stored salt
            const salt = Buffer.from(encryptedPrivateKey.salt, 'hex');
            const { key } = await this.deriveKeyFromPassword(password, salt);

            // Decrypt private key
            const privateKeyPem = await this.decryptAES(encryptedPrivateKey, key);

            return privateKeyPem;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to decrypt private key: ${errorMessage}`);
        }
    }

    /**
     * Validate RSA key pair
     * 
     * Ensures public and private keys are a valid pair by testing
     * encryption/decryption with test data.
     * 
     * @param publicKeyPem - RSA public key in PEM format
     * @param privateKeyPem - RSA private key in PEM format
     * @returns True if keys are a valid pair
     */
    async validateKeyPair(publicKeyPem: string, privateKeyPem: string): Promise<boolean> {
        try {
            // Test data for validation
            const testData = randomBytes(32);

            // Wrap test data with public key
            const wrapped = await this.wrapContentKey(testData, publicKeyPem);

            // Unwrap test data with private key
            const unwrapped = await this.unwrapContentKey(wrapped, privateKeyPem);

            // Keys are valid if unwrapped data matches original
            return testData.equals(unwrapped);

        } catch (error) {
            // Any error indicates invalid key pair
            return false;
        }
    }

    /**
     * Encrypt data using the default algorithm (AES-256-GCM)
     * 
     * @param data - Data to encrypt
     * @param key - Encryption key
     * @param iv - Optional initialization vector
     * @returns Encrypted data
     */
    async encrypt(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData> {
        return this.encryptAES(data, key, iv);
    }

    /**
     * Decrypt data (handles both EncryptedData objects and base64 strings)
     * 
     * @param encryptedData - Encrypted data to decrypt
     * @param key - Decryption key
     * @returns Decrypted data
     */
    async decrypt(encryptedData: EncryptedData | string, key: Buffer): Promise<string> {
        if (typeof encryptedData === 'string') {
            // Parse the encrypted data from string format
            try {
                const parsedData: EncryptedData = JSON.parse(
                    Buffer.from(encryptedData, 'base64').toString('utf8')
                );
                return this.decryptAES(parsedData, key);
            } catch (error) {
                throw new Error(`Failed to parse encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } else {
            return this.decryptAES(encryptedData, key);
        }
    }
}

/**
 * Singleton instance for consistent encryption across backend
 */
export const baseEncryptionService = new BaseEncryptionService();
