/**
 * Base Encryption Service for RAG System
 * 
 * Modular encryption architecture designed specifically for RAG + plugin integration.
 * This replaces the monolithic UniverseEncryptionService with a pluggable system.
 */

import { randomBytes, scrypt, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption strategy interface for pluggable encryption
 */
export interface EncryptionStrategy {
    /** Strategy identifier */
    id: string;

    /** Algorithm used */
    algorithm: string;

    /** Encrypt data */
    encrypt(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData>;

    /** Decrypt data */
    decrypt(encryptedData: EncryptedData, key: Buffer): Promise<string>;

    /** Generate appropriate IV for this strategy */
    generateIV(): Buffer;

    /** Validate key strength */
    validateKey(key: Buffer): boolean;
}

/**
 * Encrypted data structure
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

    /** Strategy ID */
    strategyId: string;

    /** Checksum for integrity */
    checksum: string;

    /** Encryption timestamp */
    encryptedAt: Date;
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
    /** Base password/passphrase */
    password: string;

    /** Salt for key derivation */
    salt: Buffer;

    /** Key length in bytes */
    keyLength: number;

    /** Derivation cost factor */
    cost: number;

    /** Additional context for hierarchical keys */
    context?: string[];
}

/**
 * Content classification for automatic encryption decisions
 */
export interface ContentClassification {
    /** Sensitivity level */
    sensitivity: 'public' | 'private' | 'sensitive' | 'restricted';

    /** Detected content types that affect encryption */
    contentTypes: string[];

    /** Confidence score (0-1) */
    confidence: number;

    /** Reasoning for classification */
    reasoning: string[];

    /** Recommended encryption strategy */
    recommendedStrategy?: string;
}

/**
 * AES-256-GCM encryption strategy (default)
 */
export class AESGCMEncryptionStrategy implements EncryptionStrategy {
    readonly id = 'aes-256-gcm';
    readonly algorithm = 'aes-256-gcm';

    async encrypt(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData> {
        const actualIV = iv || this.generateIV();
        const cipher = createCipheriv(this.algorithm, key, actualIV);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();
        const checksum = this.generateChecksum(data);

        return {
            data: encrypted,
            iv: actualIV.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: this.algorithm,
            strategyId: this.id,
            checksum,
            encryptedAt: new Date()
        };
    }

    async decrypt(encryptedData: EncryptedData, key: Buffer): Promise<string> {
        if (encryptedData.strategyId !== this.id) {
            throw new Error(`Incompatible encryption strategy: ${encryptedData.strategyId}`);
        }

        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag!, 'hex');

        const decipher = createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Verify integrity
        const checksum = this.generateChecksum(decrypted);
        if (checksum !== encryptedData.checksum) {
            throw new Error('Data integrity check failed');
        }

        return decrypted;
    }

    generateIV(): Buffer {
        return randomBytes(12); // 96-bit IV for GCM
    }

    validateKey(key: Buffer): boolean {
        return key.length === 32; // 256-bit key
    }

    private generateChecksum(data: string): string {
        return createHash('sha256').update(data).digest('hex');
    }
}

/**
 * ChaCha20-Poly1305 encryption strategy (alternative)
 */
export class ChaCha20Poly1305Strategy implements EncryptionStrategy {
    readonly id = 'chacha20-poly1305';
    readonly algorithm = 'chacha20-poly1305';

    async encrypt(data: string, key: Buffer, iv?: Buffer): Promise<EncryptedData> {
        const actualIV = iv || this.generateIV();
        const cipher = createCipheriv(this.algorithm, key, actualIV);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();
        const checksum = this.generateChecksum(data);

        return {
            data: encrypted,
            iv: actualIV.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: this.algorithm,
            strategyId: this.id,
            checksum,
            encryptedAt: new Date()
        };
    }

    async decrypt(encryptedData: EncryptedData, key: Buffer): Promise<string> {
        if (encryptedData.strategyId !== this.id) {
            throw new Error(`Incompatible encryption strategy: ${encryptedData.strategyId}`);
        }

        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag!, 'hex');

        const decipher = createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Verify integrity
        const checksum = this.generateChecksum(decrypted);
        if (checksum !== encryptedData.checksum) {
            throw new Error('Data integrity check failed');
        }

        return decrypted;
    }

    generateIV(): Buffer {
        return randomBytes(12); // 96-bit nonce for ChaCha20-Poly1305
    }

    validateKey(key: Buffer): boolean {
        return key.length === 32; // 256-bit key
    }

    private generateChecksum(data: string): string {
        return createHash('sha256').update(data).digest('hex');
    }
}

/**
 * Hierarchical Key Manager for multi-level key derivation
 */
export class HierarchicalKeyManager {
    private masterKey: Buffer | null = null;
    private keyCache = new Map<string, Buffer>();

    /**
     * Initialize with master key
     */
    async initializeMasterKey(password: string, salt?: Buffer): Promise<void> {
        const actualSalt = salt || randomBytes(32);
        this.masterKey = await this.deriveKey({
            password,
            salt: actualSalt,
            keyLength: 32,
            cost: 65536 // Higher cost for master key
        });
    }

    /**
     * Derive a key for specific context
     */
    async deriveContextKey(context: string[], keyLength: number = 32): Promise<Buffer> {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }

        const contextPath = context.join('/');
        const cached = this.keyCache.get(contextPath);
        if (cached) {
            return cached;
        }

        // Create context-specific salt
        const contextSalt = createHash('sha256')
            .update(this.masterKey)
            .update(contextPath)
            .digest();

        const derivedKey = await this.deriveKey({
            password: this.masterKey.toString('hex'),
            salt: contextSalt.slice(0, 32),
            keyLength,
            cost: 16384 // Lower cost for derived keys
        });

        this.keyCache.set(contextPath, derivedKey);
        return derivedKey;
    }

    /**
     * Derive key using scrypt
     */
    private async deriveKey(params: KeyDerivationParams): Promise<Buffer> {
        const key = await scryptAsync(
            params.password,
            params.salt,
            params.keyLength
        ) as Buffer;

        return key;
    }

    /**
     * Clear key cache (for security)
     */
    clearCache(): void {
        this.keyCache.clear();
    }

    /**
     * Get key derivation path for RAG node
     */
    static getNodeKeyPath(universeId: string, nodeId: string, sensitivity: string): string[] {
        return ['universe', universeId, 'nodes', sensitivity, nodeId];
    }

    /**
     * Get key derivation path for RAG relationship
     */
    static getRelationshipKeyPath(universeId: string, relationshipId: string): string[] {
        return ['universe', universeId, 'relationships', relationshipId];
    }
}

/**
 * Content Classification Service for automatic sensitivity detection
 */
export class ContentClassificationService {
    private sensitivePatterns: RegExp[] = [
        /\b(secret|classified|confidential|private)\b/i,
        /\b(password|key|token|credential)\b/i,
        /\b(spoiler|plot twist|ending|death)\b/i,
        /\b(personal|diary|journal|private thoughts)\b/i
    ];

    private restrictedPatterns: RegExp[] = [
        /\b(nuclear|weapon|bomb|classified project)\b/i,
        /\b(top secret|eyes only|clearance)\b/i,
        /\b(character death|major spoiler|series ending)\b/i
    ];

    /**
     * Classify content sensitivity
     */
    classifyContent(content: string, nodeType: string, metadata: any): ContentClassification {
        const reasoning: string[] = [];
        let sensitivity: ContentClassification['sensitivity'] = 'public';
        let confidence = 0.5;

        // Check for explicit sensitivity markers
        const sensitiveMatches = this.sensitivePatterns.filter(pattern => pattern.test(content));
        const restrictedMatches = this.restrictedPatterns.filter(pattern => pattern.test(content));

        if (restrictedMatches.length > 0) {
            sensitivity = 'restricted';
            confidence = 0.9;
            reasoning.push(`Contains restricted content patterns: ${restrictedMatches.length} matches`);
        } else if (sensitiveMatches.length > 0) {
            sensitivity = 'sensitive';
            confidence = 0.8;
            reasoning.push(`Contains sensitive content patterns: ${sensitiveMatches.length} matches`);
        }

        // Check metadata for privacy indicators
        if (metadata.tags?.includes('private') || metadata.tags?.includes('secret')) {
            sensitivity = sensitivity === 'public' ? 'private' : sensitivity;
            confidence = Math.max(confidence, 0.7);
            reasoning.push('Tagged as private/secret');
        }

        // Node type considerations
        const privateNodeTypes = ['diary', 'personal_note', 'character_secret'];
        if (privateNodeTypes.includes(nodeType)) {
            sensitivity = sensitivity === 'public' ? 'private' : sensitivity;
            confidence = Math.max(confidence, 0.8);
            reasoning.push(`Node type '${nodeType}' indicates private content`);
        }

        // Content length considerations (very short content might be less sensitive)
        if (content.length < 50 && sensitivity !== 'restricted') {
            confidence *= 0.8;
            reasoning.push('Short content reduces confidence');
        }

        // Determine recommended encryption strategy
        let recommendedStrategy: string | undefined;
        switch (sensitivity) {
            case 'restricted':
                recommendedStrategy = 'chacha20-poly1305';
                break;
            case 'sensitive':
            case 'private':
                recommendedStrategy = 'aes-256-gcm';
                break;
        }

        return {
            sensitivity,
            contentTypes: [nodeType],
            confidence,
            reasoning,
            recommendedStrategy
        };
    }

    /**
     * Add custom classification patterns (for plugins)
     */
    addCustomPatterns(patterns: { sensitive?: RegExp[]; restricted?: RegExp[] }): void {
        if (patterns.sensitive) {
            this.sensitivePatterns.push(...patterns.sensitive);
        }
        if (patterns.restricted) {
            this.restrictedPatterns.push(...patterns.restricted);
        }
    }
}

/**
 * Base Encryption Service with pluggable strategies
 */
export class BaseEncryptionService {
    private strategies = new Map<string, EncryptionStrategy>();
    private keyManager: HierarchicalKeyManager;
    private classifier: ContentClassificationService;

    constructor() {
        this.keyManager = new HierarchicalKeyManager();
        this.classifier = new ContentClassificationService();

        // Register default strategies
        this.registerStrategy(new AESGCMEncryptionStrategy());
        this.registerStrategy(new ChaCha20Poly1305Strategy());
    }

    /**
     * Register an encryption strategy
     */
    registerStrategy(strategy: EncryptionStrategy): void {
        this.strategies.set(strategy.id, strategy);
    }

    /**
     * Initialize encryption with master key
     */
    async initialize(masterPassword: string, salt?: Buffer): Promise<void> {
        await this.keyManager.initializeMasterKey(masterPassword, salt);
    }

    /**
     * Encrypt content with automatic strategy selection
     */
    async encryptContent(
        content: string,
        context: string[],
        sensitivity?: string,
        strategyId?: string
    ): Promise<EncryptedData> {
        // Determine strategy
        const strategy = strategyId ?
            this.strategies.get(strategyId) :
            this.selectStrategy(sensitivity);

        if (!strategy) {
            throw new Error(`Encryption strategy not found: ${strategyId || 'auto'}`);
        }

        // Derive context-specific key
        const key = await this.keyManager.deriveContextKey(context);

        if (!strategy.validateKey(key)) {
            throw new Error(`Invalid key for strategy ${strategy.id}`);
        }

        return await strategy.encrypt(content, key);
    }

    /**
     * Decrypt content
     */
    async decryptContent(encryptedData: EncryptedData, context: string[]): Promise<string> {
        const strategy = this.strategies.get(encryptedData.strategyId);
        if (!strategy) {
            throw new Error(`Unknown encryption strategy: ${encryptedData.strategyId}`);
        }

        const key = await this.keyManager.deriveContextKey(context);
        return await strategy.decrypt(encryptedData, key);
    }

    /**
     * Classify content and suggest encryption
     */
    classifyAndEncrypt(content: string, nodeType: string, metadata: any): {
        classification: ContentClassification;
        shouldEncrypt: boolean;
        recommendedStrategy?: string;
    } {
        const classification = this.classifier.classifyContent(content, nodeType, metadata);
        const shouldEncrypt = classification.sensitivity !== 'public';

        return {
            classification,
            shouldEncrypt,
            recommendedStrategy: classification.recommendedStrategy
        };
    }

    /**
     * Select appropriate encryption strategy based on sensitivity
     */
    private selectStrategy(sensitivity?: string): EncryptionStrategy {
        switch (sensitivity) {
            case 'restricted':
                return this.strategies.get('chacha20-poly1305') || this.strategies.get('aes-256-gcm')!;
            case 'sensitive':
            case 'private':
                return this.strategies.get('aes-256-gcm')!;
            default:
                return this.strategies.get('aes-256-gcm')!;
        }
    }

    /**
     * Get key manager for advanced operations
     */
    getKeyManager(): HierarchicalKeyManager {
        return this.keyManager;
    }

    /**
     * Get content classifier
     */
    getClassifier(): ContentClassificationService {
        return this.classifier;
    }

    /**
     * List available strategies
     */
    getAvailableStrategies(): string[] {
        return Array.from(this.strategies.keys());
    }
}
