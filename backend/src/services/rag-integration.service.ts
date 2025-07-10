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

/**
 * RAG node data from AI server
 */
export interface RAGNodeData {
    id: string;
    type: string;
    title: string;
    content: any;
    summaries: {
        brief: string;
        medium: string;
        detailed: string;
    };
    embeddings: number[];
    metadata: any;
    privacy: any;
    temporal?: any;
    pluginData?: any;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}

/**
 * RAG relationship data from AI server
 */
export interface RAGRelationshipData {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    strength: number;
    bidirectional: boolean;
    temporal?: any;
    metadata: any;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}

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
            const nodes: RAGNodeData[] = response.data;

            let synced = 0;
            const batchSize = this.config.batchSize;

            for (let i = 0; i < nodes.length; i += batchSize) {
                const batch = nodes.slice(i, i + batchSize);

                await Promise.all(batch.map(async (ragNode) => {
                    const nodeDoc: Omit<IRAGNodeDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                        ragId: ragNode.id,
                        universeId: ragNode.metadata?.universeId || '',
                        nodeType: ragNode.type,
                        title: ragNode.title,
                        searchableText: this.extractSearchableText(ragNode),
                        tags: ragNode.metadata?.tags || [],
                        categories: ragNode.metadata?.categories || [],
                        encryptionLevel: ragNode.privacy?.level || 'none',
                        encryptedFields: ragNode.privacy?.encryptedFields || [],
                        keyHierarchy: ragNode.privacy?.keyHierarchy || '',
                        timelinePosition: ragNode.temporal?.position,
                        stardateEquivalent: ragNode.temporal?.stardateEquivalent,
                        temporalRelations: ragNode.temporal?.relations || [],
                        directConnections: [], // Will be populated by relationship sync
                        relationshipTypes: [],
                        connectionStrengths: [],
                        briefSummary: ragNode.summaries?.brief || '',
                        mediumSummary: ragNode.summaries?.medium || '',
                        detailedSummary: ragNode.summaries?.detailed || '',
                        pluginType: ragNode.metadata?.pluginType,
                        pluginMetadata: ragNode.pluginData || {},
                        authorId: ragNode.metadata?.authorId || '',
                        collaborators: ragNode.metadata?.collaborators || [],
                        versionHash: ragNode.metadata?.versionHash || '',
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
            const relationships: RAGRelationshipData[] = response.data;

            let synced = 0;
            const batchSize = this.config.batchSize;

            for (let i = 0; i < relationships.length; i += batchSize) {
                const batch = relationships.slice(i, i + batchSize);

                await Promise.all(batch.map(async (ragRelationship) => {
                    const relationshipDoc: Omit<IRAGRelationshipDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                        relationshipId: ragRelationship.id,
                        universeId: ragRelationship.metadata?.universeId || '',
                        sourceNodeId: ragRelationship.sourceNodeId,
                        targetNodeId: ragRelationship.targetNodeId,
                        relationshipType: ragRelationship.relationshipType,
                        strength: ragRelationship.strength,
                        bidirectional: ragRelationship.bidirectional,
                        temporalScope: ragRelationship.temporal?.scope || 'always',
                        validFrom: ragRelationship.temporal?.validFrom,
                        validUntil: ragRelationship.temporal?.validUntil,
                        temporalContext: ragRelationship.temporal?.context || [],
                        encryptionLevel: ragRelationship.metadata?.privacy?.level || 'none',
                        encryptedProperties: ragRelationship.metadata?.privacy?.encryptedFields || [],
                        pluginType: ragRelationship.metadata?.pluginType,
                        pluginMetadata: ragRelationship.metadata?.pluginData || {},
                        authorId: ragRelationship.metadata?.authorId || '',
                        versionHash: ragRelationship.metadata?.versionHash || '',
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
    private extractSearchableText(node: RAGNodeData): string {
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
            } else if (node.content.description) {
                searchableFields.push(node.content.description);
            } else if (node.content.text) {
                searchableFields.push(node.content.text);
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
            const ragNode: RAGNodeData = response.data;

            const nodeDoc: Omit<IRAGNodeDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                ragId: ragNode.id,
                universeId: ragNode.metadata?.universeId || '',
                nodeType: ragNode.type,
                title: ragNode.title,
                searchableText: this.extractSearchableText(ragNode),
                tags: ragNode.metadata?.tags || [],
                categories: ragNode.metadata?.categories || [],
                encryptionLevel: ragNode.privacy?.level || 'none',
                encryptedFields: ragNode.privacy?.encryptedFields || [],
                keyHierarchy: ragNode.privacy?.keyHierarchy || '',
                timelinePosition: ragNode.temporal?.position,
                stardateEquivalent: ragNode.temporal?.stardateEquivalent,
                temporalRelations: ragNode.temporal?.relations || [],
                directConnections: [],
                relationshipTypes: [],
                connectionStrengths: [],
                briefSummary: ragNode.summaries?.brief || '',
                mediumSummary: ragNode.summaries?.medium || '',
                detailedSummary: ragNode.summaries?.detailed || '',
                pluginType: ragNode.metadata?.pluginType,
                pluginMetadata: ragNode.pluginData || {},
                authorId: ragNode.metadata?.authorId || '',
                collaborators: ragNode.metadata?.collaborators || [],
                versionHash: ragNode.metadata?.versionHash || '',
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
            const ragRelationship: RAGRelationshipData = response.data;

            const relationshipDoc: Omit<IRAGRelationshipDocument, '_id' | 'createdAt' | 'updatedAt'> = {
                relationshipId: ragRelationship.id,
                universeId: ragRelationship.metadata?.universeId || '',
                sourceNodeId: ragRelationship.sourceNodeId,
                targetNodeId: ragRelationship.targetNodeId,
                relationshipType: ragRelationship.relationshipType,
                strength: ragRelationship.strength,
                bidirectional: ragRelationship.bidirectional,
                temporalScope: ragRelationship.temporal?.scope || 'always',
                validFrom: ragRelationship.temporal?.validFrom,
                validUntil: ragRelationship.temporal?.validUntil,
                temporalContext: ragRelationship.temporal?.context || [],
                encryptionLevel: ragRelationship.metadata?.privacy?.level || 'none',
                encryptedProperties: ragRelationship.metadata?.privacy?.encryptedFields || [],
                pluginType: ragRelationship.metadata?.pluginType,
                pluginMetadata: ragRelationship.metadata?.pluginData || {},
                authorId: ragRelationship.metadata?.authorId || '',
                versionHash: ragRelationship.metadata?.versionHash || '',
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
