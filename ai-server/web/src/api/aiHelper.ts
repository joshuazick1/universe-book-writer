/**
 * AI Helper API utility for Universe Book Writer frontend.
 * Handles chat and suggestion requests to the backend AI helper endpoint.
 *
 * Usage:
 *   import { sendAiHelperRequest } from './api/aiHelper';
 *   const response = await sendAiHelperRequest({ ... });
 */

export interface AiHelperRequest {
    prompt: string;
    context?: {
        universeId?: string;
        bookId?: string;
        chapterId?: string;
        // Add more as needed
    };
    formState?: Record<string, unknown>;
    // Optionally add userId, session, etc.
}

export interface AiHelperSuggestion {
    field: string;
    suggestion: string;
    diff?: { before: string; after: string };
    reason?: string;
}

export interface AiHelperResponse {
    messages: { role: string; content: string }[];
    suggestions?: AiHelperSuggestion[];
    error?: string;
    queueStatus?: {
        queued: boolean;
        position?: number;
        retryAfter?: number;
    };
}

/**
 * Sends a request to the AI helper backend endpoint.
 * @param req - The request payload (prompt, context, formState)
 * @returns The AI response (chat messages, suggestions, errors, etc.)
 */
export async function sendAiHelperRequest(req: AiHelperRequest): Promise<AiHelperResponse> {
    const res = await fetch('/api/ai/helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
    });
    if (!res.ok) {
        // Try to parse error message from backend
        let errorMsg = `HTTP ${res.status}`;
        try {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
        } catch { }
        return { messages: [], error: errorMsg };
    }
    return await res.json();
}
