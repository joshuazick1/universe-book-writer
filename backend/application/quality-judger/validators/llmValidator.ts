/**
 * LLM-based validator for subjective metrics (clarity, coverage, factuality, etc.)
 * Calls a local LLM (e.g., smollm2:135m) via HTTP API for scoring.
 * @module backend/application/quality-judger/validators/llmValidator
 */
import fetch from 'node-fetch';

export interface LlmValidatorParams {
    prompt: string;
    model: string;
    reference?: string;
}

export interface LlmValidatorResult {
    metric: string;
    passed: boolean;
    score: number;
    rationale: string;
}

/**
 * Calls a local LLM API (Ollama-compatible) to score a summary or answer a rubric prompt.
 * @param value - The string to validate (e.g., summary)
 * @param params - LlmValidatorParams (prompt, model, reference)
 * @returns LlmValidatorResult
 */
export async function llmValidator(
    value: string,
    params: LlmValidatorParams & { metric?: string; threshold?: number }
): Promise<LlmValidatorResult> {
    const { prompt, model, reference, metric = 'llm', threshold = 0.7 } = params;
    // Compose the LLM prompt
    let fullPrompt = prompt + '\n';
    if (reference) {
        fullPrompt += `Reference: ${reference}\n`;
    }
    fullPrompt += `Summary: ${value}\nScore (1-5) and rationale:`;

    // Call Ollama or compatible LLM API
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt: fullPrompt,
            stream: false
        })
    });
    if (!response.ok) {
        return {
            metric,
            passed: false,
            score: 0,
            rationale: `LLM API error: ${response.statusText}`
        };
    }
    const data = await response.json() as { response: string };
    // Parse LLM output: expect something like "Score: 4 Rationale: ..."
    const match = /([1-5])/g.exec(data.response);
    const scoreRaw = match ? parseInt(match[1], 10) : 3;
    const score = (scoreRaw - 1) / 4; // Normalize 1-5 to 0-1
    const passed = score >= threshold;
    return {
        metric,
        passed,
        score,
        rationale: data.response.trim()
    };
}
