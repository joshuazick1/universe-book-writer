/**
 * Reference-based metrics validator (BLEU, ROUGE, F1, etc.)
 * @module backend/application/quality-judger/validators/referenceMetricsValidator
 */

/**
 * BLEU score calculation (unigram, simple version for demonstration)
 * @param candidate - generated string
 * @param reference - reference string
 * @returns BLEU score (0-1)
 */
function bleuScore(candidate: string, reference: string): number {
    if (!candidate || !reference) return 0;
    const candTokens = candidate.split(/\s+/);
    const refTokens = reference.split(/\s+/);
    const overlap = candTokens.filter(token => refTokens.includes(token)).length;
    return overlap / Math.max(candTokens.length, 1);
}

/**
 * ROUGE-L recall calculation (simple version)
 * @param candidate - generated string
 * @param reference - reference string
 * @returns ROUGE-L recall (0-1)
 */
function rougeL(candidate: string, reference: string): number {
    if (!candidate || !reference) return 0;
    // Longest common subsequence (LCS)
    const m = candidate.length, n = reference.length;
    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (candidate[i - 1] === reference[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n] / Math.max(n, 1);
}

/**
 * F1 score calculation (token overlap)
 * @param candidate - generated string
 * @param reference - reference string
 * @returns F1 score (0-1)
 */
function f1Score(candidate: string, reference: string): number {
    if (!candidate || !reference) return 0;
    const candTokens = new Set(candidate.split(/\s+/));
    const refTokens = new Set(reference.split(/\s+/));
    const intersection = new Set([...candTokens].filter(x => refTokens.has(x)));
    const precision = intersection.size / Math.max(candTokens.size, 1);
    const recall = intersection.size / Math.max(refTokens.size, 1);
    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
}

/**
 * Reference metrics validator
 * @param value - candidate string
 * @param params - { reference: string, metric: 'bleu' | 'rouge' | 'f1', threshold?: number }
 * @returns { passed, score, rationale }
 */
export function referenceMetricsValidator(
    value: string,
    params: { reference: string; metric: 'bleu' | 'rouge' | 'f1'; threshold?: number }
) {
    let score = 0;
    if (params.metric === 'bleu') {
        score = bleuScore(value, params.reference);
    } else if (params.metric === 'rouge') {
        score = rougeL(value, params.reference);
    } else if (params.metric === 'f1') {
        score = f1Score(value, params.reference);
    }
    const passed = score >= (params.threshold ?? 0.5);
    return {
        metric: params.metric,
        passed,
        score,
        rationale: `Score: ${score.toFixed(2)} (threshold: ${params.threshold ?? 0.5})`
    };
}
