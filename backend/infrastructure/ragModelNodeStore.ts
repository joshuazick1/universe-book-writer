import type { RagModelNode, ModelQualityScore } from '../core/types/ragModelNode.js';


/**
 * In-memory store for RAG model nodes and their quality histories.
 * Replace with persistent DB/graph store in production.
 *
 * Provides atomic, auditable updates and flexible query methods for reporting/aggregation.
 */
export class RagModelNodeStore {
    private readonly nodes: Map<string, RagModelNode> = new Map();

    /** Get a model node by ID */
    getNode(id: string): RagModelNode | undefined {
        return this.nodes.get(id);
    }

    /** Upsert a model node (atomic) */
    upsertNode(node: RagModelNode): void {
        this.nodes.set(node.id, node);
    }

    /**
     * Add a quality score to a model node, updating rolling average and lastUpdated.
     * This operation is atomic for the in-memory store.
     */
    addQualityScore(modelId: string, score: ModelQualityScore): void {
        const node = this.nodes.get(modelId);
        if (!node) return;
        const updatedHistory = [...node.qualityHistory, score];
        const rollingAverageScore = updatedHistory.reduce((sum, s) => sum + s.score, 0) / updatedHistory.length;
        this.nodes.set(modelId, {
            ...node,
            qualityHistory: updatedHistory,
            rollingAverageScore,
            lastUpdated: new Date().toISOString(),
        });
    }

    /** For testing/demo: seed a node */
    seedNode(node: RagModelNode): void {
        this.nodes.set(node.id, node);
    }

    /** Get all model nodes */
    getAllNodes(): RagModelNode[] {
        return Array.from(this.nodes.values());
    }

    /** Get all nodes for a given model name */
    getNodesByModel(modelName: string): RagModelNode[] {
        return Array.from(this.nodes.values()).filter(n => n.modelName === modelName);
    }

    /** Get all nodes for a given model type/task type */
    getNodesByTaskType(modelType: string): RagModelNode[] {
        return Array.from(this.nodes.values()).filter(n => n.modelType === modelType);
    }

    /**
     * Get all quality scores for jobs with a given benchmark suite name.
     * Useful for result aggregation/reporting scripts.
     */
    getQualityScoresByBenchmark(suite: string): ModelQualityScore[] {
        // Assumes ModelQualityScore.details?.benchmarkSuite is set by the quality judger/orchestrator
        return Array.from(this.nodes.values())
            .flatMap(node => node.qualityHistory.filter(score =>
                typeof score.details?.benchmarkSuite === 'string' && score.details.benchmarkSuite === suite
            ));
    }

    /**
     * Flexible: Get all quality scores matching a filter predicate.
     * @param filter (score, node) => boolean
     */
    getQualityScoresByFilter(filter: (score: ModelQualityScore, node: RagModelNode) => boolean): ModelQualityScore[] {
        const result: ModelQualityScore[] = [];
        for (const node of this.nodes.values()) {
            for (const score of node.qualityHistory) {
                if (filter(score, node)) result.push(score);
            }
        }
        return result;
    }
}

export const ragModelNodeStore = new RagModelNodeStore();
