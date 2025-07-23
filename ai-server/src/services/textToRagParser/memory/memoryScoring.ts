/**
 * Memory Scoring System - Calculates importance scores for character memories
 * and evaluates gap-filling scenarios
 */

import type { CharacterMemory, GapFillingRequest, GapFillingResult } from '../../../../../shared/types/nodeTypes.js';

export class MemoryScoring {
    /**
     * Calculate importance score for a memory based on content and type
     */
    async calculateImportance(
        content: string,
        memoryType: CharacterMemory['memoryType']
    ): Promise<number> {
        let baseScore = this.getBaseScoreByType(memoryType);

        // Content analysis modifiers
        const contentModifiers = this.analyzeContentImportance(content);

        // Apply modifiers
        let finalScore = baseScore + contentModifiers.emotionalWeight +
            contentModifiers.complexityBonus + contentModifiers.keywordBonus;

        // Ensure score is within bounds
        return Math.max(0.1, Math.min(1.0, finalScore));
    }

    /**
     * Get base importance score by memory type
     */
    private getBaseScoreByType(memoryType: CharacterMemory['memoryType']): number {
        const typeScores = {
            'trait': 0.8,        // Character traits are very important
            'relationship': 0.7,  // Relationships are crucial for character understanding
            'event': 0.6,        // Events provide context and development
            'dialogue': 0.5,     // Dialogue reveals character voice and relationships
            'emotion': 0.5,      // Emotional states are important for character depth
            'knowledge': 0.4     // General knowledge is less immediately important
        };

        return typeScores[memoryType] || 0.5;
    }

    /**
     * Analyze content for importance indicators
     */
    private analyzeContentImportance(content: string): {
        emotionalWeight: number;
        complexityBonus: number;
        keywordBonus: number;
    } {
        const contentLower = content.toLowerCase();

        // Emotional weight indicators
        const emotionalKeywords = [
            'loves', 'hates', 'fears', 'angry', 'sad', 'happy', 'devastated',
            'shocked', 'surprised', 'betrayed', 'loyal', 'trust', 'betrayal',
            'passion', 'rage', 'grief', 'joy', 'hope', 'despair'
        ];

        const emotionalMatches = emotionalKeywords.filter(keyword =>
            contentLower.includes(keyword)
        ).length;

        const emotionalWeight = Math.min(0.2, emotionalMatches * 0.05);

        // Complexity bonus (longer, more detailed memories are often more important)
        const wordCount = content.split(/\s+/).length;
        const complexityBonus = wordCount > 50 ? 0.1 : wordCount > 20 ? 0.05 : 0;

        // Important keyword detection
        const importantKeywords = [
            'always', 'never', 'first time', 'last time', 'decided', 'realized',
            'discovered', 'learned', 'changed', 'transformed', 'became',
            'secret', 'hidden', 'revealed', 'truth', 'lie', 'promise',
            'vow', 'oath', 'mission', 'goal', 'destiny', 'fate'
        ];

        const keywordMatches = importantKeywords.filter(keyword =>
            contentLower.includes(keyword)
        ).length;

        const keywordBonus = Math.min(0.15, keywordMatches * 0.03);

        return {
            emotionalWeight,
            complexityBonus,
            keywordBonus
        };
    }

    /**
     * Score a gap-filling scenario on multiple dimensions
     */
    scoreGapFillingScenario(
        content: string,
        characterTraits: any[],
        existingMemories: CharacterMemory[],
        timelineContext: string
    ): {
        plausibilityScore: number;
        characterConsistency: number;
        narrativeHarmony: number;
        evidenceSupport: number;
    } {
        const plausibilityScore = this.calculatePlausibilityScore(content, timelineContext);
        const characterConsistency = this.calculateCharacterConsistency(content, characterTraits);
        const narrativeHarmony = this.calculateNarrativeHarmony(content, existingMemories);
        const evidenceSupport = this.calculateEvidenceSupport(content, existingMemories);

        return {
            plausibilityScore,
            characterConsistency,
            narrativeHarmony,
            evidenceSupport
        };
    }

    /**
     * Calculate how plausible the scenario is given the timeline context
     */
    private calculatePlausibilityScore(content: string, timelineContext: string): number {
        const contentLower = content.toLowerCase();
        const contextLower = timelineContext.toLowerCase();

        let score = 0.5; // Base plausibility

        // Check for logical consistency with timeline context
        if (contextLower.includes('battle') || contextLower.includes('fight')) {
            if (contentLower.includes('help') || contentLower.includes('support') ||
                contentLower.includes('evacuate') || contentLower.includes('prepare')) {
                score += 0.3; // Supportive actions during battle are plausible
            }
            if (contentLower.includes('sleep') || contentLower.includes('party') ||
                contentLower.includes('relax')) {
                score -= 0.3; // Inappropriate actions during battle
            }
        }

        if (contextLower.includes('crisis') || contextLower.includes('emergency')) {
            if (contentLower.includes('respond') || contentLower.includes('react') ||
                contentLower.includes('address')) {
                score += 0.2;
            }
        }

        // Check for realistic activity descriptions
        if (contentLower.includes('meanwhile') || contentLower.includes('during this time') ||
            contentLower.includes('simultaneously')) {
            score += 0.1; // Good temporal awareness
        }

        return Math.max(0.1, Math.min(1.0, score));
    }

    /**
     * Calculate how consistent the scenario is with established character traits
     */
    private calculateCharacterConsistency(content: string, characterTraits: any[]): number {
        if (!characterTraits || characterTraits.length === 0) {
            return 0.5; // Neutral score if no traits available
        }

        const contentLower = content.toLowerCase();
        let consistencyScore = 0.5;
        let traitsEvaluated = 0;

        characterTraits.forEach(trait => {
            const traitText = (trait.content || trait.description || trait).toLowerCase();

            // Look for alignment with traits
            if (this.isContentAlignedWithTrait(contentLower, traitText)) {
                consistencyScore += 0.1;
                traitsEvaluated++;
            } else if (this.isContentConflictingWithTrait(contentLower, traitText)) {
                consistencyScore -= 0.15;
                traitsEvaluated++;
            }
        });

        // Bonus for having multiple trait alignments
        if (traitsEvaluated > 2) {
            consistencyScore += 0.1;
        }

        return Math.max(0.1, Math.min(1.0, consistencyScore));
    }

    /**
     * Calculate how well the scenario fits with the existing narrative
     */
    private calculateNarrativeHarmony(content: string, existingMemories: CharacterMemory[]): number {
        const contentLower = content.toLowerCase();
        let harmonyScore = 0.6; // Base harmony

        // Check for conflicts with existing canon memories
        const canonMemories = existingMemories.filter(memory => memory.canonStatus === 'canon');

        let conflicts = 0;
        let alignments = 0;

        canonMemories.forEach(memory => {
            const memoryLower = memory.content.toLowerCase();

            if (this.detectContentConflict(contentLower, memoryLower)) {
                conflicts++;
            } else if (this.detectContentAlignment(contentLower, memoryLower)) {
                alignments++;
            }
        });

        // Penalize conflicts, reward alignments
        harmonyScore -= conflicts * 0.2;
        harmonyScore += alignments * 0.1;

        return Math.max(0.1, Math.min(1.0, harmonyScore));
    }

    /**
     * Calculate how much existing evidence supports this scenario
     */
    private calculateEvidenceSupport(content: string, existingMemories: CharacterMemory[]): number {
        const contentLower = content.toLowerCase();
        let supportScore = 0.3; // Base support level

        // Look for supporting evidence in existing memories
        const relevantMemories = existingMemories.filter(memory =>
            memory.canonStatus === 'canon' &&
            this.isMemoryRelevantToContent(memory.content, contentLower)
        );

        // Score based on amount of supporting evidence
        supportScore += Math.min(0.5, relevantMemories.length * 0.1);

        // Bonus for specific evidence types
        relevantMemories.forEach(memory => {
            if (memory.memoryType === 'trait' || memory.memoryType === 'relationship') {
                supportScore += 0.05; // Trait and relationship evidence is valuable
            }
        });

        return Math.max(0.1, Math.min(1.0, supportScore));
    }

    /**
     * Check if content aligns with a character trait
     */
    private isContentAlignedWithTrait(content: string, trait: string): boolean {
        // Simple keyword alignment check - could be enhanced with more sophisticated analysis
        const traitKeywords = trait.split(/\s+/).filter(word => word.length > 3);
        return traitKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * Check if content conflicts with a character trait
     */
    private isContentConflictingWithTrait(content: string, trait: string): boolean {
        // Look for direct contradictions
        if (trait.includes('brave') && content.includes('hiding')) return true;
        if (trait.includes('kind') && content.includes('cruel')) return true;
        if (trait.includes('loyal') && content.includes('betray')) return true;

        return false;
    }

    /**
     * Detect potential conflicts between content and existing memories
     */
    private detectContentConflict(content: string, existingContent: string): boolean {
        // Simple conflict detection - could be enhanced
        const conflictPairs = [
            ['present', 'absent'],
            ['alive', 'dead'],
            ['here', 'there'],
            ['helping', 'hindering']
        ];

        return conflictPairs.some(([word1, word2]) =>
            (content.includes(word1) && existingContent.includes(word2)) ||
            (content.includes(word2) && existingContent.includes(word1))
        );
    }

    /**
     * Detect alignment between content and existing memories
     */
    private detectContentAlignment(content: string, existingContent: string): boolean {
        // Look for similar themes or keywords
        const contentWords = content.split(/\s+/).filter(word => word.length > 4);
        const existingWords = existingContent.split(/\s+/).filter(word => word.length > 4);

        const commonWords = contentWords.filter(word => existingWords.includes(word));
        return commonWords.length >= 2;
    }

    /**
     * Check if a memory is relevant to the gap-filling content
     */
    private isMemoryRelevantToContent(memoryContent: string, gapContent: string): boolean {
        const memoryWords = memoryContent.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const gapWords = gapContent.split(/\s+/).filter(word => word.length > 3);

        const commonWords = memoryWords.filter(word => gapWords.includes(word));
        return commonWords.length >= 1;
    }
}
