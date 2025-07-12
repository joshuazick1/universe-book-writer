// scripts/test-llm-eval-endpoint.ts
/**
 * Quick script to POST to /api/llm/eval and print the response.
 * Usage: npx tsx scripts/test-llm-eval-endpoint.ts
 */
import fetch from 'node-fetch';

async function main() {
    const url = 'http://localhost:5100/api/llm/eval';
    const body = {
        model: 'smollm2:135m',
        prompt: 'Does the summary cover all main ideas?',
        input: 'The ship left port and the crew prepared for their mission.'
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Request failed:', err);
    }
}

main();
