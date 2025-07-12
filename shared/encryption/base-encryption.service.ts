/**
 * BaseEncryptionService
 *
 * Abstract base class for encryption services. All encryption services should extend this class.
 *
 * @remarks
 * - Provides interface for encrypt/decrypt.
 * - Not intended for direct use.
 */

export interface EncryptionService {
    encrypt(data: string, key: string): Promise<string>;
    decrypt(data: string, key: string): Promise<string>;
}

export abstract class BaseEncryptionService implements EncryptionService {
    abstract encrypt(data: string, key: string): Promise<string>;
    abstract decrypt(data: string, key: string): Promise<string>;
}

export default BaseEncryptionService;
