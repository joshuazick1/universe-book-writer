/**
 * Utility to extract <think>...</think> reasoning and the final answer from model responses.
 *
 * - Returns both the reasoning/thinking (if present) and the final answer (after all <think> blocks).
 * - Handles multiple <think> blocks, whitespace, and edge cases.
 * - Used for both latency and quality benchmarks.
 *
 * @param raw - The raw model response string
 * @returns { thinking: string | null, answer: string }
 *
 * @example
 * const { thinking, answer } = extractThinkingAndAnswer('<think>Reasoning</think>Final answer');
 * // thinking: 'Reasoning', answer: 'Final answer'
 */
export function extractThinkingAndAnswer(raw: string): { thinking: string | null, answer: string } {
    if (!raw || typeof raw !== 'string') return { thinking: null, answer: '' };
    // Match all <think>...</think> blocks (greedy, multiline)
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    let thinkingParts: string[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    while ((match = thinkRegex.exec(raw)) !== null) {
        thinkingParts.push(match[1].trim());
        lastIndex = thinkRegex.lastIndex;
    }
    // The answer is whatever comes after the last </think>, or the whole string if no <think>
    const answer = raw.slice(lastIndex).trim();
    return {
        thinking: thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null,
        answer
    };
}
