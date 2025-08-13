/**
 * RagNodeEncryptionService
 *
 * Provides encryption for RAG nodes using AES-256-GCM.
 *
 * @remarks
 * - Uses Node.js crypto for encryption/decryption.
 * - Safe for backend, ai-server, and plugins.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { BaseEncryptionService } from './base-encryption.service.js';

const IV_LENGTH = 12; // AES-GCM recommended

export class RagNodeEncryptionService extends BaseEncryptionService {
    async encrypt(data: string, key: string): Promise<string> {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    async decrypt(data: string, key: string): Promise<string> {
        const [ivHex, tagHex, encrypted] = data.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    async encryptContent(content: string, context: string[], sensitivity?: string, strategyId?: string): Promise<any> {
        // Implementation for abstract method
        const key = await this.generateKey();
        const encrypted = await this.encrypt(content, key);
        return {
            encryptedData: encrypted,
            key,
            sensitivity: sensitivity || 'medium',
            strategyId: strategyId || 'default'
        };
    }

    async decryptContent(encryptedData: any, context: string[]): Promise<string> {
        // Implementation for abstract method
        return await this.decrypt(encryptedData.encryptedData, encryptedData.key);
    }

    classifyAndEncrypt(content: string, nodeType: string, metadata: any): { classification: any; shouldEncrypt: boolean; recommendedStrategy?: string } {
        // Implementation for abstract method
        return {
            classification: { type: nodeType, sensitivity: 'medium' },
            shouldEncrypt: true,
            recommendedStrategy: 'default'
        };
    }

    private async generateKey(): Promise<string> {
        return randomBytes(32).toString('hex');
    }
}

export default RagNodeEncryptionService;
