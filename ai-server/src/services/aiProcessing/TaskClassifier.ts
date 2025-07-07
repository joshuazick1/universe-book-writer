/**
 * Task Classification System for Universal AI Processing Framework
 * 
 * Analyzes incoming AI requests to determine complexity, domain, processing
 * requirements, and optimal processing strategy. This enables intelligent
 * pass selection and resource allocation.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import {
    TaskClassification,
    ComplexityMetrics,
    ContextRequirements,
    AIRequest
} from './types.js';

/**
 * Classifier for analyzing and categorizing AI processing tasks
 */
export class TaskClassifier {
    private complexityThresholds = {
        simple: 0.3,
        moderate: 0.6,
        complex: 0.8
    };

    private domainKeywords = {
        'character': ['character', 'personality', 'trait', 'backstory', 'motivation', 'behavior'],
        'world-building': ['world', 'location', 'place', 'geography', 'culture', 'society', 'planet', 'realm'],
        'plot': ['plot', 'story', 'narrative', 'chapter', 'scene', 'conflict', 'resolution'],
        'dialogue': ['dialogue', 'conversation', 'speak', 'said', 'reply', 'talk'],
        'description': ['describe', 'description', 'appearance', 'look', 'visual', 'setting'],
        'technical': ['system', 'technology', 'science', 'technical', 'specification', 'manual'],
        'creative': ['creative', 'artistic', 'poetic', 'metaphor', 'imagery', 'style']
    };

    /**
     * Classify an AI request to determine optimal processing strategy
     */
    async classify(request: AIRequest): Promise<TaskClassification> {
        // Analyze content complexity
        const complexityMetrics = await this.analyzeComplexity(request.content);

        // Determine domain
        const domain = await this.determineDomain(request.content, request.type);

        // Analyze context requirements
        const contextRequirements = this.analyzeContextRequirements(request);

        // Determine task type based on various factors
        const taskType = this.determineTaskType(request, complexityMetrics, domain);

        // Determine latency tolerance
        const latencyTolerance = this.determineLatencyTolerance(request);

        // Map quality requirement
        const qualityRequirement = this.mapQualityRequirement(request.qualityRequirement);

        // Check if structured output is needed
        const structuredOutput = this.needsStructuredOutput(request, domain);

        // Calculate estimated complexity (1-10 scale)
        const estimatedComplexity = this.calculateEstimatedComplexity(complexityMetrics, request);

        // Recommend number of passes
        const recommendedPasses = this.recommendPassCount(taskType, qualityRequirement, estimatedComplexity);

        // Suggest optimal model
        const suggestedModel = this.suggestModel(taskType, estimatedComplexity, request);

        return {
            taskType,
            latencyTolerance,
            qualityRequirement,
            structuredOutput,
            estimatedComplexity,
            recommendedPasses,
            suggestedModel,
            contextRequirements
        };
    }

    /**
     * Analyze the complexity of the request content
     */
    private async analyzeComplexity(content: string): Promise<ComplexityMetrics> {
        const contentLength = content.length;

        // Vocabulary complexity analysis
        const words = content.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        const vocabularyComplexity = this.calculateVocabularyComplexity(words, uniqueWords);

        // Conceptual density analysis
        const conceptualDensity = this.calculateConceptualDensity(content);

        // Narrative complexity analysis
        const narrativeComplexity = this.calculateNarrativeComplexity(content);

        // Technical complexity analysis
        const technicalComplexity = this.calculateTechnicalComplexity(content);

        // Overall complexity score
        const overallScore = (
            (contentLength / 10000) * 0.2 +
            vocabularyComplexity * 0.25 +
            conceptualDensity * 0.25 +
            narrativeComplexity * 0.15 +
            technicalComplexity * 0.15
        );

        return {
            contentLength,
            vocabularyComplexity,
            conceptualDensity,
            narrativeComplexity,
            technicalComplexity,
            overallScore: Math.min(1.0, overallScore)
        };
    }

    /**
     * Determine the primary domain of the content
     */
    private async determineDomain(content: string, type: string): Promise<string> {
        const lowerContent = content.toLowerCase();
        const scores: Record<string, number> = {};

        // Score each domain based on keyword matches
        Object.entries(this.domainKeywords).forEach(([domain, keywords]) => {
            let score = 0;
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = lowerContent.match(regex);
                score += matches ? matches.length : 0;
            });
            scores[domain] = score;
        });

        // Consider the request type
        if (type === 'character-generation') {
            scores['character'] += 10;
        } else if (type === 'world-building') {
            scores['world-building'] += 10;
        }

        // Find the highest scoring domain
        const topDomain = Object.entries(scores).reduce((max, [domain, score]) =>
            score > max.score ? { domain, score } : max,
            { domain: 'general', score: 0 }
        );

        return topDomain.domain;
    }

    /**
     * Analyze context requirements for the request
     */
    private analyzeContextRequirements(request: AIRequest): ContextRequirements {
        const ragRequired = request.ragDomain !== 'none' && request.ragDomain !== '';

        const ragDomains: string[] = [];
        if (ragRequired && request.ragDomain) {
            ragDomains.push(request.ragDomain);
        }

        // Determine context size based on scope and complexity
        let contextSize: 'small' | 'medium' | 'large' | 'extensive';
        if (request.scope === 'atomic') {
            contextSize = 'small';
        } else if (request.scope === 'chapter') {
            contextSize = 'medium';
        } else if (request.scope === 'multi-chapter') {
            contextSize = 'large';
        } else {
            contextSize = 'extensive';
        }

        // Check if historical context is needed
        const historicalContext = request.content.includes('previously') ||
            request.content.includes('earlier') ||
            request.content.includes('before') ||
            request.type === 'character-generation';

        // Check if cross-references are needed
        const crossReferences = request.content.includes('@') ||
            request.content.includes('reference') ||
            request.content.includes('see also') ||
            request.scope !== 'atomic';

        return {
            ragRequired,
            ragDomains,
            contextSize,
            historicalContext,
            crossReferences
        };
    }

    /**
     * Private helper methods for complexity analysis
     */

    private calculateVocabularyComplexity(words: string[], uniqueWords: Set<string>): number {
        if (words.length === 0) return 0;

        // Type-token ratio (vocabulary diversity)
        const ttr = uniqueWords.size / words.length;

        // Average word length
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

        // Complexity score based on TTR and word length
        return Math.min(1.0, (ttr * 0.7) + ((avgWordLength - 4) / 10 * 0.3));
    }

    private calculateConceptualDensity(content: string): number {
        // Count abstract concepts, proper nouns, and technical terms
        const conceptIndicators = [
            /\b[A-Z][a-zA-Z]+\b/g, // Proper nouns
            /\b(concept|idea|theory|principle|philosophy|methodology)\b/gi,
            /\b(system|framework|structure|organization)\b/gi,
            /\b(character|personality|trait|motivation)\b/gi
        ];

        let conceptCount = 0;
        conceptIndicators.forEach(pattern => {
            const matches = content.match(pattern);
            conceptCount += matches ? matches.length : 0;
        });

        const words = content.split(/\s+/).length;
        return Math.min(1.0, conceptCount / words * 10);
    }

    private calculateNarrativeComplexity(content: string): number {
        let score = 0;

        // Check for multiple characters/entities
        const characterMentions = content.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g);
        if (characterMentions && characterMentions.length > 2) score += 0.3;

        // Check for temporal complexity
        const timeIndicators = /(then|next|later|meanwhile|previously|earlier|afterwards)/gi;
        const timeMatches = content.match(timeIndicators);
        if (timeMatches && timeMatches.length > 3) score += 0.2;

        // Check for dialogue
        const dialoguePattern = /["'].*?["']/g;
        const dialogueMatches = content.match(dialoguePattern);
        if (dialogueMatches && dialogueMatches.length > 2) score += 0.2;

        // Check for multiple scenes/locations
        const locationPattern = /(in the|at the|inside|outside|room|building|city|planet)/gi;
        const locationMatches = content.match(locationPattern);
        if (locationMatches && locationMatches.length > 2) score += 0.3;

        return Math.min(1.0, score);
    }

    private calculateTechnicalComplexity(content: string): number {
        const technicalPatterns = [
            /\b(system|protocol|algorithm|specification|implementation)\b/gi,
            /\b(configure|initialize|execute|compile|deploy)\b/gi,
            /\b(API|SDK|framework|library|module)\b/gi,
            /\b(parameter|variable|function|method|class)\b/gi
        ];

        let technicalScore = 0;
        technicalPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            technicalScore += matches ? matches.length : 0;
        });

        const words = content.split(/\s+/).length;
        return Math.min(1.0, technicalScore / words * 20);
    }

    private determineTaskType(
        request: AIRequest,
        complexity: ComplexityMetrics,
        domain: string
    ): 'simple' | 'complex' | 'structured' | 'creative' {
        // Check for structured output needs
        if (request.type === 'analysis' || domain === 'technical') {
            return 'structured';
        }

        // Check for creative content
        if (['writing', 'character-generation', 'world-building'].includes(request.type) ||
            domain === 'creative') {
            return 'creative';
        }

        // Check complexity
        if (complexity.overallScore > this.complexityThresholds.complex) {
            return 'complex';
        }

        return 'simple';
    }

    private determineLatencyTolerance(request: AIRequest): 'realtime' | 'interactive' | 'batch' {
        if (request.type === 'chat') {
            return 'realtime';
        }

        if (['editing', 'analysis'].includes(request.type)) {
            return 'interactive';
        }

        return 'batch';
    }

    private mapQualityRequirement(requirement: string): 'draft' | 'standard' | 'premium' {
        switch (requirement) {
            case 'draft':
                return 'draft';
            case 'publication':
            case 'professional':
                return 'premium';
            default:
                return 'standard';
        }
    }

    private needsStructuredOutput(request: AIRequest, domain: string): boolean {
        return request.type === 'analysis' ||
            domain === 'technical' ||
            request.content.includes('format:') ||
            request.content.includes('structure:');
    }

    private calculateEstimatedComplexity(metrics: ComplexityMetrics, request: AIRequest): number {
        let score = metrics.overallScore * 5; // Base score 0-5

        // Adjust based on scope
        const scopeMultiplier = {
            'atomic': 1.0,
            'chapter': 1.5,
            'multi-chapter': 2.0,
            'book': 2.5,
            'series': 3.0
        };
        score *= scopeMultiplier[request.scope] || 1.0;

        // Adjust based on quality requirement
        const qualityMultiplier = {
            'draft': 0.8,
            'standard': 1.0,
            'publication': 1.3,
            'professional': 1.5
        };
        score *= qualityMultiplier[request.qualityRequirement] || 1.0;

        return Math.min(10, Math.max(1, Math.round(score)));
    }

    private recommendPassCount(
        taskType: string,
        qualityRequirement: string,
        complexity: number
    ): number {
        let basePassCount = 3;

        // Adjust based on task type
        switch (taskType) {
            case 'simple':
                basePassCount = 2;
                break;
            case 'complex':
                basePassCount = 5;
                break;
            case 'structured':
                basePassCount = 4;
                break;
            case 'creative':
                basePassCount = 4;
                break;
        }

        // Adjust based on quality requirement
        if (qualityRequirement === 'premium') {
            basePassCount += 2;
        } else if (qualityRequirement === 'draft') {
            basePassCount = Math.max(2, basePassCount - 1);
        }

        // Adjust based on complexity
        if (complexity > 7) {
            basePassCount += 1;
        } else if (complexity < 3) {
            basePassCount = Math.max(2, basePassCount - 1);
        }

        return Math.min(7, Math.max(2, basePassCount));
    }

    private suggestModel(taskType: string, complexity: number, request: AIRequest): string {
        // For now, return model suggestions based on patterns
        // In production, this would integrate with the model registry

        if (taskType === 'simple' && complexity < 4) {
            return 'lightweight'; // e.g., llama3.2:3b
        }

        if (taskType === 'structured') {
            return 'structured'; // e.g., qwen2.5-coder
        }

        if (request.qualityRequirement === 'professional' || complexity > 7) {
            return 'heavyweight'; // e.g., llama3.1:70b
        }

        return 'default'; // e.g., llama3.2:8b
    }
}
