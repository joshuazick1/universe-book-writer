import express, { Request, Response } from 'express';
import { assembleContext, AssembleContextInput } from '../../../shared/context/assembleContext.js';
import { systemPrompts, SystemPrompt } from '../../../shared/prompts/systemPrompts.js';
import { pluginPrompts, PluginPrompt } from '../../../shared/prompts/pluginPrompts.js';
import { universePrompts, UniversePrompt } from '../../../shared/prompts/universePrompts.js';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = express.Router();

/**
 * POST /api/ai/helper
 * Accepts user prompt, form state, and dashboard context, returns AI suggestions and diffs.
 * Strictly typed for all request/response fields.
 */
router.post('/helper', async (req: Request, res: Response) => {
    try {
        const { prompt, formState, dashboardContext, pluginContext } = req.body as {
            prompt: string;
            formState?: AssembleContextInput['formState'];
            dashboardContext?: AssembleContextInput['dashboardContext'];
            pluginContext?: AssembleContextInput['pluginContext'];
        };
        // Assemble context for orchestration
        const context = await assembleContext({ formState, dashboardContext, pluginContext });
        // Aggregate all prompts for orchestration
        const allPrompts: Array<SystemPrompt | PluginPrompt | UniversePrompt> = [
            ...systemPrompts,
            ...pluginPrompts,
            ...universePrompts
        ];
        const orchestrator = getOrchestratorInstance();
        // Dynamic model selection based on context and available models
        let model = 'llama3.2:latest'; // fallback
        if (allPrompts.length > 0 && context && context.formState && context.formState.genre) {
            // Example: select model based on genre or other context
            if (context.formState.genre === 'Fantasy') {
                model = 'llama3.2:latest';
            } else if (context.formState.genre === 'Sci-Fi') {
                model = 'llama3.2:latest';
            } else {
                // Use orchestrator's best model selection logic
                const bestServer = orchestrator.getBestServerForModel('llama3.2:latest');
                if (bestServer && bestServer.models.length > 0) {
                    model = bestServer.models[0];
                }
            }
        } else {
            // Use orchestrator's best model selection logic
            const bestServer = orchestrator.getBestServerForModel('llama3.2:latest');
            if (bestServer && bestServer.models.length > 0) {
                model = bestServer.models[0];
            }
        }
        // Suggestions: can be generated via plugin SDK or left empty for now
        const suggestions = {};

        // Retry logic: try up to 3 servers/models on failure
        let aiResult = null;
        let lastError: any = null;
        const triedModels: string[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                aiResult = await orchestrator.runModel(model, prompt, context, suggestions);
                if (aiResult && !aiResult.error) {
                    break;
                }
                lastError = aiResult?.error || 'Unknown error';
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
            triedModels.push(model);
            // Try next best model/server (filter out already tried models)
            const allServers = orchestrator.getBestServerForModel('llama3.2:latest');
            let foundNewModel = false;
            if (allServers && allServers.models && allServers.models.length > 0) {
                for (const m of allServers.models) {
                    if (!triedModels.includes(m)) {
                        model = m;
                        foundNewModel = true;
                        break;
                    }
                }
            }
            if (!foundNewModel) {
                break;
            }
        }
        if (aiResult && !aiResult.error) {
            // Extract AI message from aiResult.response with robust fallback
            let aiMessage = '';
            let rawResponse = aiResult.response;
            let parsed: any = null;
            let parseError: any = null;
            try {
                if (typeof rawResponse === 'string') {
                    parsed = JSON.parse(rawResponse);
                } else {
                    parsed = rawResponse;
                }
            } catch (err) {
                parseError = err;
            }
            // Try to extract a meaningful message
            if (parsed && (parsed.content || parsed.text || parsed.suggestion || parsed.title)) {
                aiMessage = parsed.content || parsed.text || parsed.suggestion || parsed.title;
            } else if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                aiMessage = JSON.stringify(parsed);
            } else if (rawResponse) {
                aiMessage = String(rawResponse);
            } else {
                aiMessage = '[AI returned no content]';
            }
            // Add logging for debugging
            // eslint-disable-next-line no-console
            console.log('[AI HELPER] Raw model response:', rawResponse);
            if (parseError) {
                // eslint-disable-next-line no-console
                console.warn('[AI HELPER] Failed to parse model response as JSON:', parseError);
            }
            res.json({
                messages: [{ role: 'ai', content: aiMessage }],
                receivedPrompt: prompt,
                context,
                availablePrompts: allPrompts.map(p => p.metadata.name),
                aiResult,
            });
        } else {
            res.status(500).json({
                error: `Model server responded with status 500 after trying models: ${triedModels.join(', ')}. Last error: ${lastError}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
