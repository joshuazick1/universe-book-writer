/**
 * Unit tests for BaseEncryptionService
 *
 * Covers: key generation, encryption/decryption, key wrapping/unwrapping, and error handling.
 *
 * @group encryption
 */
import { BaseEncryptionService, EncryptedData, KeyPair, WrappedContentKey } from '../../../../src/services/encryption/base-encryption.service.js';

describe('BaseEncryptionService', () => {
    let service: BaseEncryptionService;

    beforeEach(() => {
        service = new BaseEncryptionService();
    });

    describe('Key Generation', () => {
        it('should generate a 32-byte content key', () => {
            const key = service.generateContentKey();
            expect(key).toBeInstanceOf(Buffer);
            expect(key.length).toBe(32);
        });
        it('should generate a 16-byte IV', () => {
            const iv = service.generateIV();
            expect(iv).toBeInstanceOf(Buffer);
            expect(iv.length).toBe(16);
        });
        it('should generate a 32-byte salt', () => {
            const salt = service.generateSalt();
            expect(salt).toBeInstanceOf(Buffer);
            expect(salt.length).toBe(32);
        });
    });

    describe('Symmetric Encryption/Decryption', () => {
        it('should encrypt and decrypt data with AES-256-GCM', async () => {
            const key = service.generateContentKey();
            const iv = service.generateIV();
            const plaintext = 'Hello, world!';
            const encrypted = await service.encryptAES(plaintext, key, iv);
            const decrypted = await service.decryptAES(encrypted, key);
            expect(decrypted).toBe(plaintext);
        });
        it('should throw if decrypting with wrong key', async () => {
            const key = service.generateContentKey();
            const wrongKey = service.generateContentKey();
            const iv = service.generateIV();
            const plaintext = 'Secret';
            const encrypted = await service.encryptAES(plaintext, key, iv);
            await expect(service.decryptAES(encrypted, wrongKey)).rejects.toThrow();
        });
    });

    describe('Key Pair Generation', () => {
        it('should generate an RSA key pair', async () => {
            const pair = await service.generateRSAKeyPair();
            expect(pair).toHaveProperty('publicKey');
            expect(pair).toHaveProperty('privateKey');
            expect(pair.keyType).toBe('RSA');
            expect(typeof pair.publicKey).toBe('string');
            expect(typeof pair.privateKey).toBe('string');
        });
    });

    describe('Key Wrapping/Unwrapping', () => {
        it('should wrap and unwrap a content key with RSA', async () => {
            const pair = await service.generateRSAKeyPair();
            const contentKey = service.generateContentKey();
            const wrapped = await service.wrapContentKey(contentKey, pair.publicKey);
            const unwrapped = await service.unwrapContentKey(wrapped, pair.privateKey);
            expect(unwrapped.equals(contentKey)).toBe(true);
        });
        it('should fail to unwrap with wrong private key', async () => {
            const pair1 = await service.generateRSAKeyPair();
            const pair2 = await service.generateRSAKeyPair();
            const contentKey = service.generateContentKey();
            const wrapped = await service.wrapContentKey(contentKey, pair1.publicKey);
            await expect(service.unwrapContentKey(wrapped, pair2.privateKey)).rejects.toThrow();
        });
    });
});
