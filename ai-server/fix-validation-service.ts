/**
 * Script to fix OllamaService method calls in validation service
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/services/aiGeneration/validationService.ts';

// Read the file
let content = readFileSync(filePath, 'utf-8');

// Replace all generateCompletion calls with generateText calls
content = content.replace(
    /const response = await this\.ollamaService\.generateCompletion\(\{\s*prompt,?\s*model: '([^']+)',\s*options: \{\s*temperature: ([\d.]+),?\s*(?:top_p: [\d.]+,?\s*)?(?:top_k: [\d.]+,?\s*)?(?:num_predict: (\d+),?\s*)?\s*\}\s*\}\);/g,
    (match, model, temperature, maxTokens) => {
        const tokens = maxTokens || '500';
        return `const response = await this.ollamaService.generateText(prompt, {
            model: '${model}',
            temperature: ${temperature},
            maxTokens: ${tokens}
        });`;
    }
);

// Simple replacement for basic generateCompletion calls
content = content.replace(
    /const response = await this\.ollamaService\.generateCompletion\(\{([^}]+)\}\);/g,
    (match, options) => {
        // Extract prompt and other options
        const promptMatch = options.match(/prompt:\s*([^,]+)/);
        const tempMatch = options.match(/temperature:\s*([\d.]+)/);
        const modelMatch = options.match(/model:\s*'([^']+)'/);

        const prompt = promptMatch ? promptMatch[1] : 'prompt';
        const temp = tempMatch ? tempMatch[1] : '0.7';
        const model = modelMatch ? `'${modelMatch[1]}'` : 'undefined';

        return `const response = await this.ollamaService.generateText(${prompt}, {
            temperature: ${temp},
            maxTokens: 500${model !== 'undefined' ? `,\n            model: ${model}` : ''}
        });`;
    }
);

// Replace response.response with just response
content = content.replace(/response\.response/g, 'response');

// Fix error.message where error might be unknown
content = content.replace(
    /error\.message/g,
    'error instanceof Error ? error.message : String(error)'
);

// Write back
writeFileSync(filePath, content);

console.log('Fixed OllamaService calls in', filePath);
