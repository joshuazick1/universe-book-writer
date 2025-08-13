import { performanceProbeBenchmarkMeta } from './performanceProbe.js';
export { performanceProbeBenchmarkMeta } from './performanceProbe.js';
// Explicit imports for all benchmark metadata objects (for validation and gating logic)
import { styleTransferBenchmarkMeta } from './styleTransfer.js';
import { advancedCodeGenerationBenchmarkMeta } from './advancedCodeGeneration.js';
import { nodeGraphConstructionBenchmarkMeta } from './nodeGraphConstruction.js';
import { longFormGenerationBenchmarkMeta } from './longFormGeneration.js';
import { permissiveContentBenchmarkMeta } from './permissiveContent.js';
import { dialogueGenerationBenchmarkMeta } from './dialogueGeneration.js';
import { factExtractionBenchmarkMeta } from './factExtraction.js';
import { summarizationBenchmarkMeta } from './summarization.js';
import { contentModerationBenchmarkMeta } from './contentModeration.js';
import { characterConsistencyBenchmarkMeta } from './characterConsistency.js';
import { plotCoherenceBenchmarkMeta } from './plotCoherence.js';
import { worldBuildingBenchmarkMeta } from './worldBuilding.js';
import { jsonAssemblyBenchmarkMeta } from './evaluateJSONAssembly.js';
import { taskPlanningBenchmarkMeta } from './evaluateTaskPlanning.js';
import { creativeWritingBenchmarkMeta } from './evaluateCreativeWriting.js';
import { typescriptQualityBenchmarkMeta } from './evaluateTypescriptQuality.js';
import { serverLatenciesBenchmarkMeta } from './measureServerLatencies.js';
import { serverThroughputBenchmarkMeta } from './measureServerThroughput.js';
import { simpleServerLatencyBenchmarkMeta } from './measureSimpleServerLatency.js';
import { embeddingBenchmarksMeta } from './embeddingBenchmarks.js';
// =============================
// BENCHMARK METADATA EXPORTS
// =============================
export { styleTransferBenchmarkMeta } from './styleTransfer.js';
export { advancedCodeGenerationBenchmarkMeta } from './advancedCodeGeneration.js';
export { nodeGraphConstructionBenchmarkMeta } from './nodeGraphConstruction.js';
export { longFormGenerationBenchmarkMeta } from './longFormGeneration.js';
export { permissiveContentBenchmarkMeta } from './permissiveContent.js';
export { dialogueGenerationBenchmarkMeta } from './dialogueGeneration.js';
export { factExtractionBenchmarkMeta } from './factExtraction.js';
export { summarizationBenchmarkMeta } from './summarization.js';
export { contentModerationBenchmarkMeta } from './contentModeration.js';
export { characterConsistencyBenchmarkMeta } from './characterConsistency.js';
export { plotCoherenceBenchmarkMeta } from './plotCoherence.js';
export { worldBuildingBenchmarkMeta } from './worldBuilding.js';
export { jsonAssemblyBenchmarkMeta } from './evaluateJSONAssembly.js';
export { taskPlanningBenchmarkMeta } from './evaluateTaskPlanning.js';
export { creativeWritingBenchmarkMeta } from './evaluateCreativeWriting.js';
export { typescriptQualityBenchmarkMeta } from './evaluateTypescriptQuality.js';
export { serverLatenciesBenchmarkMeta } from './measureServerLatencies.js';
export { serverThroughputBenchmarkMeta } from './measureServerThroughput.js';
export { simpleServerLatencyBenchmarkMeta } from './measureSimpleServerLatency.js';
export { embeddingBenchmarksMeta } from './embeddingBenchmarks.js';

// =============================
// BENCHMARK METADATA VALIDATION
// =============================
/**
 * Collects all benchmark metadata objects for gating and suite validation.
 * Returns an array of all metadata for use by the scheduler and gating logic.
 */
export function getAllBenchmarkMetadata() {
    return [
        styleTransferBenchmarkMeta,
        advancedCodeGenerationBenchmarkMeta,
        nodeGraphConstructionBenchmarkMeta,
        longFormGenerationBenchmarkMeta,
        permissiveContentBenchmarkMeta,
        dialogueGenerationBenchmarkMeta,
        factExtractionBenchmarkMeta,
        summarizationBenchmarkMeta,
        contentModerationBenchmarkMeta,
        characterConsistencyBenchmarkMeta,
        plotCoherenceBenchmarkMeta,
        worldBuildingBenchmarkMeta,
        jsonAssemblyBenchmarkMeta,
        taskPlanningBenchmarkMeta,
        creativeWritingBenchmarkMeta,
        typescriptQualityBenchmarkMeta,
        serverLatenciesBenchmarkMeta,
        serverThroughputBenchmarkMeta,
        simpleServerLatencyBenchmarkMeta,
        embeddingBenchmarksMeta,
        performanceProbeBenchmarkMeta
    ];
}
/**
 * Benchmark Test Types - Comprehensive AI Model Evaluation Suite
 * 
 * This barrel file exports all benchmark test types used for evaluating AI models
 * in the Universe Book Writer system. Tests are organized by category and purpose.
 * 
 * @module benchmarks/index
 * @version 2.0.0
 * @author VerseForge AI Server Team
 */

// ========================================
// CORE CONTENT GENERATION BENCHMARKS
// ========================================

/**
 * Style Transfer Benchmark
 * Tests the model's ability to rewrite content in specific author styles (e.g., Isaac Asimov).
 * Evaluates stylistic markers, sentence variety, and creative adaptation.
 */
export * from './styleTransfer.js';

/**
 * Advanced Code Generation Benchmark
 * Evaluates complex TypeScript code generation with proper class structure,
 * interfaces, generics, JSDoc documentation, and plugin-compatible architecture.
 */
export * from './advancedCodeGeneration.js';

/**
 * Node Graph Construction Benchmark
 * Tests the model's ability to create structured node relationships and hierarchies
 * for complex narrative or organizational structures.
 */
export * from './nodeGraphConstruction.js';

/**
 * Long Form Generation Benchmark
 * Evaluates sustained narrative generation over extended content lengths,
 * testing coherence, consistency, and engagement across multiple paragraphs.
 */
export * from './longFormGeneration.js';

/**
 * Permissive Content Benchmark
 * Tests the model's handling of mature or sensitive content while maintaining
 * appropriate boundaries and narrative quality.
 */
export * from './permissiveContent.js';

/**
 * Dialogue Generation Benchmark
 * Evaluates natural dialogue creation with character voice consistency,
 * realistic conversation flow, and proper formatting.
 */
export * from './dialogueGeneration.js';

/**
 * Fact Extraction Benchmark
 * Tests the model's ability to identify and extract key information
 * from complex text sources accurately.
 */
export * from './factExtraction.js';

/**
 * Summarization Benchmark
 * Evaluates text summarization capabilities, testing compression quality,
 * key point retention, and coherent summary structure.
 */
export * from './summarization.js';

/**
 * Content Moderation Benchmark
 * Tests the model's ability to identify and appropriately handle
 * problematic content while preserving legitimate creative expression.
 */
export * from './contentModeration.js';

// ========================================
// BOOK WRITING SPECIFIC BENCHMARKS
// ========================================

/**
 * Character Consistency Benchmark
 * Evaluates the model's ability to maintain consistent character traits,
 * personality, voice, and development across narrative content.
 */
export * from './characterConsistency.js';

/**
 * Plot Coherence Benchmark
 * Tests narrative plot development, logical story progression,
 * conflict resolution, and overall story structure integrity.
 */
export * from './plotCoherence.js';

/**
 * World Building Benchmark
 * Evaluates the creation and maintenance of consistent fictional universes,
 * including geography, culture, technology, and internal logic systems.
 */
export * from './worldBuilding.js';

// ========================================
// TECHNICAL EVALUATION BENCHMARKS
// ========================================

/**
 * JSON Assembly Benchmark
 * Tests structured data generation with proper JSON formatting,
 * schema validation, and required field completeness.
 */
export * from './evaluateJSONAssembly.js';

/**
 * Task Planning Benchmark
 * Evaluates logical task breakdown, sequential thinking,
 * and structured problem-solving approaches.
 */
export * from './evaluateTaskPlanning.js';

/**
 * Creative Writing Benchmark
 * Tests narrative creativity, originality, engagement,
 * and overall writing quality for literary content.
 */
export * from './evaluateCreativeWriting.js';

/**
 * TypeScript Quality Benchmark
 * Evaluates code generation quality including syntax correctness,
 * type annotations, documentation, and best practices adherence.
 */
export * from './evaluateTypescriptQuality.js';

// ========================================
// PERFORMANCE MEASUREMENT UTILITIES
// ========================================

/**
 * Server Latency Measurement
 * Measures both cold start and warm request latencies for model inference,
 * providing detailed timing analysis for performance optimization.
 */
export * from './measureServerLatencies.js';

/**
 * Server Throughput Measurement
 * Tests concurrent request handling capabilities by running parallel
 * inference requests and measuring average response times.
 */
export * from './measureServerThroughput.js';

/**
 * Simple Server Latency Measurement
 * Provides basic health check latency measurement using lightweight
 * requests for quick server responsiveness assessment.
 */
export * from './measureSimpleServerLatency.js';

// ========================================
// BENCHMARK EXECUTION UTILITIES
// ========================================

/**
 * Quality Benchmarks Runner
 * Comprehensive benchmark execution engine that runs multiple
 * quality tests and aggregates results for model evaluation.
 */
export * from './runQualityBenchmarks.js';

/**
 * Fastest Server Selection
 * Utility for identifying the lowest-latency server from a pool
 * of available inference servers for optimal performance routing.
 */
export * from './selectFastestServer.js';

/**
 * Slowest Server Selection
 * Utility for identifying the highest-latency server, useful for
 * debugging, testing, or understanding performance bottlenecks.
 */
export * from './selectSlowestServer.js';

// ========================================
// SCORING AND UTILITY FUNCTIONS
// ========================================

/**
 * Embedding Model Detection
 * Utilities for detecting and validating embedding model capabilities
 * and compatibility with the benchmark system.
 */
export * from './embeddingBenchmarks.js';

/**
 * Safe BLEU Score Calculation
 * Robust BLEU (Bilingual Evaluation Understudy) score implementation
 * with error handling for text quality assessment against references.
 */
export * from './safeBleu.js';

/**
 * Safe ROUGE Score Calculation
 * Robust ROUGE (Recall-Oriented Understudy for Gisting Evaluation)
 * score implementation for summarization and text generation evaluation.
 */
export * from './safeRouge.js';
