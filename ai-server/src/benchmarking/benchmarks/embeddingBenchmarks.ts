/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (embedding benchmarks are quality benchmarks)
 * requires: [] (no gating dependencies)
 */
export const embeddingBenchmarksMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Embedding Model Benchmarks
 * Tests embedding model quality, speed, and vector consistency
 * 
 * @module embeddingBenchmarks
 */

import { QualityBenchmarkScore, EmbeddingMetrics } from 'shared/types/aiQualityBenchmark.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Test data for embedding quality evaluation
 */
const EMBEDDING_TEST_TEXTS = [
    "The quick brown fox jumps over the lazy dog.",
    "A swift reddish-brown fox leaps above a sleepy canine.",
    "The cat sits on the mat.",
    "Technology is changing the world rapidly.",
    "Innovation and technological advancement are transforming our global society.",
    "The weather is beautiful today.",
    "It's a lovely sunny day outside.",
    "Database optimization improves query performance.",
    "Optimizing databases enhances the speed of data retrieval operations."
];

/**
 * Expected similarity pairs for semantic testing
 */
const SIMILARITY_PAIRS = [
    { text1: EMBEDDING_TEST_TEXTS[0], text2: EMBEDDING_TEST_TEXTS[1], expectedSimilarity: 0.8 }, // Similar fox sentences
    { text1: EMBEDDING_TEST_TEXTS[3], text2: EMBEDDING_TEST_TEXTS[4], expectedSimilarity: 0.7 }, // Technology sentences
    { text1: EMBEDDING_TEST_TEXTS[5], text2: EMBEDDING_TEST_TEXTS[6], expectedSimilarity: 0.75 }, // Weather sentences
    { text1: EMBEDDING_TEST_TEXTS[7], text2: EMBEDDING_TEST_TEXTS[8], expectedSimilarity: 0.8 }, // Database sentences
    { text1: EMBEDDING_TEST_TEXTS[0], text2: EMBEDDING_TEST_TEXTS[2], expectedSimilarity: 0.3 }, // Different animals
    { text1: EMBEDDING_TEST_TEXTS[3], text2: EMBEDDING_TEST_TEXTS[5], expectedSimilarity: 0.2 }, // Unrelated topics
];

/**
 * Call embedding API for a given text
 */
async function callEmbeddingAPI(
    serverId: string,
    modelId: string,
    text: string,
    timeoutMs: number = 30000
): Promise<number[]> {
    const decodedServer = serverId.replace(/^https?:\/\//, '');
    const fetchUrl = `http://${decodedServer}/api/embeddings`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelId,
                prompt: text
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Embedding API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response: no embedding array found');
        }

        return data.embedding;
    } catch (error) {
        logger.error(`[EmbeddingBenchmark] Failed to get embedding: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
        return 0;
    }

    return dotProduct / (norm1 * norm2);
}

/**
 * Evaluate embedding quality based on semantic similarity
 */
export async function evaluateEmbeddingQuality(
    modelId: string,
    serverId: string,
    timeoutMs: number = 120000
): Promise<QualityBenchmarkScore> {
    logger.info(`[EmbeddingQuality] Starting embedding quality evaluation for ${modelId} on ${serverId}`);

    const startTime = Date.now();
    let score = 0.15; // Base score
    let rubric = 'Embedding quality evaluation:\n';
    let embeddingMetrics: EmbeddingMetrics;

    try {
        // Step 1: Generate embeddings for all test texts
        const embeddings: number[][] = [];
        const embeddingTimes: number[] = [];

        for (const text of EMBEDDING_TEST_TEXTS) {
            const embeddingStart = Date.now();
            const embedding = await callEmbeddingAPI(serverId, modelId, text, timeoutMs);
            const embeddingTime = Date.now() - embeddingStart;

            embeddings.push(embedding);
            embeddingTimes.push(embeddingTime);
        }

        // Step 2: Check dimension consistency
        const dimensions = embeddings[0]?.length || 0;
        const dimensionConsistent = embeddings.every(emb => emb.length === dimensions);

        if (dimensionConsistent && dimensions > 0) {
            score += 0.15;
            rubric += `✓ Dimension consistency: ${dimensions} dimensions across all embeddings\n`;
        } else {
            rubric += `✗ Dimension inconsistency detected\n`;
        }

        // Step 3: Test semantic similarity
        let similarityScore = 0;
        let similarityTests = 0;

        for (const pair of SIMILARITY_PAIRS) {
            try {
                const idx1 = EMBEDDING_TEST_TEXTS.indexOf(pair.text1);
                const idx2 = EMBEDDING_TEST_TEXTS.indexOf(pair.text2);

                if (idx1 >= 0 && idx2 >= 0) {
                    const similarity = cosineSimilarity(embeddings[idx1], embeddings[idx2]);
                    const expectedSim = pair.expectedSimilarity;

                    // Score based on how close the similarity is to expected
                    const accuracy = 1 - Math.abs(similarity - expectedSim);
                    similarityScore += Math.max(0, accuracy);
                    similarityTests++;

                    rubric += `- Similarity test: ${similarity.toFixed(3)} (expected: ${expectedSim}) - ${accuracy > 0.7 ? '✓' : '✗'}\n`;
                }
            } catch (error) {
                rubric += `✗ Similarity calculation failed: ${error instanceof Error ? error.message : String(error)}\n`;
            }
        }

        if (similarityTests > 0) {
            const avgSimilarityAccuracy = similarityScore / similarityTests;
            score += avgSimilarityAccuracy * 0.4; // 40% of score for similarity
            rubric += `Semantic similarity accuracy: ${(avgSimilarityAccuracy * 100).toFixed(1)}%\n`;
        }

        // Step 4: Check vector properties
        let vectorQualityScore = 0;
        const avgNorm = embeddings.reduce((sum, emb) => {
            const norm = Math.sqrt(emb.reduce((s, x) => s + x * x, 0));
            return sum + norm;
        }, 0) / embeddings.length;

        // Good embeddings typically have reasonable norms (not too close to 0 or extremely large)
        if (avgNorm > 0.1 && avgNorm < 100) {
            vectorQualityScore += 0.5;
            rubric += `✓ Vector norms are reasonable (avg: ${avgNorm.toFixed(3)})\n`;
        } else {
            rubric += `✗ Vector norms may be problematic (avg: ${avgNorm.toFixed(3)})\n`;
        }

        // Check for zero vectors
        const hasZeroVectors = embeddings.some(emb => emb.every(x => x === 0));
        if (!hasZeroVectors) {
            vectorQualityScore += 0.5;
            rubric += `✓ No zero vectors detected\n`;
        } else {
            rubric += `✗ Zero vectors detected\n`;
        }

        score += vectorQualityScore * 0.2; // 20% for vector quality

        // Step 5: Performance metrics
        const totalTime = Date.now() - startTime;
        const avgEmbeddingTime = embeddingTimes.reduce((a, b) => a + b, 0) / embeddingTimes.length;
        const embeddingsPerSecond = 1000 / avgEmbeddingTime;

        if (avgEmbeddingTime < 5000) { // Less than 5 seconds per embedding
            score += 0.1;
            rubric += `✓ Good performance: ${avgEmbeddingTime.toFixed(0)}ms per embedding\n`;
        } else {
            rubric += `- Slow performance: ${avgEmbeddingTime.toFixed(0)}ms per embedding\n`;
        }

        // Create embedding metrics
        embeddingMetrics = {
            dimensions,
            embeddingsPerSecond,
            semanticSimilarityScore: similarityTests > 0 ? similarityScore / similarityTests : 0,
            clusteringQualityScore: vectorQualityScore,
            vectorConsistencyScore: dimensionConsistent ? 1.0 : 0.0
        };

        // Bonus for excellent performance
        if (score > 0.8 && avgEmbeddingTime < 1000) {
            score += 0.1;
            rubric += `✓ Bonus: Excellent overall embedding quality and performance\n`;
        }

        score = Math.min(1.0, Math.max(0.0, score));
        rubric += `\nFinal score: ${(score * 100).toFixed(1)}%`;

        logger.info(`[EmbeddingQuality] Completed evaluation for ${modelId}: score=${score.toFixed(3)}`);

        return {
            type: 'embedding-quality',
            score,
            rubric,
            timestamp: new Date().toISOString(),
            embeddingMetrics
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[EmbeddingQuality] Error during evaluation: ${errorMessage}`);

        return {
            type: 'embedding-quality',
            score: 0,
            rubric: `Error during embedding quality evaluation: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            embeddingMetrics: {
                dimensions: 0,
                embeddingsPerSecond: 0,
                semanticSimilarityScore: 0,
                clusteringQualityScore: 0,
                vectorConsistencyScore: 0
            }
        };
    }
}

/**
 * Evaluate embedding generation speed
 */
export async function evaluateEmbeddingSpeed(
    modelId: string,
    serverId: string,
    timeoutMs: number = 60000
): Promise<QualityBenchmarkScore> {
    logger.info(`[EmbeddingSpeed] Starting speed evaluation for ${modelId} on ${serverId}`);

    const startTime = Date.now();
    let score = 0.15; // Base score
    let rubric = 'Embedding speed evaluation:\n';

    try {
        const testTexts = EMBEDDING_TEST_TEXTS.slice(0, 5); // Use 5 texts for speed test
        const times: number[] = [];

        // Test embedding generation speed
        for (let i = 0; i < testTexts.length; i++) {
            const embedStart = Date.now();
            await callEmbeddingAPI(serverId, modelId, testTexts[i], timeoutMs);
            const embedTime = Date.now() - embedStart;
            times.push(embedTime);

            rubric += `Text ${i + 1}: ${embedTime}ms\n`;
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const embeddingsPerSecond = 1000 / avgTime;

        // Score based on speed
        if (avgTime < 500) { // < 0.5 seconds
            score += 0.5;
            rubric += `✓ Excellent speed: ${avgTime.toFixed(0)}ms avg\n`;
        } else if (avgTime < 2000) { // < 2 seconds
            score += 0.3;
            rubric += `✓ Good speed: ${avgTime.toFixed(0)}ms avg\n`;
        } else if (avgTime < 5000) { // < 5 seconds
            score += 0.15;
            rubric += `- Acceptable speed: ${avgTime.toFixed(0)}ms avg\n`;
        } else {
            rubric += `✗ Slow speed: ${avgTime.toFixed(0)}ms avg\n`;
        }

        // Consistency bonus
        const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avgTime;

        if (coefficientOfVariation < 0.3) { // Low variation
            score += 0.2;
            rubric += `✓ Consistent performance (CV: ${(coefficientOfVariation * 100).toFixed(1)}%)\n`;
        } else {
            rubric += `- Variable performance (CV: ${(coefficientOfVariation * 100).toFixed(1)}%)\n`;
        }

        // Throughput scoring
        if (embeddingsPerSecond > 2) {
            score += 0.15;
            rubric += `✓ High throughput: ${embeddingsPerSecond.toFixed(1)} emb/sec\n`;
        } else if (embeddingsPerSecond > 0.5) {
            score += 0.1;
            rubric += `- Moderate throughput: ${embeddingsPerSecond.toFixed(1)} emb/sec\n`;
        } else {
            rubric += `✗ Low throughput: ${embeddingsPerSecond.toFixed(1)} emb/sec\n`;
        }

        score = Math.min(1.0, Math.max(0.0, score));
        rubric += `\nFinal score: ${(score * 100).toFixed(1)}%`;

        const embeddingMetrics: EmbeddingMetrics = {
            dimensions: 0, // Not applicable for speed test
            embeddingsPerSecond,
            semanticSimilarityScore: 0, // Not applicable
            clusteringQualityScore: 0, // Not applicable
            vectorConsistencyScore: coefficientOfVariation < 0.3 ? 1.0 : 0.5
        };

        logger.info(`[EmbeddingSpeed] Completed evaluation for ${modelId}: score=${score.toFixed(3)}`);

        return {
            type: 'embedding-speed',
            score,
            rubric,
            timestamp: new Date().toISOString(),
            embeddingMetrics
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[EmbeddingSpeed] Error during evaluation: ${errorMessage}`);

        return {
            type: 'embedding-speed',
            score: 0,
            rubric: `Error during embedding speed evaluation: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            embeddingMetrics: {
                dimensions: 0,
                embeddingsPerSecond: 0,
                semanticSimilarityScore: 0,
                clusteringQualityScore: 0,
                vectorConsistencyScore: 0
            }
        };
    }
}

/**
 * Detect if a model is an embedding model by testing the API response to a chat/generate request
 * Returns true if it's an embedding model (400 error expected), false otherwise
 */
export async function detectEmbeddingModel(
    modelId: string,
    serverId: string,
    timeoutMs: number = 30000
): Promise<{ isEmbedding: boolean; error?: string; statusCode?: number }> {
    const decodedServer = serverId.replace(/^https?:\/\//, '');

    try {
        // Try a chat/generate request first - embedding models should return 400
        const generateUrl = `http://${decodedServer}/api/generate`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelId,
                prompt: 'Hello'
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        // If we get a 400 error, this might be an embedding model
        if (response.status === 400) {
            // Now try the embedding endpoint to confirm
            try {
                const embeddingUrl = `http://${decodedServer}/api/embeddings`;
                const embeddingResponse = await fetch(embeddingUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: modelId,
                        prompt: 'test'
                    }),
                    signal: AbortSignal.timeout(timeoutMs)
                });

                if (embeddingResponse.ok) {
                    const data = await embeddingResponse.json();
                    if (Array.isArray(data.embedding)) {
                        logger.info(`[EmbeddingDetection] Detected embedding model: ${modelId} (400 on generate, success on embeddings)`);
                        return { isEmbedding: true };
                    }
                }
            } catch (embeddingError) {
                // Embedding endpoint also failed, might not be an embedding model
                logger.warn(`[EmbeddingDetection] Model ${modelId} failed both generate and embeddings endpoints`);
                return {
                    isEmbedding: false,
                    error: `Failed both endpoints: ${embeddingError instanceof Error ? embeddingError.message : String(embeddingError)}`,
                    statusCode: response.status
                };
            }
        }

        // If generate works, it's not an embedding-only model
        if (response.ok) {
            logger.info(`[EmbeddingDetection] Model ${modelId} is a text generation model (generate endpoint works)`);
            return { isEmbedding: false };
        }

        // Other error codes
        logger.warn(`[EmbeddingDetection] Model ${modelId} returned unexpected status: ${response.status}`);
        return {
            isEmbedding: false,
            error: `Unexpected status: ${response.status} ${response.statusText}`,
            statusCode: response.status
        };

    } catch (error) {
        logger.error(`[EmbeddingDetection] Error detecting model type for ${modelId}: ${error instanceof Error ? error.message : String(error)}`);
        return {
            isEmbedding: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
