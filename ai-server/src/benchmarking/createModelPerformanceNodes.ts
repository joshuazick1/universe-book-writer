import { ensureNode } from 'shared/node/nodeService.js';
import { Node } from 'shared/types/index.js';

/**
 * Creates nodes for model performance based on the provided data.
 * @param performances - Array of performance data to create nodes for.
 * @returns Promise resolving to an array of created nodes.
 */
export async function createModelPerformanceNodes(performances: Array<{ modelId: string; performance: number; metadata: Record<string, any> }>): Promise<Node[]> {
    const nodes: Node[] = [];

    for (const performance of performances) {
        const node = await ensureNode({
            type: 'model-performance',
            title: `Performance for ${performance.modelId}`,
            metadata: { performance: performance.performance, ...performance.metadata },
        });
        nodes.push(node);
    }

    return nodes;
}
