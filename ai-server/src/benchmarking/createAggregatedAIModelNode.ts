import { ensureNode } from 'shared/node/nodeService.js';
import { Node } from 'shared/types/index.js';

/**
 * Creates an aggregated node for AI models based on the provided data.
 * @param modelData - Data for the aggregated AI model node.
 * @returns Promise resolving to the created node.
 */
export async function createAggregatedAIModelNode(modelData: { modelId: string; aggregatedMetrics: Record<string, any>; metadata: Record<string, any> }): Promise<Node> {
    const node = await ensureNode({
        type: 'ai-model',
        title: `Aggregated Metrics for ${modelData.modelId}`,
        metadata: { ...modelData.aggregatedMetrics, ...modelData.metadata },
    });

    return node;
}
