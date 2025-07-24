import { ToolDefinition } from '../../../shared/types/toolTypes.js';
import { getOllamaModelResponse } from '../services/llm/ollamaService.js';

/**
 * Suggests a new title for a universe, book, or chapter.
 * @param context - The current context (universe, book, etc.)
 * @returns A string suggestion
 * @example
 *   suggestTitle({ universe: 'My Universe' }) // => 'Chronicles of My Universe'
 */
export const suggestTitle: ToolDefinition = {
    name: 'suggestTitle',
    description: 'Suggests a new title for a universe, book, or chapter.',
    inputSchema: {
        type: 'object',
        properties: {
            universe: { type: 'string', nullable: true },
            book: { type: 'string', nullable: true },
            chapter: { type: 'string', nullable: true }
        },
        additionalProperties: false
    },
    outputSchema: { type: 'string' },
    async execute(context: { universe?: string; book?: string; chapter?: string }) {
        let subject = context.universe || context.book || context.chapter || 'this story';
        let type = context.universe ? 'universe' : context.book ? 'book' : context.chapter ? 'chapter' : 'story';
        const prompt = `Suggest a creative, engaging title for a ${type} called "${subject}". Respond with only the title, no explanation.`;
        // You can change the model name if needed
        const model = 'llama3.1:8b';
        return getOllamaModelResponse(model, prompt);
    }
};
