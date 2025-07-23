import { MongoClient, Collection } from 'mongodb';
import type { RagModelNode, ModelQualityScore } from '../core/types/ragModelNode.js';

/**
 * Persistent MongoDB-backed store for RAG system nodes (orchestrator, ai-server, ai-model, quality/performance nodes).
 * Collection: system_nodes (in verseforge_rag_dev)
 *
 * All methods mirror the in-memory RagModelNodeStore for drop-in replacement.
 */
export class PersistentRagModelNodeStore {
    private collection!: Collection<RagModelNode>;
    private client: MongoClient;
    private dbName: string;
    private collectionName: string;

    constructor(mongoUri: string, dbName = 'verseforge_rag_dev', collectionName = 'system_nodes') {
        this.client = new MongoClient(mongoUri);
        this.dbName = dbName;
        this.collectionName = collectionName;
        // Collection will be set after connect()
    }

    /** Connect to MongoDB (call before use) */
    async connect(): Promise<void> {
        // For MongoClient v4+, connect() is idempotent and safe to call repeatedly
        await this.client.connect();
        this.collection = this.client.db(this.dbName).collection(this.collectionName);
    }

    /** Get a model node by ID */
    async getNode(id: string): Promise<RagModelNode | null> {
        return this.collection.findOne({ id });
    }

    /** Upsert a model node (atomic) */
    async upsertNode(node: RagModelNode): Promise<void> {
        await this.collection.updateOne({ id: node.id }, { $set: node }, { upsert: true });
    }

    /** Add a quality score to a model node, updating rolling average and lastUpdated */
    async addQualityScore(modelId: string, score: ModelQualityScore): Promise<void> {
        // Fetch node to recompute rolling average
        const node = await this.getNode(modelId);
        if (!node) return;
        const updatedHistory: ModelQualityScore[] = [...node.qualityHistory, score];
        const rollingAverageScore = updatedHistory.reduce((sum, s) => sum + s.score, 0) / updatedHistory.length;
        await this.collection.updateOne(
            { id: modelId },
            {
                $push: { qualityHistory: score },
                $set: {
                    rollingAverageScore,
                    lastUpdated: new Date().toISOString(),
                },
            }
        );
    }

    /** Get all model nodes */
    async getAllNodes(): Promise<RagModelNode[]> {
        return this.collection.find({}).toArray();
    }

    /** Get all nodes for a given model name */
    async getNodesByModel(modelName: string): Promise<RagModelNode[]> {
        return this.collection.find({ modelName }).toArray();
    }

    /** Get all nodes for a given model type/task type */
    async getNodesByTaskType(modelType: string): Promise<RagModelNode[]> {
        return this.collection.find({ modelType }).toArray();
    }

    /**
     * Get all quality scores for jobs with a given benchmark suite name.
     * Assumes ModelQualityScore.details?.benchmarkSuite is set.
     */
    async getQualityScoresByBenchmark(suite: string): Promise<ModelQualityScore[]> {
        const nodes = await this.collection.find({ 'qualityHistory.details.benchmarkSuite': suite }).toArray();
        return nodes.flatMap((node: RagModelNode) =>
            node.qualityHistory.filter((score: ModelQualityScore) =>
                typeof score.details?.benchmarkSuite === 'string' && score.details.benchmarkSuite === suite
            )
        );
    }

    /**
     * Flexible: Get all quality scores matching a filter predicate.
     * Note: filter runs in-memory after fetching all nodes.
     */
    async getQualityScoresByFilter(
        filter: (score: ModelQualityScore, node: RagModelNode) => boolean
    ): Promise<ModelQualityScore[]> {
        const nodes = await this.getAllNodes();
        const result: ModelQualityScore[] = [];
        for (const node of nodes) {
            for (const score of node.qualityHistory as ModelQualityScore[]) {
                if (filter(score, node)) result.push(score);
            }
        }
        return result;
    }

    /** Close the MongoDB connection */
    async close(): Promise<void> {
        await this.client.close();
    }
}
