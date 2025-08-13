import { ensureNode } from 'shared/node/nodeService.js';
import { Node } from 'shared/types/index.js';

/**
 * Creates nodes for AI servers based on the provided data.
 * @param servers - Array of server data to create nodes for.
 * @returns Promise resolving to an array of created nodes.
 */
export async function createAIServerNodes(servers: Array<{ id: string; name: string; metadata: Record<string, any> }>): Promise<Node[]> {
    const nodes: Node[] = [];

    for (const server of servers) {
        const node = await ensureNode({
            type: 'ai-server',
            title: server.name,
            metadata: server.metadata,
        });
        nodes.push(node);
    }

    return nodes;
}
