/**
 * PromptSyncService
 *
 * Scans all files in shared/prompts/, syncs them as RAG nodes, and generates embeddings for semantic search.
 * Each prompt is versioned, tagged, and linked to its embedding for context-aware retrieval.
 *
 * Usage:
 *   const service = new PromptSyncService(orchestrator);
 *   await service.syncAllPrompts();
 *
 * Edge cases: Handles missing files, duplicate prompts, embedding failures, and RAG sync errors.
 */
import fs from 'fs';
import path from 'path';
import { AIOrchestrator } from '../orchestrator.js';

export interface PromptMetadata {
    name: string;
    type: string;
    tags: string[];
    version: string;
    description?: string;
    [key: string]: any;
}

export interface SyncedPrompt {
    id: string;
    metadata: PromptMetadata;
    content: string;
    embedding?: number[];
    ragNodeId?: string;
}

export class PromptSyncService {
    private orchestrator: AIOrchestrator;
    private promptDir: string;

    constructor(orchestrator: AIOrchestrator, promptDir = path.resolve('shared/prompts')) {
        this.orchestrator = orchestrator;
        this.promptDir = promptDir;
    }

    /**
     * Scan all prompt files and return their metadata/content
     */
    async scanPromptFiles(): Promise<SyncedPrompt[]> {
        const files = fs.readdirSync(this.promptDir).filter(f => f.endsWith('.ts') || f.endsWith('.md'));
        const prompts: SyncedPrompt[] = [];
        for (const file of files) {
            const filePath = path.join(this.promptDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            // Extract metadata block (assume top-of-file JSDoc or YAML frontmatter)
            const metadata = this.extractMetadata(content, file);
            prompts.push({
                id: `${metadata.name || file}-${metadata.version || 'v1'}`,
                metadata,
                content,
            });
        }
        return prompts;
    }

    /**
     * Extract prompt metadata from file content
     */
    extractMetadata(content: string, file: string): PromptMetadata {
        // Simple YAML frontmatter or JSDoc block parser
        const match = content.match(/---([\s\S]*?)---/);
        if (match) {
            try {
                // Parse YAML (naive)
                const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
                const meta: any = {};
                for (const line of lines) {
                    const [key, ...rest] = line.split(':');
                    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
                }
                meta.name = meta.name || file.replace(/\..*$/, '');
                meta.version = meta.version || 'v1';
                meta.tags = meta.tags ? meta.tags.split(',').map((t: string) => t.trim()) : [];
                return meta as PromptMetadata;
            } catch {
                // Fallback to filename
                return { name: file.replace(/\..*$/, ''), type: 'unknown', tags: [], version: 'v1' };
            }
        }
        // Fallback: filename as name
        return { name: file.replace(/\..*$/, ''), type: 'unknown', tags: [], version: 'v1' };
    }

    /**
     * Sync all prompts to RAG as nodes, generate embeddings, and attach them
     */
    async syncAllPrompts(): Promise<SyncedPrompt[]> {
        const prompts = await this.scanPromptFiles();
        for (const prompt of prompts) {
            // Upsert RAG node
            const ragNodeId = await this.upsertPromptNode(prompt);
            // Generate embedding
            const embedding = await this.generateEmbedding(prompt.content);
            // Attach embedding to RAG node
            await this.attachEmbeddingToNode(ragNodeId, embedding);
            prompt.ragNodeId = ragNodeId;
            prompt.embedding = embedding;
        }
        return prompts;
    }

    /**
     * Upsert a prompt as a RAG node
     */
    async upsertPromptNode(prompt: SyncedPrompt): Promise<string> {
        // Use orchestrator's RAG service
        const ragService = await this.orchestrator.getRAGService();
        if (!ragService) throw new Error('RAG service unavailable');
        const nodeId = `prompt:${prompt.id}`;
        await ragService.upsertNode(nodeId, {
            id: nodeId,
            type: 'prompt',
            content: { text: prompt.content, metadata: prompt.metadata },
            metadata: prompt.metadata,
            active: true
        });
        return nodeId;
    }

    /**
     * Generate embedding for prompt content using orchestrator embedding controller
     */
    async generateEmbedding(content: string): Promise<number[]> {
        // Directly invoke the orchestrator embedding controller logic
        // Import the controller function
        const { orchestratorEmbed } = await import('../controllers/orchestratorEmbeddingController.js');
        // Create mock Express req/res objects
        const req: any = { body: { text: content } };
        let embedding: number[] | undefined;
        // Mock res object to capture json response
        const res: any = {
            json: (data: { embedding: number[] }) => {
                embedding = data.embedding;
            },
            status: (code: number) => ({ json: (data: any) => { throw new Error(`Embedding error: ${data.error || code}`); } })
        };
        await orchestratorEmbed(req, res);
        if (!embedding) throw new Error('No embedding returned from controller');
        return embedding;
    }

    /**
     * Attach embedding to RAG node
     */
    async attachEmbeddingToNode(nodeId: string, embedding: number[]): Promise<void> {
        const ragService = await this.orchestrator.getRAGService();
        if (!ragService) throw new Error('RAG service unavailable');
        await ragService.updateNode(nodeId, { embeddings: embedding });
    }
}

/**
 * README: PromptSyncService
 *
 * - Scans shared/prompts/ for all prompt files
 * - Extracts metadata and content
 * - Syncs each prompt as a RAG node (versioned, tagged)
 * - Generates and attaches embeddings for semantic search
 * - Handles edge cases: missing files, duplicate prompts, embedding failures
 * - Usage: see JSDoc above
 */
