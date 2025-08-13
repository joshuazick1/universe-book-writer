/**
 * @fileoverview Shared encryption service for secure data handling.
 * @module shared/encryption/encryptionService
 *
 * Provides encrypt and decrypt helpers for string and object data.
 *
 * @example
 * import { encrypt, decrypt } from 'shared/encryption/encryptionService';
 * const encrypted = encrypt('mySecret', 'password');
 * const decrypted = decrypt(encrypted, 'password');
 */

import crypto from 'crypto';

const DEFAULT_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export interface EncryptionOptions {
    algorithm?: string;
    password: string;
}

export function encrypt(text: string, password: string, algorithm: string = DEFAULT_ALGORITHM): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(password, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encrypted: string, password: string, algorithm: string = DEFAULT_ALGORITHM): string {
    const [ivHex, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function encryptObject(obj: unknown, password: string, algorithm: string = DEFAULT_ALGORITHM): string {
    return encrypt(JSON.stringify(obj), password, algorithm);
}

export function decryptObject<T = unknown>(encrypted: string, password: string, algorithm: string = DEFAULT_ALGORITHM): T {
    const decrypted = decrypt(encrypted, password, algorithm);
    return JSON.parse(decrypted);
}

export function hashContent(content: unknown): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(content, Object.keys(content as any).sort()));
    return hash.digest('hex');
}
