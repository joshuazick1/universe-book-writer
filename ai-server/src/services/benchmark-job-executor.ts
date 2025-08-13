import { EnhancedUpdateRAGSystem } from '../benchmarking/enhanced-updateRAGSystem.js';
import { ModelQualityBenchmarks } from 'shared/types/aiQualityBenchmark.js';

/**
 * Executes benchmark jobs and updates the RAG system.
 */
export class BenchmarkJobExecutor {
    /**
     * Updates the RAG system with benchmark data.
     * @param data - Data to process for the RAG system.
     */
    async updateRAGSystem(data: {
        servers: Array<{ id: string; name: string; metadata: Record<string, any> }>;
        performances: Array<{ modelId: string; performance: number; metadata: Record<string, any> }>;
        models: Array<{ modelId: string; aggregatedMetrics: Record<string, any>; metadata: Record<string, any> }>;
    }): Promise<void> {
        console.log('Updating RAG system with benchmark data...');

        // Transform data to match FlexibleModelQualityBenchmarks type
        const transformedData: FlexibleModelQualityBenchmarks = {
            modelId: data.models[0]?.modelId || 'unknown',
            benchmarks: {
                'task-planning': { score: 0, details: 'Default' },
                'json-assembly': { score: 0, details: 'Default' },
                'creative-writing': { score: 0, details: 'Default' },
                'typescript-quality': { score: 0, details: 'Default' },
                'dialogue-generation': { score: 0, details: 'Default' },
                'fact-extraction': { score: 0, details: 'Default' },
                'summarization': { score: 0, details: 'Default' },
                'content-moderation': { score: 0, details: 'Default' },
                'world-building': { score: 0, details: 'Default' },
                'emotional-depth': { score: 0, details: 'Default' },
                'character-consistency': { score: 0, details: 'Default' },
                'plot-coherence': { score: 0, details: 'Default' },
                'technical-accuracy': { score: 0, details: 'Default' },
                'code-generation': { score: 0, details: 'Default' },
                'data-interpretation': { score: 0, details: 'Default' },
                'logical-reasoning': { score: 0, details: 'Default' },
                'mathematical-ability': { score: 0, details: 'Default' },
                'language-understanding': { score: 0, details: 'Default' },
                'translation-quality': { score: 0, details: 'Default' },
                'speech-recognition': { score: 0, details: 'Default' },
                'image-recognition': { score: 0, details: 'Default' },
                'video-analysis': { score: 0, details: 'Default' },
                'audio-processing': { score: 0, details: 'Default' },
                'search-relevance': { score: 0, details: 'Default' },
                'recommendation-quality': { score: 0, details: 'Default' },
                'user-engagement': { score: 0, details: 'Default' },
                'accessibility': { score: 0, details: 'Default' },
                'scalability': { score: 0, details: 'Default' },
                'security': { score: 0, details: 'Default' },
                'privacy': { score: 0, details: 'Default' },
                'energy-efficiency': { score: 0, details: 'Default' },
                'cost-efficiency': { score: 0, details: 'Default' },
                'deployment-speed': { score: 0, details: 'Default' },
                'maintenance-ease': { score: 0, details: 'Default' },
            },
            serverLatencies: {}, // Populate with actual latency data
            serverLatencyMetrics: {},
            serverColdPerformance: {},
            serverWarmPerformance: {},
            serverThroughput: {},
        };

        const enhancedUpdateRAGSystem = new EnhancedUpdateRAGSystem();
        await enhancedUpdateRAGSystem.updateRAGSystem(transformedData as unknown as ModelQualityBenchmarks);
        console.log('RAG system updated successfully.');
    }
}

// Modify the ModelQualityBenchmarks type to make benchmarks optional
export type FlexibleModelQualityBenchmarks = Omit<ModelQualityBenchmarks, 'benchmarks'> & {
    benchmarks?: Partial<Record<string, { score: number; details: string }>>;
};
