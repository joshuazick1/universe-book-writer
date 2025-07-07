/**
 * OpenAI Compatibility: Moderations endpoint
 *
 * POST /v1/moderations - Classify if text violates OpenAI's usage policies
 *
 * This is a placeholder implementation. Real implementation would integrate
 * with a content moderation service.
 */
import { Request, Response, RequestHandler } from 'express';

interface ModerationCategory {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'harassment/threatening': boolean;
    violence: boolean;
}

interface ModerationCategoryScores {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    'self-harm/intent': number;
    'self-harm/instructions': number;
    'harassment/threatening': number;
    violence: number;
}

interface ModerationResult {
    flagged: boolean;
    categories: ModerationCategory;
    category_scores: ModerationCategoryScores;
}

export const openaiCreateModerationHandler: RequestHandler = (req, res) => {
    try {
        const { input, model = 'text-moderation-latest' } = req.body;

        if (!input) {
            res.status(400).json({
                error: {
                    message: 'Missing required field: input is required.',
                    type: 'invalid_request_error',
                    param: 'input',
                    code: 'missing_required_parameter'
                }
            });
            return;
        }

        // Validate model
        const supportedModels = ['text-moderation-latest', 'text-moderation-stable'];
        if (!supportedModels.includes(model)) {
            res.status(400).json({
                error: {
                    message: `Model '${model}' is not supported for moderation.`,
                    type: 'invalid_request_error',
                    param: 'model',
                    code: 'invalid_value'
                }
            });
            return;
        }

        // Handle both string and array inputs
        const inputs = Array.isArray(input) ? input : [input];

        // In a real implementation, you would:
        // 1. Send the text to a content moderation service
        // 2. Analyze the content for policy violations
        // 3. Return appropriate scores and flags

        // For demo purposes, create mock moderation results
        const results: ModerationResult[] = inputs.map((text: string) => {
            // Simple keyword-based mock detection for demo
            const lowerText = text.toLowerCase();

            // Mock scoring based on simple keyword detection
            const hasViolence = /\b(kill|murder|shoot|stab|violence|attack|harm)\b/.test(lowerText);
            const hasSexual = /\b(sex|sexual|porn|naked|nude)\b/.test(lowerText);
            const hasHate = /\b(hate|racist|nazi|bigot)\b/.test(lowerText);
            const hasHarassment = /\b(harass|bully|threaten|intimidate)\b/.test(lowerText);
            const hasSelfHarm = /\b(suicide|self-harm|cut myself|kill myself)\b/.test(lowerText);

            const violenceScore = hasViolence ? 0.8 : Math.random() * 0.1;
            const sexualScore = hasSexual ? 0.9 : Math.random() * 0.1;
            const hateScore = hasHate ? 0.85 : Math.random() * 0.1;
            const harassmentScore = hasHarassment ? 0.75 : Math.random() * 0.1;
            const selfHarmScore = hasSelfHarm ? 0.9 : Math.random() * 0.05;

            const categories: ModerationCategory = {
                sexual: sexualScore > 0.5,
                hate: hateScore > 0.5,
                harassment: harassmentScore > 0.5,
                'self-harm': selfHarmScore > 0.5,
                'sexual/minors': sexualScore > 0.7 && /\b(minor|child|kid|teen)\b/.test(lowerText),
                'hate/threatening': hateScore > 0.5 && violenceScore > 0.5,
                'violence/graphic': violenceScore > 0.7,
                'self-harm/intent': selfHarmScore > 0.7,
                'self-harm/instructions': selfHarmScore > 0.6 && /\b(how to|tutorial|guide)\b/.test(lowerText),
                'harassment/threatening': harassmentScore > 0.5 && violenceScore > 0.3,
                violence: violenceScore > 0.5
            };

            const category_scores: ModerationCategoryScores = {
                sexual: sexualScore,
                hate: hateScore,
                harassment: harassmentScore,
                'self-harm': selfHarmScore,
                'sexual/minors': categories['sexual/minors'] ? sexualScore * 0.9 : sexualScore * 0.2,
                'hate/threatening': categories['hate/threatening'] ? Math.max(hateScore, violenceScore) : Math.min(hateScore, violenceScore) * 0.3,
                'violence/graphic': violenceScore,
                'self-harm/intent': categories['self-harm/intent'] ? selfHarmScore : selfHarmScore * 0.5,
                'self-harm/instructions': categories['self-harm/instructions'] ? selfHarmScore * 0.8 : selfHarmScore * 0.2,
                'harassment/threatening': categories['harassment/threatening'] ? Math.max(harassmentScore, violenceScore * 0.7) : Math.min(harassmentScore, violenceScore) * 0.3,
                violence: violenceScore
            };

            const flagged = Object.values(categories).some(flag => flag);

            return {
                flagged,
                categories,
                category_scores
            };
        });

        res.json({
            id: 'modr-' + Math.random().toString(36).slice(2, 15),
            model: model,
            results: results
        });

    } catch (error) {
        console.error('Moderation error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error during content moderation.',
                type: 'server_error',
                code: 'internal_error'
            }
        });
    }
};
