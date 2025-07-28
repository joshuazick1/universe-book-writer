// ai-server/benchmarking/aggregateModelPerformanceToAiModel.ts
/**
 * Aggregates all model-performance nodes into their corresponding ai-model node.
 * Updates ai-model node metadata with aggregate stats per benchmark type across all servers.
 */
import { getNode, ensureNode } from '../../shared/node/nodeService.js';
import type { Node } from '../../shared/types/nodeTypes.js';
import type { BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';

/**
 * Aggregates all model-performance nodes for a given modelId into the ai-model node.
 * @param modelId - The model to aggregate
 * @param allModelPerformanceNodes - All model-performance nodes for this model
 */
export async function aggregateModelPerformanceToAiModel(modelId: string, allModelPerformanceNodes: Node[]): Promise<void> {
    // Collect all scores per benchmark type across all servers
    const scoresByType: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>> = {};
    for (const node of allModelPerformanceNodes) {
        if (node.type !== 'model-performance' || node.metadata?.modelId !== modelId) continue;
        const qualityResults = node.metadata.qualityResults as Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>;
        for (const [type, scores] of Object.entries(qualityResults) as [BenchmarkType, QualityBenchmarkScore[]][]) {
            if (!scoresByType[type]) scoresByType[type] = [];
            scoresByType[type]!.push(...scores);
        }
    }
    // Aggregate per type
    const aggregated: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>> = {};
    for (const [type, scores] of Object.entries(scoresByType) as [BenchmarkType, QualityBenchmarkScore[]][]) {
        if (!scores || scores.length === 0) continue;
        const values = scores.map(s => s.score).filter((v): v is number => typeof v === 'number');
        if (values.length === 0) continue;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 ?
            (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
            sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...values);
        const max = Math.max(...values);
        aggregated[type] = [
            {
                type,
                score: avg,
                rubric: 'average',
                timestamp: new Date().toISOString()
            },
            {
                type,
                score: median,
                rubric: 'median',
                timestamp: new Date().toISOString()
            },
            {
                type,
                score: min,
                rubric: 'min',
                timestamp: new Date().toISOString()
            },
            {
                type,
                score: max,
                rubric: 'max',
                timestamp: new Date().toISOString()
            }
        ];
    }
    // Upsert ai-model node
    const aiModelNode = await getNode({ type: 'ai-model', title: modelId });
    await ensureNode({
        type: 'ai-model',
        title: modelId,
        metadata: {
            ...(aiModelNode?.metadata || {}),
            aggregatedBenchmarks: aggregated,
            lastAggregated: new Date().toISOString(),
        }
    });
}
