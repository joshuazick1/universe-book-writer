/**
 * RAG Integration Service
 * 
 * Service layer that bridges the RAG system in the AI server with the
 * backend database storage. Implements the hybrid RAG+DB architecture
 * where RAG is authoritative and database provides performance indexes.
 */
import { logInfo, logError, logDebug } from '../infrastructure/logger.js';

import axios, { AxiosInstance } from 'axios';
import { RAGStorageAdapter } from '../adapters/rag-storage.adapter.js';
import {
    IRAGNodeDocument,
    IRAGRelationshipDocument,
    IUniverseDocument,
    RAGNodeQuery,
    RAGRelationshipQuery
} from '../schemas/rag-storage.schema.js';
import type { RAGNode, RAGRelationship } from '../../../shared/types/nodeTypes.js';

/**
 * Configuration for RAG integration
 */
export interface RAGIntegrationConfig {
    aiServerUrl: string;              // AI server base URL (e.g., http://localhost:8000)
    aiServerApiKey?: string;          // Optional API key for AI server
    databaseUrl: string;              // MongoDB connection string
    databaseName: string;             // Database name
    syncInterval: number;             // Auto-sync interval in milliseconds
    batchSize: number;                // Batch size for bulk operations
}

// Use Node and NodeRelationship from shared/types/nodeTypes

/**
 * Service for integrating RAG system with database storage
 */
export class RAGIntegrationService {
    private aiServerClient: AxiosInstance;
    public storageAdapter: RAGStorageAdapter; // Make public for controller access
    private syncTimer?: NodeJS.Timeout;

    constructor(private config: RAGIntegrationConfig) {
        // Configure AI server client
        this.aiServerClient = axios.create({
            baseURL: config.aiServerUrl,
            timeout: 30000,
            headers: config.aiServerApiKey ? {
                'Authorization': `Bearer ${config.aiServerApiKey}`
            } : {}
        });

        // Initialize storage adapter
        this.storageAdapter = new RAGStorageAdapter(
            config.databaseUrl,
            config.databaseName
        );
    }

    /**
     * Initialize the integration service
     */
    async initialize(): Promise<void> {
        // Connect to database
        await this.storageAdapter.connect();

        // Verify AI server connection
        await this.verifyAIServerConnection();

        // Start auto-sync timer
        this.startAutoSync();

        console.log('RAG integration service initialized');
    }

    /**
     * Shutdown the integration service
     */
    async shutdown(): Promise<void> {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }

        await this.storageAdapter.disconnect();
        console.log('RAG integration service shutdown');
    }

    /**
     * Verify connection to AI server
     */
    private async verifyAIServerConnection(): Promise<void> {
        try {
            const response = await this.aiServerClient.get('/api/health');
            if (response.status !== 200) {
                throw new Error(`AI server health check failed: ${response.status}`);
            }
            console.log('AI server connection verified');
        } catch (error) {
            throw new Error(`Failed to connect to AI server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Start automatic synchronization
     */
    private startAutoSync(): void {
        this.syncTimer = setInterval(async () => {
            try {
                await this.syncFromRAG();
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }, this.config.syncInterval);
    }

    // ========================================
    // SYNC OPERATIONS
    // ========================================


    async syncFromRAG(): Promise<{ nodes: number; relationships: number; universes: number }> {
        logInfo('Starting RAG sync...');

        const results = {
            nodes: 0,
            relationships: 0,
            universes: 0
        };

        try {
            // Sync universes first
            results.universes = await this.syncUniversesFromRAG();

            // Sync nodes
            results.nodes = await this.syncNodesFromRAG();

            // Sync relationships
            results.relationships = await this.syncRelationshipsFromRAG();

            logInfo(`RAG sync completed: ${JSON.stringify(results)}`);
            return results;

        } catch (error: any) {
            logError('RAG sync failed: ' + (error instanceof Error ? error.stack || error.message : String(error)));
            throw error;
        }
    }

    /**
     * Sync universe data from RAG system
     */
    private async syncUniversesFromRAG(): Promise<number> {
        // logger already imported at top
        try {
            const response = await this.aiServerClient.get('/api/rag/universes');
            const universes: any[] = response.data;
            logInfo(`[syncUniversesFromRAG] Received ${universes.length} universes from AI server.`);
            logDebug(`[syncUniversesFromRAG] Raw universes: ${JSON.stringify(universes)}`);

            let synced = 0;
            for (const ragUniverse of universes) {
                const universeDoc: Omit<IUniverseDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                    universeId: ragUniverse.id,
                    name: ragUniverse.name,
                    description: ragUniverse.description || '',
                    pluginType: ragUniverse.pluginType || 'generic',
                    pluginVersion: ragUniverse.pluginVersion || '1.0.0',
                    pluginConfig: ragUniverse.pluginConfig || {},
                    defaultEncryptionLevel: ragUniverse.privacy?.defaultLevel || 'partial',
                    encryptionKey: ragUniverse.privacy?.keyId || '',
                    timelineSystem: ragUniverse.timeline?.system || 'gregorian',
                    timelineOrigin: ragUniverse.timeline?.origin || 0,
                    timelineUnits: ragUniverse.timeline?.units || 'years',
                    ownerId: ragUniverse.ownerId,
                    collaborators: ragUniverse.collaborators || [],
                    visibility: ragUniverse.visibility || 'private',
                    nodeCount: ragUniverse.stats?.nodeCount || 0,
                    relationshipCount: ragUniverse.stats?.relationshipCount || 0,
                    lastActivityAt: ragUniverse.lastActivityAt ? new Date(ragUniverse.lastActivityAt) : new Date()
                };
                try {
                    await this.storageAdapter.upsertUniverse(universeDoc);
                    logInfo(`[syncUniversesFromRAG] Upserted universe: ${universeDoc.universeId} (${universeDoc.name})`);
                    synced++;
                } catch (err: any) {
                    logError(`[syncUniversesFromRAG] Validation or upsert failed for universe ${universeDoc.universeId || ragUniverse.id}: ${err instanceof Error ? err.stack || err.message : String(err)}`);
                }
            }

            logInfo(`[syncUniversesFromRAG] Successfully synced ${synced} universes.`);
            return synced;
        } catch (error: any) {
            logError('[syncUniversesFromRAG] Failed to sync universes: ' + (error instanceof Error ? error.stack || error.message : String(error)));
            return 0;
        }
    }

    /**
     * Sync node data from RAG system
     */
    private async syncNodesFromRAG(): Promise<number> {
        try {
            const response = await this.aiServerClient.get('/api/rag/nodes');
            const nodes: RAGNode[] = response.data;

            let synced = 0;
            const batchSize = this.config.batchSize;

            for (let i = 0; i < nodes.length; i += batchSize) {
                const batch = nodes.slice(i, i + batchSize);

                await Promise.all(batch.map(async (ragNode: RAGNode) => {
                    const universeId = typeof ragNode.metadata?.universeId === 'string' ? ragNode.metadata.universeId : '';
                    const tags = Array.isArray(ragNode.metadata?.tags) ? ragNode.metadata.tags.filter((t): t is string => typeof t === 'string') : [];
                    const categories = Array.isArray(ragNode.metadata?.categories) ? ragNode.metadata.categories.filter((c): c is string => typeof c === 'string') : [];
                    const pluginType = typeof ragNode.metadata?.pluginType === 'string' ? ragNode.metadata.pluginType : undefined;
                    const authorId = typeof ragNode.metadata?.authorId === 'string' ? ragNode.metadata.authorId : '';
                    const collaborators = Array.isArray(ragNode.metadata?.collaborators) ? ragNode.metadata.collaborators.filter((c): c is string => typeof c === 'string') : [];
                    const versionHash = typeof ragNode.metadata?.versionHash === 'string' ? ragNode.metadata.versionHash : '';
                    // Only allow valid encryptionLevel values
                    const validEncryptionLevels = ['none', 'partial', 'full'] as const;
                    let encryptionLevel: 'none' | 'partial' | 'full' = 'none';
                    if (typeof ragNode.privacy?.level === 'string' && validEncryptionLevels.includes(ragNode.privacy.level as any)) {
                        encryptionLevel = ragNode.privacy.level as 'none' | 'partial' | 'full';
                    }
                    const encryptedFields = Array.isArray(ragNode.privacy?.encryptedFields) ? ragNode.privacy.encryptedFields.filter((f): f is string => typeof f === 'string') : [];
                    const keyHierarchy = typeof ragNode.privacy?.keyHierarchy === 'string' ? ragNode.privacy.keyHierarchy : '';
                    const timelinePosition = typeof ragNode.temporal?.position === 'number' ? ragNode.temporal.position : undefined;
                    const stardateEquivalent = typeof ragNode.temporal?.stardateEquivalent === 'number' ? ragNode.temporal.stardateEquivalent : undefined;
                    const temporalRelations = Array.isArray(ragNode.temporal?.relations) ? ragNode.temporal.relations.filter((r): r is string => typeof r === 'string') : [];
                    const nodeDoc: Omit<IRAGNodeDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                        ragId: ragNode.id,
                        universeId,
                        nodeType: ragNode.type,
                        title: ragNode.title ?? '',
                        searchableText: this.extractSearchableText(ragNode),
                        tags,
                        categories,
                        encryptionLevel,
                        encryptedFields,
                        keyHierarchy,
                        timelinePosition,
                        stardateEquivalent,
                        temporalRelations,
                        directConnections: [], // Will be populated by relationship sync
                        relationshipTypes: [],
                        connectionStrengths: [],
                        briefSummary: ragNode.summaries?.brief || '',
                        mediumSummary: ragNode.summaries?.medium || '',
                        detailedSummary: ragNode.summaries?.detailed || '',
                        pluginType,
                        pluginMetadata: ragNode.pluginData || {},
                        authorId,
                        collaborators,
                        versionHash,
                        lastSyncedAt: new Date(),
                        accessCount: 0,
                        lastAccessedAt: new Date()
                    };

                    await this.storageAdapter.upsertRAGNode(nodeDoc);
                }));

                synced += batch.length;
            }

            return synced;
        } catch (error) {
            console.error('Failed to sync nodes:', error);
            return 0;
        }
    }

    /**
     * Sync relationship data from RAG system
     */
    private async syncRelationshipsFromRAG(): Promise<number> {
        try {
            const response = await this.aiServerClient.get('/api/rag/relationships');
            const relationships: RAGRelationship[] = response.data;

            let synced = 0;
            const batchSize = this.config.batchSize;

            for (let i = 0; i < relationships.length; i += batchSize) {
                const batch = relationships.slice(i, i + batchSize);

                await Promise.all(batch.map(async (ragRelationship: RAGRelationship) => {
                    const universeId = typeof ragRelationship.metadata?.universeId === 'string' ? ragRelationship.metadata.universeId : '';
                    const pluginType = typeof ragRelationship.metadata?.pluginType === 'string' ? ragRelationship.metadata.pluginType : undefined;
                    const authorId = typeof ragRelationship.metadata?.authorId === 'string' ? ragRelationship.metadata.authorId : '';
                    const versionHash = typeof ragRelationship.metadata?.versionHash === 'string' ? ragRelationship.metadata.versionHash : '';
                    const pluginMetadata = typeof ragRelationship.metadata?.pluginData === 'object' && ragRelationship.metadata?.pluginData !== null ? ragRelationship.metadata.pluginData : {};
                    const validEncryptionLevels = ['none', 'partial', 'full'] as const;
                    let encryptionLevel: 'none' | 'partial' | 'full' = 'none';
                    if (typeof ragRelationship.metadata?.privacy?.level === 'string' && validEncryptionLevels.includes(ragRelationship.metadata.privacy.level as any)) {
                        encryptionLevel = ragRelationship.metadata.privacy.level as 'none' | 'partial' | 'full';
                    }
                    const encryptedProperties = Array.isArray(ragRelationship.metadata?.privacy?.encryptedFields) ? ragRelationship.metadata.privacy.encryptedFields.filter((f: unknown): f is string => typeof f === 'string') : [];
                    // Only allow valid temporalScope values
                    const validTemporalScopes = ['event', 'always', 'period'] as const;
                    let temporalScope: 'event' | 'always' | 'period' = 'always';
                    if (typeof ragRelationship.temporal?.scope === 'string' && validTemporalScopes.includes(ragRelationship.temporal.scope as any)) {
                        temporalScope = ragRelationship.temporal.scope as 'event' | 'always' | 'period';
                    }
                    const validFrom = typeof ragRelationship.temporal?.validFrom === 'number' ? ragRelationship.temporal.validFrom : undefined;
                    const validUntil = typeof ragRelationship.temporal?.validUntil === 'number' ? ragRelationship.temporal.validUntil : undefined;
                    const temporalContext = Array.isArray(ragRelationship.temporal?.context) ? ragRelationship.temporal.context.filter((c): c is string => typeof c === 'string') : [];
                    const relationshipDoc: Omit<IRAGRelationshipDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                        relationshipId: ragRelationship.id || '',
                        universeId,
                        sourceNodeId: ragRelationship.sourceNodeId || '',
                        targetNodeId: ragRelationship.targetNodeId || '',
                        relationshipType: ragRelationship.relationshipType || '',
                        strength: ragRelationship.strength ?? 0,
                        bidirectional: ragRelationship.bidirectional ?? false,
                        temporalScope,
                        validFrom,
                        validUntil,
                        temporalContext,
                        encryptionLevel,
                        encryptedProperties,
                        pluginType,
                        pluginMetadata,
                        authorId,
                        versionHash,
                        lastSyncedAt: new Date()
                    };

                    await this.storageAdapter.upsertRAGRelationship(relationshipDoc);
                }));

                synced += batch.length;
            }

            return synced;
        } catch (error) {
            console.error('Failed to sync relationships:', error);
            return 0;
        }
    }

    /**
     * Extract searchable text from RAG node content
     */
    private extractSearchableText(node: RAGNode): string {
        const searchableFields = [
            node.title,
            node.summaries?.brief || '',
            node.summaries?.medium || '',
            node.summaries?.detailed || ''
        ];

        // Extract text from content based on node type
        if (node.content) {
            if (typeof node.content === 'string') {
                searchableFields.push(node.content);
            } else if (typeof node.content === 'object' && node.content !== null) {
                if ('description' in node.content && typeof node.content.description === 'string') {
                    searchableFields.push(node.content.description);
                }
                // Only push text if it exists and is a string
                if ('text' in node.content && typeof (node.content as any).text === 'string') {
                    searchableFields.push((node.content as any).text);
                }
            }
        }

        return searchableFields
            .filter(text => text && text.length > 0)
            .join(' ')
            .substring(0, 10000); // Limit searchable text size
    }

    // ========================================
    // QUERY OPERATIONS
    // ========================================

    /**
     * Search nodes using database indexes, then enrich with RAG data if needed
     */
    async searchNodes(query: RAGNodeQuery & { enrichFromRAG?: boolean }): Promise<{
        nodes: IRAGNodeDocument[];
        totalCount: number;
        facets: any;
        ragEnriched?: any[];
    }> {
        // First, get fast results from database indexes
        const dbResults = await this.storageAdapter.searchRAGNodes(query);

        // Optionally enrich with full RAG data
        let ragEnriched;
        if (query.enrichFromRAG && dbResults.nodes.length > 0) {
            const ragIds = dbResults.nodes.map(node => node.ragId);
            ragEnriched = await this.getRichRAGData(ragIds);
        }

        return {
            ...dbResults,
            ragEnriched
        };
    }

    /**
     * Get rich RAG data for specific nodes
     */
    async getRichRAGData(ragIds: string[]): Promise<any[]> {
        try {
            const response = await this.aiServerClient.post('/api/rag/nodes/batch', {
                nodeIds: ragIds,
                includeContent: true,
                includeRelationships: true
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get rich RAG data:', error);
            return [];
        }
    }

    /**
     * Get context for AI interaction
     */
    async getContextForAI(focusNodeId: string, contextLayers: number = 3): Promise<any> {
        try {
            const response = await this.aiServerClient.post('/api/rag/context/assemble', {
                focusNodeId,
                layers: contextLayers,
                includeTimeline: true
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get AI context:', error);
            throw error;
        }
    }

    // ========================================
    // NOTIFICATION AND WEBHOOK SUPPORT
    // ========================================

    /**
     * Set up webhook to receive updates from RAG system
     */
    async setupRAGWebhook(webhookUrl: string): Promise<void> {
        try {
            await this.aiServerClient.post('/api/rag/webhooks', {
                url: webhookUrl,
                events: ['node.created', 'node.updated', 'node.deleted', 'relationship.created', 'relationship.updated', 'relationship.deleted']
            });
            console.log('RAG webhook configured');
        } catch (error) {
            console.error('Failed to setup RAG webhook:', error);
            throw error;
        }
    }

    /**
     * Handle webhook notification from RAG system
     */
    async handleRAGWebhook(event: {
        type: string;
        data: any;
        timestamp: string;
    }): Promise<void> {
        try {
            switch (event.type) {
                case 'node.created':
                case 'node.updated':
                    await this.syncSingleNode(event.data.id);
                    break;
                case 'node.deleted':
                    await this.storageAdapter.deleteRAGNode(event.data.id);
                    break;
                case 'relationship.created':
                case 'relationship.updated':
                    await this.syncSingleRelationship(event.data.id);
                    break;
                case 'relationship.deleted':
                    await this.storageAdapter.deleteRAGRelationship(event.data.id);
                    break;
            }
        } catch (error) {
            console.error('Failed to handle RAG webhook:', error);
        }
    }

    /**
     * Sync a single node from RAG system
     */
    private async syncSingleNode(ragId: string): Promise<void> {
        try {
            const response = await this.aiServerClient.get(`/api/rag/nodes/${ragId}`);
            const ragNode: RAGNode = response.data;

            const universeId = typeof ragNode.metadata?.universeId === 'string' ? ragNode.metadata.universeId : '';
            const tags = Array.isArray(ragNode.metadata?.tags) ? ragNode.metadata.tags.filter((t): t is string => typeof t === 'string') : [];
            const categories = Array.isArray(ragNode.metadata?.categories) ? ragNode.metadata.categories.filter((c): c is string => typeof c === 'string') : [];
            const pluginType = typeof ragNode.metadata?.pluginType === 'string' ? ragNode.metadata.pluginType : undefined;
            const authorId = typeof ragNode.metadata?.authorId === 'string' ? ragNode.metadata.authorId : '';
            const collaborators = Array.isArray(ragNode.metadata?.collaborators) ? ragNode.metadata.collaborators.filter((c): c is string => typeof c === 'string') : [];
            const versionHash = typeof ragNode.metadata?.versionHash === 'string' ? ragNode.metadata.versionHash : '';
            const validEncryptionLevels = ['none', 'partial', 'full'] as const;
            let encryptionLevel: 'none' | 'partial' | 'full' = 'none';
            if (typeof ragNode.privacy?.level === 'string' && validEncryptionLevels.includes(ragNode.privacy.level as any)) {
                encryptionLevel = ragNode.privacy.level as 'none' | 'partial' | 'full';
            }
            const encryptedFields = Array.isArray(ragNode.privacy?.encryptedFields) ? ragNode.privacy.encryptedFields.filter((f: unknown): f is string => typeof f === 'string') : [];
            const keyHierarchy = typeof ragNode.privacy?.keyHierarchy === 'string' ? ragNode.privacy.keyHierarchy : '';
            const timelinePosition = typeof ragNode.temporal?.position === 'number' ? ragNode.temporal.position : undefined;
            const stardateEquivalent = typeof ragNode.temporal?.stardateEquivalent === 'number' ? ragNode.temporal.stardateEquivalent : undefined;
            const temporalRelations = Array.isArray(ragNode.temporal?.relations) ? ragNode.temporal.relations.filter((r): r is string => typeof r === 'string') : [];
            const nodeDoc: Omit<IRAGNodeDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                ragId: ragNode.id,
                universeId,
                nodeType: ragNode.type,
                title: ragNode.title ?? '',
                searchableText: this.extractSearchableText(ragNode),
                tags,
                categories,
                encryptionLevel,
                encryptedFields,
                keyHierarchy,
                timelinePosition,
                stardateEquivalent,
                temporalRelations,
                directConnections: [],
                relationshipTypes: [],
                connectionStrengths: [],
                briefSummary: ragNode.summaries?.brief || '',
                mediumSummary: ragNode.summaries?.medium || '',
                detailedSummary: ragNode.summaries?.detailed || '',
                pluginType,
                pluginMetadata: ragNode.pluginData || {},
                authorId,
                collaborators,
                versionHash,
                lastSyncedAt: new Date(),
                accessCount: 0,
                lastAccessedAt: new Date()
            };

            await this.storageAdapter.upsertRAGNode(nodeDoc);
        } catch (error) {
            console.error(`Failed to sync single node ${ragId}:`, error);
        }
    }

    /**
     * Sync a single relationship from RAG system
     */
    private async syncSingleRelationship(relationshipId: string): Promise<void> {
        try {
            const response = await this.aiServerClient.get(`/api/rag/relationships/${relationshipId}`);
            const ragRelationship: RAGRelationship = response.data;

            const universeId = typeof ragRelationship.metadata?.universeId === 'string' ? ragRelationship.metadata.universeId : '';
            const pluginType = typeof ragRelationship.metadata?.pluginType === 'string' ? ragRelationship.metadata.pluginType : undefined;
            const authorId = typeof ragRelationship.metadata?.authorId === 'string' ? ragRelationship.metadata.authorId : '';
            const versionHash = typeof ragRelationship.metadata?.versionHash === 'string' ? ragRelationship.metadata.versionHash : '';
            const pluginMetadata = typeof ragRelationship.metadata?.pluginData === 'object' && ragRelationship.metadata?.pluginData !== null ? ragRelationship.metadata.pluginData : {};
            const validEncryptionLevels = ['none', 'partial', 'full'] as const;
            let encryptionLevel: 'none' | 'partial' | 'full' = 'none';
            if (typeof ragRelationship.metadata?.privacy?.level === 'string' && validEncryptionLevels.includes(ragRelationship.metadata.privacy.level as any)) {
                encryptionLevel = ragRelationship.metadata.privacy.level as 'none' | 'partial' | 'full';
            }
            const encryptedProperties = Array.isArray(ragRelationship.metadata?.privacy?.encryptedFields) ? ragRelationship.metadata.privacy.encryptedFields.filter((f: unknown): f is string => typeof f === 'string') : [];
            const validTemporalScopes = ['event', 'always', 'period'] as const;
            let temporalScope: 'event' | 'always' | 'period' = 'always';
            if (typeof ragRelationship.temporal?.scope === 'string' && validTemporalScopes.includes(ragRelationship.temporal.scope as any)) {
                temporalScope = ragRelationship.temporal.scope as 'event' | 'always' | 'period';
            }
            const validFrom = typeof ragRelationship.temporal?.validFrom === 'number' ? ragRelationship.temporal.validFrom : undefined;
            const validUntil = typeof ragRelationship.temporal?.validUntil === 'number' ? ragRelationship.temporal.validUntil : undefined;
            const temporalContext = Array.isArray(ragRelationship.temporal?.context) ? ragRelationship.temporal.context.filter((c): c is string => typeof c === 'string') : [];
            const relationshipDoc: Omit<IRAGRelationshipDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                relationshipId: ragRelationship.id || '',
                universeId,
                sourceNodeId: ragRelationship.sourceNodeId || '',
                targetNodeId: ragRelationship.targetNodeId || '',
                relationshipType: ragRelationship.relationshipType || '',
                strength: ragRelationship.strength ?? 0,
                bidirectional: ragRelationship.bidirectional ?? false,
                temporalScope,
                validFrom,
                validUntil,
                temporalContext,
                encryptionLevel,
                encryptedProperties,
                pluginType,
                pluginMetadata,
                authorId,
                versionHash,
                lastSyncedAt: new Date()
            };

            await this.storageAdapter.upsertRAGRelationship(relationshipDoc);
        } catch (error) {
            console.error(`Failed to sync single relationship ${relationshipId}:`, error);
        }
    }

    // ========================================
    // HEALTH AND MONITORING
    // ========================================

    /**
     * Get integration service health status
     */
    async getHealthStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        aiServer: { status: string; message: string };
        database: { status: string; message: string };
        lastSync?: Date;
    }> {
        const [aiServerHealth, dbHealth] = await Promise.all([
            this.checkAIServerHealth(),
            this.storageAdapter.healthCheck()
        ]);

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (aiServerHealth.status !== 'healthy' || dbHealth.status !== 'healthy') {
            overallStatus = 'unhealthy';
        }

        return {
            status: overallStatus,
            aiServer: aiServerHealth,
            database: dbHealth
        };
    }

    /**
     * Check AI server health
     */
    private async checkAIServerHealth(): Promise<{ status: string; message: string }> {
        try {
            const response = await this.aiServerClient.get('/api/health');
            return { status: 'healthy', message: 'AI server is responding' };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `AI server unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}

/**
 * Create and configure RAG integration service
 */
export function createRAGIntegrationService(config: RAGIntegrationConfig): RAGIntegrationService {
    return new RAGIntegrationService(config);
}
