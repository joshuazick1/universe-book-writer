/**
 * Ollama Service - Interface for AI text generation with real API integration
 */

export interface GenerationOptions {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    stream?: boolean;
    timeout?: number;
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    response?: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    options?: {
        temperature?: number;
        num_predict?: number;
        top_p?: number;
        top_k?: number;
    };
}

export class OllamaService {
    private baseUrl: string;
    private defaultModel: string = 'llama3.1:8b';
    private timeout: number = 30000; // 30 seconds default

    constructor(baseUrl: string = 'http://localhost:5100') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generate text using Ollama API
     */
    async generateText(prompt: string, options: GenerationOptions = {}): Promise<string> {
        const {
            temperature = 0.7,
            maxTokens = 500,
            model = this.defaultModel,
            stream = false,
            timeout = this.timeout
        } = options;

        try {
            const startTime = Date.now();
            console.log(`[OllamaService] Generating text with model: ${model}`);
            console.log(`[OllamaService] Prompt length: ${prompt.length} characters`);

            const requestBody: OllamaGenerateRequest = {
                model,
                prompt,
                stream,
                options: {
                    temperature,
                    num_predict: maxTokens,
                    top_p: 0.9,
                    top_k: 40
                }
            };

            const response = await this.makeApiCall('/api/generate', requestBody, timeout);

            if (!response.response) {
                throw new Error('Empty response from Ollama API');
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[OllamaService] Generation completed in ${duration}ms`);
            console.log(`[OllamaService] Response length: ${response.response.length} characters`);

            // For character chat, we expect natural language responses, not JSON
            // But for gap-filling (which expects JSON), we need to handle both cases
            if (this.isGapFillingRequest(prompt)) {
                return this.formatAsGapFillingResponse(response.response, prompt);
            }

            return response.response.trim();

        } catch (error) {
            console.error('[OllamaService] Error generating text:', error);

            // Fallback to mock response if Ollama is unavailable
            if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('timeout'))) {
                console.warn('[OllamaService] Ollama API unavailable, using fallback response');
                return this.getFallbackResponse(prompt, options);
            }

            throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Make HTTP call to Ollama API
     */
    private async makeApiCall(endpoint: string, requestBody: any, timeout: number): Promise<OllamaResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return data as OllamaResponse;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }

            throw error;
        }
    }

    /**
     * Check if this is a gap-filling request that expects JSON response
     */
    private isGapFillingRequest(prompt: string): boolean {
        return prompt.includes('MAIN EVENT:') &&
            prompt.includes('CHARACTER:') &&
            prompt.includes('QUERY:');
    }

    /**
     * Format natural language response as JSON for gap-filling compatibility
     */
    private formatAsGapFillingResponse(response: string, prompt: string): string {
        // Extract context from prompt
        const characterMatch = prompt.match(/CHARACTER: ([^\n]+)/);
        const eventMatch = prompt.match(/MAIN EVENT: ([^\n]+)/);

        const character = characterMatch?.[1] || 'the character';
        const event = eventMatch?.[1] || 'the main event';

        return JSON.stringify({
            content: response.trim(),
            scenarioContext: `Activities during ${event}`,
            associatedEntities: this.extractEntitiesFromResponse(response),
            reasoning: `Generated by AI model based on character context and situational analysis`,
            evidenceUsed: ['Character behavior patterns', 'Situational context', 'AI inference'],
            conflictWarnings: []
        });
    }

    /**
     * Extract entities from AI response
     */
    private extractEntitiesFromResponse(response: string): string[] {
        const entities: string[] = [];
        const text = response.toLowerCase();

        // Common entity patterns
        const entityPatterns = [
            { pattern: /civilian|people|community/g, entity: 'civilians' },
            { pattern: /resource|supply|equipment/g, entity: 'resources' },
            { pattern: /authority|official|government/g, entity: 'authorities' },
            { pattern: /document|report|file/g, entity: 'documents' },
            { pattern: /communication|message|contact/g, entity: 'communication' },
            { pattern: /security|defense|protection/g, entity: 'security' },
            { pattern: /meeting|council|gathering/g, entity: 'meetings' },
            { pattern: /location|place|area/g, entity: 'locations' }
        ];

        for (const { pattern, entity } of entityPatterns) {
            if (pattern.test(text)) {
                entities.push(entity);
            }
        }

        return [...new Set(entities)]; // Remove duplicates
    }

    /**
     * Get fallback response when Ollama is unavailable
     */
    private getFallbackResponse(prompt: string, options: GenerationOptions): string {
        console.log('[OllamaService] Generating fallback response');

        if (this.isGapFillingRequest(prompt)) {
            const characterMatch = prompt.match(/CHARACTER: ([^\n]+)/);
            const eventMatch = prompt.match(/MAIN EVENT: ([^\n]+)/);
            const queryMatch = prompt.match(/QUERY: "([^"]+)"/);

            const character = characterMatch?.[1] || 'the character';
            const event = eventMatch?.[1] || 'the main event';
            const query = queryMatch?.[1] || '';

            const fallbackContent = `During ${event}, ${character} was likely engaged in activities that were appropriate to their role and the circumstances. Without more specific context, it's reasonable to assume they were handling responsibilities related to their usual duties while being aware of the ongoing situation.`;

            return JSON.stringify({
                content: fallbackContent,
                scenarioContext: `Fallback analysis for ${event}`,
                associatedEntities: ['general_activities', 'responsibilities'],
                reasoning: 'Fallback response due to AI service unavailability',
                evidenceUsed: ['General character behavior patterns'],
                conflictWarnings: ['This is a fallback response - may lack specific context']
            });
        }

        return `I apologize, but I'm currently unable to process your request due to technical issues. Please try again in a moment.`;
    }
    /**
     * Check if Ollama service is available
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout for connection check
            });

            return response.ok;
        } catch (error) {
            console.warn('[OllamaService] Connection check failed:', error);
            return false;
        }
    }

    /**
     * Get available models from Ollama
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();

            // Extract model names from Ollama response
            if (data.models && Array.isArray(data.models)) {
                return data.models.map((model: any) => model.name || model.model);
            }

            return [];
        } catch (error) {
            console.error('[OllamaService] Failed to get available models:', error);
            // Return default models as fallback
            return ['llama3.1:8b', 'llama3.2', 'mistral', 'mistral-nemo:12b'];
        }
    }

    /**
     * Pull/download a model if not available
     */
    async pullModel(modelName: string): Promise<boolean> {
        try {
            console.log(`[OllamaService] Pulling model: ${modelName}`);

            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: modelName }),
                signal: AbortSignal.timeout(300000) // 5 minute timeout for model pulling
            });

            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.status}`);
            }

            console.log(`[OllamaService] Successfully pulled model: ${modelName}`);
            return true;
        } catch (error) {
            console.error(`[OllamaService] Failed to pull model ${modelName}:`, error);
            return false;
        }
    }

    /**
     * Get model information
     */
    async getModelInfo(modelName: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/api/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: modelName }),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`Failed to get model info: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[OllamaService] Failed to get model info for ${modelName}:`, error);
            return null;
        }
    }

    /**
     * Set default model
     */
    setDefaultModel(modelName: string): void {
        this.defaultModel = modelName;
    }

    /**
     * Get current default model
     */
    getDefaultModel(): string {
        return this.defaultModel;
    }

    /**
     * Set base URL for Ollama service
     */
    setBaseUrl(url: string): void {
        this.baseUrl = url;
    }

    /**
     * Get current base URL
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }
}
