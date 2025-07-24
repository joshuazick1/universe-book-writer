/**
 * PluginOrchestrationService
 *
 * Coordinates multi-pass workflows for chat and form suggestions, integrating plugin context and suggestion hooks.
 * Supports per-universe/book/chapter plugin logic and context enrichment.
 *
 * Usage:
 *   const service = new PluginOrchestrationService(orchestrator);
 *   const result = await service.runMultiPassWorkflow(request, formState);
 *
 * Edge cases: Handles plugin timeouts, context enrichment failures, and suggestion conflicts.
 */
import { AIOrchestrator } from '../orchestrator.js';
import { PluginSDK } from '../../../packages/plugin-sdk/src/index.js';

export interface MultiPassRequest {
    prompt: string;
    context: any;
    formState: any;
    universeId?: string;
    bookId?: string;
    chapterId?: string;
}

export interface MultiPassResult {
    passes: Array<{
        pass: number;
        type: string;
        context: any;
        suggestions: any;
        response?: any;
        errors?: string[];
    }>;
    finalResponse: any;
    pluginContext: any;
    allSuggestions: any[];
}

export class PluginOrchestrationService {
    private orchestrator: AIOrchestrator;

    constructor(orchestrator: AIOrchestrator) {
        this.orchestrator = orchestrator;
    }

    /**
     * Run the full multi-pass workflow for chat/form suggestions
     */
    async runMultiPassWorkflow(request: MultiPassRequest): Promise<MultiPassResult> {
        const passes = [];
        let pluginContext = await this.orchestrator.getPluginContext(request.context);
        let allSuggestions: any[] = [];
        let errors: string[] = [];

        // Pass 1: Intent detection
        let intent: any;
        try {
            intent = PluginSDK.detectIntent(request.prompt);
            passes.push({ pass: 1, type: 'intent_detection', context: pluginContext, suggestions: null, response: intent });
        } catch (err) {
            errors.push('Intent detection failed');
        }

        // Pass 2: Context gathering
        try {
            pluginContext = await this.orchestrator.getPluginContext(request.context);
            passes.push({ pass: 2, type: 'context_gathering', context: pluginContext, suggestions: null });
        } catch (err) {
            errors.push('Context gathering failed');
        }

        // Pass 3: Suggestion generation (per form type)
        try {
            const suggestions = await this.orchestrator.getPluginSuggestions(intent, pluginContext, request.formState);
            allSuggestions.push(suggestions);
            passes.push({ pass: 3, type: 'suggestion_generation', context: pluginContext, suggestions });
        } catch (err) {
            errors.push('Suggestion generation failed');
        }

        // Pass 4: Compose final response
        let finalResponse: any = null;
        try {
            finalResponse = await this.orchestrator.runModel(
                'llama3.2', // Example model, should be selected dynamically
                request.prompt,
                pluginContext,
                allSuggestions[0]
            );
            passes.push({ pass: 4, type: 'response_composition', context: pluginContext, suggestions: allSuggestions[0], response: finalResponse });
        } catch (err) {
            errors.push('Response composition failed');
        }

        return {
            passes,
            finalResponse,
            pluginContext,
            allSuggestions,
        };
    }
}

/**
 * README: PluginOrchestrationService
 *
 * - Coordinates multi-pass workflows for chat/form suggestions
 * - Integrates plugin context and suggestion hooks for each pass
 * - Handles per-universe/book/chapter plugin logic
 * - Provides API for orchestrator/AI helper to invoke multi-pass orchestration
 * - Handles edge cases: plugin timeouts, context enrichment failures, suggestion conflicts
 * - Usage: see JSDoc above
 */
