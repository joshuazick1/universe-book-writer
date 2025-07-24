/**
 * AI Helper Service
 * Handles multi-pass workflow, plugin context/suggestion, and orchestrator queueing for chat/form suggestions.
 * @module aiHelperService
 */
import { PluginSDK } from '../../../packages/plugin-sdk/src/index.js';
import type { Universe, Book, Chapter } from '../../../shared/types/nodeTypes.js';
import { AIOrchestrator } from '../orchestrator.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
// Load fallback models from ai-server/data/ai-model-defaults.json
const defaultsPath = path.resolve(__dirname, '../../data/ai-model-defaults.json');
let modelDefaults: {
    intentDetectModel: string;
    responseModel: string;
    embeddingModel: string;
} = {
    intentDetectModel: 'smollm2:135m',
    responseModel: 'llama3:latest',
    embeddingModel: 'nomic-embed-text:latest'
};
try {
    if (fs.existsSync(defaultsPath)) {
        modelDefaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
    }
} catch (err) {
    // Use hardcoded defaults if file missing or invalid
}

export class AIHelperService {
    private orchestrator: AIOrchestrator;
    constructor(orchestrator?: AIOrchestrator) {
        this.orchestrator = orchestrator || new AIOrchestrator();
    }

    /**
     * Main entry for AI helper requests (chat + form suggestions)
     * @param model - Model to use
     * @param prompt - User prompt
     * @param context - Assembled context
     * @param formState - Current form state
     * @returns AI response and plugin suggestions
     */
    async handleRequest(model: string | undefined, prompt: string, context: any, formState: any): Promise<{ chatResponse: any, suggestions: any, embeddings?: number[] }> {
        // Pass 1: Detect intent using fallback model
        const intentModel = modelDefaults.intentDetectModel;
        // If model is not provided, use fallback response model
        const responseModel = model || modelDefaults.responseModel;
        // Pass 1: Detect intent
        const intent = PluginSDK.detectIntent(prompt); // TODO: Use intentModel for actual AI-based detection
        // Pass 2: Gather plugin context (universe-specific, etc.)
        const pluginContext = context;
        // Pass 3: Generate plugin suggestions
        const suggestions = await PluginSDK.generateSuggestions({ intent, context: pluginContext, formState });
        // Pass 4: Route to best server/model using orchestrator queue (direct call, no API request)
        const chatResponse = await this.orchestrator.tryRequestWithFailover(responseModel, async (server) => {
            // Direct model inference: call server/model handler via fetch
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    context: pluginContext,
                    suggestions,
                    formState,
                    model: responseModel
                })
            });
            if (!resp.ok) {
                const rawText = await resp.text();
                throw new Error(`Model server responded with status ${resp.status}: ${rawText}`);
            }
            const data = await resp.json();
            return data;
        });

        // Pass 5: Generate embeddings for prompt/context using embedding model and orchestrator embedding controller
        let embeddings: number[] | undefined;
        try {
            const embeddingModel = modelDefaults.embeddingModel;
            // Call orchestrator embedding endpoint
            const resp = await fetch('http://localhost:5000/api/orchestrator/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: prompt, model: embeddingModel })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray((data as any).embedding)) embeddings = (data as any).embedding;
            }
        } catch (err) {
            // Embedding fallback: undefined
        }

        return { chatResponse, suggestions, embeddings };
    }
}
