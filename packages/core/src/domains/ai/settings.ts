import { z } from 'zod';

/**
 * AI Settings schema and types
 */

export const OllamaServerSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  isActive: z.boolean(),
  priority: z.number().min(0).max(100),
  maxConcurrentRequests: z.number().min(1),
  models: z.array(z.string()),
  tags: z.array(z.string()).optional(),
});

export const AISettingsSchema = z.object({
  ollamaServers: z.array(OllamaServerSettingsSchema),
  defaultServer: z.string(), // references an ollamaServer id
  modelPreferences: z.record(z.string(), z.string()), // task type -> model name
  requestTimeout: z.number().min(1000), // in milliseconds
  contextWindow: z.number().min(100), // in tokens
});

export type OllamaServerSettings = z.infer<typeof OllamaServerSettingsSchema>;
export type AISettings = z.infer<typeof AISettingsSchema>;

export const DefaultAISettings: AISettings = {
  ollamaServers: [],
  defaultServer: '',
  modelPreferences: {},
  requestTimeout: 30000,
  contextWindow: 4000,
};
