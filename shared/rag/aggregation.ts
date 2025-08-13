/**
 * @fileoverview Aggregation utilities for RAG (Retrieval-Augmented Generation) data.
 * @module shared/rag/aggregation
 *
 * Provides functions for aggregating and validating RAG data.
 *
 * @example
 * import { aggregateRAGData } from 'shared/rag/aggregation';
 *
 * @edgecase
 * Handles corrupted nodes and large batch processing.
 */

export interface RAGNode {
    id: string;
    data: Record<string, any>;
    timestamp: string;
}

export interface AggregatedRAGData {
    nodeId: string;
    aggregatedData: Record<string, any>;
}

/**
 * Aggregates data from multiple RAG nodes.
 * @param nodes - Array of RAG nodes
 * @returns Aggregated RAG data
 */
export function aggregateRAGData(nodes: RAGNode[]): AggregatedRAGData[] {
    const aggregated: Record<string, Record<string, any>> = {};

    nodes.forEach(node => {
        if (!aggregated[node.id]) {
            aggregated[node.id] = {};
        }

        Object.entries(node.data).forEach(([key, value]) => {
            if (!aggregated[node.id][key]) {
                aggregated[node.id][key] = [];
            }
            aggregated[node.id][key].push(value);
        });
    });

    return Object.entries(aggregated).map(([nodeId, data]) => ({
        nodeId,
        aggregatedData: Object.fromEntries(
            Object.entries(data).map(([key, values]) => [key, (values as number[]).reduce((sum: number, val: number) => sum + val, 0)])
        )
    }));
}

/**
 * Validates the integrity of RAG nodes.
 * @param nodes - Array of RAG nodes
 * @returns True if all nodes are valid, otherwise false
 */
export function validateRAGNodes(nodes: RAGNode[]): boolean {
    return nodes.every(node => typeof node.id === 'string' && typeof node.timestamp === 'string' && typeof node.data === 'object');
}

/**
 * Handles corrupted RAG nodes by attempting recovery.
 * @param nodes - Array of RAG nodes
 * @returns Recovered RAG nodes
 */
export function recoverCorruptedNodes(nodes: RAGNode[]): RAGNode[] {
    return nodes.map(node => {
        if (!validateRAGNodes([node])) {
            console.warn(`Corrupted node detected: ${node.id}`);
            return { ...node, data: {}, timestamp: new Date().toISOString() };
        }
        return node;
    });
}

/**
 * Processes large batches of RAG nodes.
 * @param nodes - Array of RAG nodes
 * @param batchSize - Number of nodes to process per batch
 * @returns Array of aggregated RAG data
 */
export function batchProcessRAGNodes(nodes: RAGNode[], batchSize: number): AggregatedRAGData[] {
    const batches: RAGNode[][] = [];

    for (let i = 0; i < nodes.length; i += batchSize) {
        batches.push(nodes.slice(i, i + batchSize));
    }

    return batches.flatMap(batch => aggregateRAGData(batch));
}
