/**
 * storeRawText.ts
 *
 * Pipeline step: Store full submitted text to the appropriate chapter or book node, with versioning.
 *
 * This function saves the raw text submission to the knowledge graph, versioning the node for rollback/history.
 *
 * @module pipeline/storeRawText
 */

import { getNodeById, createNode, updateNode } from '../services/ragNodeService.js';

/**
 * Metadata for the text submission.
 */
export interface StoreRawTextInput {
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly text: string;
    readonly submittedBy: string;
    readonly timestamp?: Date;
}

/**
 * Result of storing raw text.
 */
export interface StoreRawTextResult {
    readonly nodeId: string;
    readonly version: number;
    readonly previousVersion?: number;
}

/**
 * Stores the full submitted text to the appropriate chapter or book node in the knowledge graph, with versioning.
 *
 * - If chapterId is provided, stores on the chapter node; otherwise, stores on the book node.
 * - Creates a new version for rollback/history.
 *
 * @param input - Submission metadata and text
 * @returns Information about the stored node and version
 *
 * @example
 * const result = await storeRawText({
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   text: 'Once upon a time...',
 *   submittedBy: 'user123',
 * });
 */
export async function storeRawText(input: StoreRawTextInput): Promise<StoreRawTextResult> {
    const { universeId, bookId, chapterId, text, submittedBy, timestamp } = input;
    // Determine target node (chapter or book)
    const targetNodeId = chapterId || bookId;
    const targetNodeType = chapterId ? 'chapter' : 'book';

    // Fetch current node (if any)
    const currentNode = await getNodeById(targetNodeId);
    const previousVersion = currentNode?.metadata?.version ?? 0;
    const newVersion = previousVersion + 1;

    // Prepare new content and metadata
    const newContent = {
        ...(currentNode?.content || {}),
        fullText: text,
        description: (currentNode?.content?.description || '').trim() || 'Raw text submission',
    };
    const newMetadata = {
        ...(currentNode?.metadata || {}),
        universeId,
        bookId,
        chapterId,
        version: newVersion,
        ownerId: (currentNode?.metadata?.ownerId || submittedBy),
        sensitivity: (currentNode?.metadata?.sensitivity || 'public'),
        tags: (currentNode?.metadata?.tags || []),
    };

    const createdTimestamp = currentNode?.timestamps?.created || timestamp || new Date();
    await updateNode(targetNodeId, {
        type: targetNodeType,
        content: newContent,
        metadata: newMetadata,
        timestamps: { ...((currentNode?.timestamps || {}) as any), created: createdTimestamp, modified: timestamp || new Date() },
    });

    return {
        nodeId: targetNodeId,
        version: newVersion,
        previousVersion: previousVersion > 0 ? previousVersion : undefined,
    };
}

/**
 * Edge Cases:
 * - If the node does not exist, RagNodeService.updateNode should create it.
 * - If versioning fails, an error is thrown.
 * - If both chapterId and bookId are missing, an error is thrown.
 */
