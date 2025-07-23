/**
 * AI domain interfaces and types
 */

export interface AIModelConfig {
  name: string;
  version: string;
  type: 'local' | 'remote';
  parameters: Record<string, unknown>;
}

export interface AIResponse {
  text: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface AIService {
  initialize(config: AIModelConfig): Promise<void>;
  generate(prompt: string): Promise<AIResponse>;
  terminate(): Promise<void>;
}
