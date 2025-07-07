/**
 * Script to fix OllamaService method calls in the codebase
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/services/aiGeneration/characterGenerationEngine.ts';

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

// Replace response.response with just response
content = content.replace(/response\.response/g, 'response');

// Fix error.message where error might be unknown
content = content.replace(
    /throw new Error\(`Character generation failed: \$\{error\.message\}`\);/,
    'throw new Error(`Character generation failed: ${error instanceof Error ? error.message : String(error)}`);'
);

// Write back
writeFileSync(filePath, content);

console.log('Fixed OllamaService calls in', filePath);
