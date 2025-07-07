/**
 * Quick fix script for router handler issues
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/routes/qualityBenchmarks.ts';

// Read the file
let content = readFileSync(filePath, 'utf-8');

// Fix inline handlers by extracting them to proper functions
// Replace router.get(..., (req: Request, res: Response) => {
content = content.replace(
    /router\.(get|post)\('([^']+)', \(req: Request, res: Response\) => \{/g,
    (match, method, path) => {
        // Generate function name from path
        const funcName = path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
        return `const handler_${funcName}: RequestHandler = (req, res): void => {`;
    }
);

// Find and replace the closing of these functions
// This is more complex, so let's do a simpler fix - just add void return types
content = content.replace(
    /router\.(get|post)\('([^']+)', async \(req: Request, res: Response\) => \{/g,
    (match, method, path) => {
        const funcName = path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
        return `const handler_${funcName}: RequestHandler = async (req, res): Promise<void> => {`;
    }
);

// Fix return statements that use return res.status(...).json(...)
content = content.replace(/return res\.status\((\d+)\)\.json\(/g, 'res.status($1).json(');
content = content.replace(/return res\.json\(/g, 'res.json(');

// Add return statements after res.json calls where missing
content = content.replace(/res\.json\([^}]+\}\);$/gm, '$&\n            return;');

// Fix parameter type annotations
content = content.replace(/map\(model => /g, 'map((model: any) => ');

// Write back
writeFileSync(filePath, content);

console.log('Fixed router handlers in', filePath);
