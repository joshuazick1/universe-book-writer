/**
 * Registry service for model metadata and capabilities
 */

import { ModelInfo, ModelBenchmarks } from 'shared/types/model-selection';

export interface ModelCapabilities {
    readonly features: string[];
    readonly supportedFormats: string[];
    readonly contextLength: number;
    readonly memoryRequirement: number;
}

export interface ModelMetadata {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly capabilities: ModelCapabilities;
    readonly lastUpdated: Date;
}

export class ModelRegistryService {
    private models: Map<string, ModelInfo> = new Map();
    private metadata: Map<string, ModelMetadata> = new Map();

    async getAvailableModels(): Promise<ModelInfo[]> {
        return Array.from(this.models.values());
    }

    async getModelCapabilities(modelId: string): Promise<ModelCapabilities | null> {
        const metadata = this.metadata.get(modelId);
        return metadata?.capabilities || null;
    }

    async updateModelMetadata(modelId: string, metadata: ModelMetadata): Promise<void> {
        this.metadata.set(modelId, metadata);
    }

    async indexModelBenchmarks(benchmarkData: ModelBenchmarks[]): Promise<void> {
        // Implementation for indexing benchmark data
        // This will be expanded based on actual benchmark data structure
    }

    async registerModel(model: ModelInfo): Promise<void> {
        this.models.set(model.id, model);
    }

    async getModel(modelId: string): Promise<ModelInfo | null> {
        return this.models.get(modelId) || null;
    }
}
