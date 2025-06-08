import { z } from 'zod';
/**
 * AI Settings schema and types
 */
export declare const OllamaServerSettingsSchema: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    url: z.ZodString;
    isActive: z.ZodBoolean;
    priority: z.ZodNumber;
    maxConcurrentRequests: z.ZodNumber;
    models: z.ZodArray<z.ZodString, 'many'>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    url: string;
    priority: number;
    id: string;
    isActive: boolean;
    maxConcurrentRequests: number;
    models: string[];
    tags?: string[] | undefined;
  },
  {
    name: string;
    url: string;
    priority: number;
    id: string;
    isActive: boolean;
    maxConcurrentRequests: number;
    models: string[];
    tags?: string[] | undefined;
  }
>;
export declare const AISettingsSchema: z.ZodObject<
  {
    ollamaServers: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodString;
          url: z.ZodString;
          isActive: z.ZodBoolean;
          priority: z.ZodNumber;
          maxConcurrentRequests: z.ZodNumber;
          models: z.ZodArray<z.ZodString, 'many'>;
          tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: string;
          url: string;
          priority: number;
          id: string;
          isActive: boolean;
          maxConcurrentRequests: number;
          models: string[];
          tags?: string[] | undefined;
        },
        {
          name: string;
          url: string;
          priority: number;
          id: string;
          isActive: boolean;
          maxConcurrentRequests: number;
          models: string[];
          tags?: string[] | undefined;
        }
      >,
      'many'
    >;
    defaultServer: z.ZodString;
    modelPreferences: z.ZodRecord<z.ZodString, z.ZodString>;
    requestTimeout: z.ZodNumber;
    contextWindow: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    ollamaServers: {
      name: string;
      url: string;
      priority: number;
      id: string;
      isActive: boolean;
      maxConcurrentRequests: number;
      models: string[];
      tags?: string[] | undefined;
    }[];
    defaultServer: string;
    modelPreferences: Record<string, string>;
    requestTimeout: number;
    contextWindow: number;
  },
  {
    ollamaServers: {
      name: string;
      url: string;
      priority: number;
      id: string;
      isActive: boolean;
      maxConcurrentRequests: number;
      models: string[];
      tags?: string[] | undefined;
    }[];
    defaultServer: string;
    modelPreferences: Record<string, string>;
    requestTimeout: number;
    contextWindow: number;
  }
>;
export type OllamaServerSettings = z.infer<typeof OllamaServerSettingsSchema>;
export type AISettings = z.infer<typeof AISettingsSchema>;
export declare const DefaultAISettings: AISettings;
//# sourceMappingURL=settings.d.ts.map
