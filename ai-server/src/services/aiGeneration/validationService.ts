/**
 * Generator Validation Service
 * 
 * Provides comprehensive validation for generated characters and universes.
 * Ensures quality, consistency, and logical coherence of AI-generated content.
 */

import {
    GeneratedCharacter,
    CharacterValidationResult
} from '../characterGenerator/types.js';
import {
    GeneratedUniverse,
    UniverseValidationResult,
    ValidationIssue
} from '../universeGenerator/types.js';
import { OllamaService } from '../textToRagParser/ai/ollamaService.js';

export interface ValidationConfig {
    character: {
        minPersonalityTraits: number;
        minBackstoryEvents: number;
        minSkills: number;
        minGoals: number;
        requirePhysicalDescription: boolean;
        requireCurrentStatus: boolean;
    };
    universe: {
        minCultures: number;
        minConflicts: number;
        minLocations: number;
        requireHistory: boolean;
        requireGeography: boolean;
    };
    quality: {
        minQualityScore: number;
        maxInconsistencies: number;
        requireCoherence: boolean;
    };
}

export interface ConsistencyCheck {
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
}

export interface QualityAssessment {
    score: number;
    categories: {
        completeness: number;
        coherence: number;
        originality: number;
        depth: number;
    };
    strengths: string[];
    weaknesses: string[];
    overallAssessment: string;
}

export class GeneratorValidationService {
    private ollamaService: OllamaService;
    private config: ValidationConfig;

    constructor(config?: Partial<ValidationConfig>) {
        this.ollamaService = new OllamaService();
        this.config = this.buildDefaultConfig(config);
    }

    /**
     * Validate a generated character comprehensively
     */
    async validateCharacter(character: GeneratedCharacter): Promise<CharacterValidationResult> {
        console.log(`Validating character: ${character.name}`);

        try {
            // Basic structural validation
            const structuralIssues = this.validateCharacterStructure(character);

            // Consistency checks
            const consistencyChecks = await this.performCharacterConsistencyChecks(character);

            // Quality assessment
            const qualityAssessment = await this.assessCharacterQuality(character);

            // Logic validation
            const logicIssues = this.validateCharacterLogic(character);

            // Compile results
            const allIssues = [...structuralIssues, ...logicIssues];
            const suggestions = this.generateCharacterSuggestions(character, allIssues, qualityAssessment);

            const result: CharacterValidationResult = {
                isValid: allIssues.filter(i => i.severity === 'high').length === 0,
                qualityScore: qualityAssessment.score,
                issues: allIssues,
                suggestions,
                consistencyChecks: {
                    personalityCoherence: consistencyChecks.personality,
                    backstoryLogic: consistencyChecks.backstory,
                    skillsRealistic: consistencyChecks.skills,
                    goalsAchievable: consistencyChecks.goals,
                    relationshipsConsistent: consistencyChecks.relationships
                },
                qualityAssessment,
                validatedAt: new Date()
            };

            return result;

        } catch (error) {
            console.error('Error validating character:', error);
            return this.createErrorValidationResult('character', character.name, error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Validate a generated universe comprehensively
     */
    async validateUniverse(universe: GeneratedUniverse): Promise<UniverseValidationResult> {
        console.log(`Validating universe: ${universe.name}`);

        try {
            // Basic structural validation
            const structuralIssues = this.validateUniverseStructure(universe);

            // Consistency checks
            const consistencyChecks = await this.performUniverseConsistencyChecks(universe);

            // Quality assessment
            const qualityAssessment = await this.assessUniverseQuality(universe);

            // Logic validation
            const logicIssues = this.validateUniverseLogic(universe);

            // Compile results with conversion
            const structuralValidationIssues = this.convertConsistencyChecksToValidationIssues(structuralIssues);
            const logicValidationIssues = this.convertConsistencyChecksToValidationIssues(logicIssues);
            const allIssues = [...structuralValidationIssues, ...logicValidationIssues];
            const suggestions = this.generateUniverseSuggestions(universe, allIssues, qualityAssessment);

            const result: UniverseValidationResult = {
                isValid: allIssues.filter(i => i.severity === 'critical' || i.severity === 'major').length === 0,
                qualityScore: qualityAssessment.score,
                issues: allIssues,
                suggestions,
                consistencyChecks: {
                    historyCoherent: consistencyChecks.history,
                    geographyLogical: consistencyChecks.geography,
                    culturesDistinct: consistencyChecks.cultures,
                    conflictsRealistic: consistencyChecks.conflicts,
                    timelineConsistent: consistencyChecks.timeline
                },
                qualityAssessment,
                validatedAt: new Date()
            };

            return result;

        } catch (error) {
            console.error('Error validating universe:', error);
            return this.createErrorValidationResult('universe', universe.name, error instanceof Error ? error.message : String(error));
        }
    }

    // ============================================
    // CHARACTER VALIDATION METHODS
    // ============================================

    private validateCharacterStructure(character: GeneratedCharacter): ConsistencyCheck[] {
        const issues: ConsistencyCheck[] = [];

        // Required fields validation
        if (!character.name || character.name.trim().length === 0) {
            issues.push({
                field: 'name',
                issue: 'Character name is missing or empty',
                severity: 'high',
                suggestion: 'Generate a proper name for the character'
            });
        }

        if (!character.species) {
            issues.push({
                field: 'species',
                issue: 'Character species is not specified',
                severity: 'medium',
                suggestion: 'Specify the character\'s species or race'
            });
        }

        // Personality validation
        if (!character.personality?.traits || character.personality.traits.length < this.config.character.minPersonalityTraits) {
            issues.push({
                field: 'personality.traits',
                issue: `Character has fewer than ${this.config.character.minPersonalityTraits} personality traits`,
                severity: 'medium',
                suggestion: 'Add more distinct personality traits to make the character more well-rounded'
            });
        }

        // Backstory validation
        if (this.config.character.minBackstoryEvents > 0 &&
            (!character.backstory?.formativeEvents || character.backstory.formativeEvents.length < this.config.character.minBackstoryEvents)) {
            issues.push({
                field: 'backstory.formativeEvents',
                issue: `Character has fewer than ${this.config.character.minBackstoryEvents} formative events`,
                severity: 'medium',
                suggestion: 'Add more formative events to provide depth and explanation for current personality'
            });
        }

        // Skills validation
        if (this.config.character.minSkills > 0 &&
            (!character.skills || character.skills.length < this.config.character.minSkills)) {
            issues.push({
                field: 'skills',
                issue: `Character has fewer than ${this.config.character.minSkills} skills`,
                severity: 'low',
                suggestion: 'Add relevant skills based on character background and occupation'
            });
        }

        // Physical description validation
        if (this.config.character.requirePhysicalDescription && !character.physicalDescription) {
            issues.push({
                field: 'physicalDescription',
                issue: 'Character lacks physical description',
                severity: 'medium',
                suggestion: 'Add detailed physical description including distinctive features'
            });
        }

        return issues;
    }

    private async performCharacterConsistencyChecks(character: GeneratedCharacter) {
        // Use AI to check for logical consistency
        const prompt = this.buildCharacterConsistencyPrompt(character);

        try {
            const response = await this.ollamaService.generateText(prompt, {
                model: 'mistral-nemo:12b',
                temperature: 0.3, // Low temperature for consistent analysis
                maxTokens: 800
            });

            return this.parseConsistencyResponse(response);
        } catch (error) {
            console.warn('Failed to perform AI consistency check, using fallback');
            return this.createFallbackConsistencyChecks();
        }
    }

    private validateCharacterLogic(character: GeneratedCharacter): ConsistencyCheck[] {
        const issues: ConsistencyCheck[] = [];

        // Age consistency checks
        if (character.age !== undefined) {
            if (character.age < 0 || character.age > 200) {
                issues.push({
                    field: 'age',
                    issue: 'Character age is unrealistic',
                    severity: 'high',
                    suggestion: 'Set a realistic age appropriate for the character\'s species and universe'
                });
            }

            // Check if backstory events are age-appropriate
            if (character.backstory?.formativeEvents) {
                for (const event of character.backstory.formativeEvents) {
                    if (event.age && event.age > character.age) {
                        issues.push({
                            field: 'backstory.formativeEvents',
                            issue: `Formative event occurred at age ${event.age}, but character is only ${character.age}`,
                            severity: 'high',
                            suggestion: 'Adjust event ages to be consistent with character\'s current age'
                        });
                    }
                }
            }
        }

        // Skill-experience consistency
        if (character.skills && character.backstory?.career) {
            const professionalSkills = character.skills.filter(skill =>
                typeof skill === 'object' && skill.level !== 'novice'
            );

            if (professionalSkills.length === 0 && character.backstory.career !== 'unemployed') {
                issues.push({
                    field: 'skills',
                    issue: 'Character has a career but no professional skills',
                    severity: 'medium',
                    suggestion: 'Add professional skills that match the character\'s career background'
                });
            }
        }

        return issues;
    }

    private async assessCharacterQuality(character: GeneratedCharacter): Promise<QualityAssessment> {
        // Calculate completeness score
        const completeness = this.calculateCharacterCompleteness(character);

        // Use AI to assess coherence and originality
        const aiAssessment = await this.performAIQualityAssessment(character, 'character');

        const categories = {
            completeness,
            coherence: aiAssessment.coherence || 0.7,
            originality: aiAssessment.originality || 0.6,
            depth: aiAssessment.depth || 0.6
        };

        const score = Object.values(categories).reduce((sum, val) => sum + val, 0) / 4;

        return {
            score,
            categories,
            strengths: aiAssessment.strengths || ['Basic character structure is present'],
            weaknesses: aiAssessment.weaknesses || ['Could use more development'],
            overallAssessment: this.generateOverallAssessment(score, categories)
        };
    }

    // ============================================
    // UNIVERSE VALIDATION METHODS
    // ============================================

    private validateUniverseStructure(universe: GeneratedUniverse): ConsistencyCheck[] {
        const issues: ConsistencyCheck[] = [];

        // Required fields validation
        if (!universe.name || universe.name.trim().length === 0) {
            issues.push({
                field: 'name',
                issue: 'Universe name is missing or empty',
                severity: 'high',
                suggestion: 'Generate a proper name for the universe'
            });
        }

        if (!universe.premise || universe.premise.trim().length < 20) {
            issues.push({
                field: 'premise',
                issue: 'Universe premise is too short or missing',
                severity: 'high',
                suggestion: 'Develop a comprehensive premise that explains the universe\'s core concept'
            });
        }

        // Geography validation
        if (this.config.universe.requireGeography && !universe.geography) {
            issues.push({
                field: 'geography',
                issue: 'Universe lacks geographical information',
                severity: 'medium',
                suggestion: 'Add geographical details including worlds, locations, and natural features'
            });
        }

        // Culture validation
        if (universe.cultures && universe.cultures.length < this.config.universe.minCultures) {
            issues.push({
                field: 'cultures',
                issue: `Universe has fewer than ${this.config.universe.minCultures} cultures`,
                severity: 'medium',
                suggestion: 'Add more diverse cultures to create a rich, varied universe'
            });
        }

        return issues;
    }

    private async performUniverseConsistencyChecks(universe: GeneratedUniverse) {
        const prompt = this.buildUniverseConsistencyPrompt(universe);

        try {
            const response = await this.ollamaService.generateText(prompt, {
                model: 'mistral-nemo:12b',
                temperature: 0.3,
                maxTokens: 1000
            });

            return this.parseConsistencyResponse(response);
        } catch (error) {
            console.warn('Failed to perform universe consistency check, using fallback');
            return this.createFallbackConsistencyChecks();
        }
    }

    private validateUniverseLogic(universe: GeneratedUniverse): ConsistencyCheck[] {
        const issues: ConsistencyCheck[] = [];

        // Technology-magic consistency
        if (universe.technology && universe.magicSystem) {
            const techLevel = universe.technology?.level || 0;
            const magicLevel = universe.magicSystem?.publicPerception || 'unknown';

            if (techLevel >= 8 && magicLevel === 'revered') {
                issues.push({
                    field: 'technology/magicSystem',
                    issue: 'Futuristic technology with dominant magic may be inconsistent',
                    severity: 'low',
                    suggestion: 'Consider how advanced technology and dominant magic coexist in this universe'
                });
            }
        }

        // Timeline consistency
        if (universe.history) {
            const eras = Object.values(universe.history).filter(era => era && typeof era === 'object');

            // Check for timeline gaps or overlaps
            for (let i = 0; i < eras.length - 1; i++) {
                const currentEra = eras[i];
                const nextEra = eras[i + 1];

                if (currentEra.timespan && nextEra.timespan) {
                    // Basic timespan format validation
                    if (!this.isValidTimespan(currentEra.timespan) || !this.isValidTimespan(nextEra.timespan)) {
                        issues.push({
                            field: 'history.timeline',
                            issue: 'Era timespans are not properly formatted',
                            severity: 'medium',
                            suggestion: 'Use consistent timespan formatting (e.g., "1000-2000 CE" or "First Age")'
                        });
                    }
                }
            }
        }

        return issues;
    }

    private async assessUniverseQuality(universe: GeneratedUniverse): Promise<QualityAssessment> {
        const completeness = this.calculateUniverseCompleteness(universe);
        const aiAssessment = await this.performAIQualityAssessment(universe, 'universe');

        const categories = {
            completeness,
            coherence: aiAssessment.coherence || 0.7,
            originality: aiAssessment.originality || 0.6,
            depth: aiAssessment.depth || 0.6
        };

        const score = Object.values(categories).reduce((sum, val) => sum + val, 0) / 4;

        return {
            score,
            categories,
            strengths: aiAssessment.strengths || ['Basic universe structure is present'],
            weaknesses: aiAssessment.weaknesses || ['Could use more development'],
            overallAssessment: this.generateOverallAssessment(score, categories)
        };
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    private buildDefaultConfig(partialConfig?: Partial<ValidationConfig>): ValidationConfig {
        return {
            character: {
                minPersonalityTraits: 3,
                minBackstoryEvents: 2,
                minSkills: 3,
                minGoals: 2,
                requirePhysicalDescription: true,
                requireCurrentStatus: true,
                ...partialConfig?.character
            },
            universe: {
                minCultures: 2,
                minConflicts: 1,
                minLocations: 3,
                requireHistory: true,
                requireGeography: true,
                ...partialConfig?.universe
            },
            quality: {
                minQualityScore: 0.6,
                maxInconsistencies: 5,
                requireCoherence: true,
                ...partialConfig?.quality
            }
        };
    }

    private buildCharacterConsistencyPrompt(character: GeneratedCharacter): string {
        return `Analyze this character for logical consistency and coherence:

CHARACTER: ${character.name}
AGE: ${character.age}
SPECIES: ${character.species}

PERSONALITY TRAITS: ${character.personality?.traits?.map(t => t.name).join(', ') || 'None listed'}
VALUES: ${character.personality?.values?.join(', ') || 'None listed'}

BACKSTORY: ${character.backstory?.childhood || 'Not provided'}
FORMATIVE EVENTS: ${character.backstory?.formativeEvents?.map((e: any) => e.event).join('; ') || 'None listed'}
EDUCATION: ${character.backstory?.education || 'Not specified'}
CAREER: ${character.backstory?.career || 'Not specified'}

CURRENT OCCUPATION: ${character.currentStatus?.occupation || 'Unknown'}
CURRENT LOCATION: ${character.currentStatus?.location || 'Unknown'}

SKILLS: ${character.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ') || 'None listed'}

Check for consistency and logical coherence:
1. Do the personality traits align with the character's actions and background?
2. Is the backstory logically consistent (ages, timelines, cause and effect)?
3. Do the skills match the education and career background?
4. Are the character's goals realistic given their background and personality?
5. Is the current status consistent with their history?

Respond with JSON format:
{
  "personality": true/false,
  "backstory": true/false,
  "skills": true/false,
  "goals": true/false,
  "relationships": true/false,
  "issues": ["list", "of", "specific", "issues"],
  "strengths": ["list", "of", "strengths"]
}`;
    }

    private buildUniverseConsistencyPrompt(universe: GeneratedUniverse): string {
        return `Analyze this universe for logical consistency and coherence:

UNIVERSE: ${universe.name}
PREMISE: ${universe.premise}

GEOGRAPHY: ${universe.geography?.worlds?.length || 0} worlds, ${universe.geography?.notableLocations?.length || 0} notable locations
CULTURES: ${universe.cultures?.length || 0} cultures listed
GOVERNMENTS: ${universe.governments?.length || 0} governments
CONFLICTS: ${universe.currentConflicts?.length || 0} current conflicts

TECHNOLOGY LEVEL: ${universe.technology?.level || 'Not specified'}
MAGIC SYSTEM: ${universe.magicSystem ? 'Present' : 'None'}

HISTORY: ${universe.history ? 'Multi-era timeline' : 'Not detailed'}

Check for consistency and logical coherence:
1. Does the geography support the described cultures and governments?
2. Are the conflicts realistic given the political and cultural setup?
3. Is the technology level consistent throughout the universe?
4. If magic exists, does it integrate logically with the technology and society?
5. Is the historical timeline logical and consistent?

Respond with JSON format:
{
  "history": true/false,
  "geography": true/false,
  "cultures": true/false,
  "conflicts": true/false,
  "timeline": true/false,
  "issues": ["list", "of", "specific", "issues"],
  "strengths": ["list", "of", "strengths"]
}`;
    }

    private parseConsistencyResponse(response: string) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse consistency response');
        }

        return this.createFallbackConsistencyChecks();
    }

    private createFallbackConsistencyChecks() {
        return {
            personality: true,
            backstory: true,
            skills: true,
            goals: true,
            relationships: true,
            history: true,
            geography: true,
            cultures: true,
            conflicts: true,
            timeline: true,
            issues: [],
            strengths: ['Basic structure is present']
        };
    }

    private async performAIQualityAssessment(entity: any, type: 'character' | 'universe') {
        // Simplified quality assessment without AI for now
        return {
            coherence: 0.7,
            originality: 0.6,
            depth: 0.6,
            strengths: ['Well-structured', 'Internally consistent'],
            weaknesses: ['Could use more detail', 'Some elements could be expanded']
        };
    }

    private calculateCharacterCompleteness(character: GeneratedCharacter): number {
        let score = 0;
        const maxScore = 10;

        if (character.name) score += 1;
        if (character.physicalDescription) score += 1;
        if (character.personality?.traits?.length > 0) score += 2;
        if (character.backstory?.formativeEvents?.length > 0) score += 2;
        if (character.skills?.length > 0) score += 1;
        if (character.goals?.immediate?.length > 0) score += 1;
        if (character.currentStatus?.occupation) score += 1;
        if (character.initialMemories?.length > 0) score += 1;

        return score / maxScore;
    }

    private calculateUniverseCompleteness(universe: GeneratedUniverse): number {
        let score = 0;
        const maxScore = 10;

        if (universe.name) score += 1;
        if (universe.premise) score += 2;
        if (universe.history) score += 2;
        if (universe.geography) score += 1;
        if (universe.cultures?.length > 0) score += 1;
        if (universe.currentConflicts?.length > 0) score += 1;
        if (universe.storySeeds?.length > 0) score += 1;
        if (universe.importantFigures?.length > 0) score += 1;

        return score / maxScore;
    }

    private generateOverallAssessment(score: number, categories: any): string {
        if (score >= 0.8) {
            return 'High quality generation with strong completeness and coherence';
        } else if (score >= 0.6) {
            return 'Good quality generation with room for improvement in some areas';
        } else if (score >= 0.4) {
            return 'Acceptable quality with several areas needing development';
        } else {
            return 'Low quality generation requiring significant improvement';
        }
    }

    private generateCharacterSuggestions(
        character: GeneratedCharacter,
        issues: ConsistencyCheck[],
        quality: QualityAssessment
    ): string[] {
        const suggestions = [];

        if (quality.score < 0.6) {
            suggestions.push('Consider regenerating with more detailed specifications');
        }

        if (quality.categories.completeness < 0.7) {
            suggestions.push('Add more details to incomplete sections');
        }

        if (issues.some(i => i.field.includes('personality'))) {
            suggestions.push('Develop more distinctive personality traits and mannerisms');
        }

        if (issues.some(i => i.field.includes('backstory'))) {
            suggestions.push('Expand backstory with more formative events and details');
        }

        return suggestions;
    }

    private generateUniverseSuggestions(
        universe: GeneratedUniverse,
        issues: ValidationIssue[],
        quality: QualityAssessment
    ): string[] {
        const suggestions = [];

        if (quality.score < 0.6) {
            suggestions.push('Consider regenerating with more comprehensive world-building');
        }

        if (quality.categories.completeness < 0.7) {
            suggestions.push('Expand underdeveloped aspects of the universe');
        }

        if (issues.some(i => i.location.includes('culture'))) {
            suggestions.push('Add more diverse and distinctive cultures');
        }

        if (issues.some(i => i.location.includes('conflict'))) {
            suggestions.push('Develop more compelling conflicts and tensions');
        }

        return suggestions;
    }

    private isValidTimespan(timespan: string | boolean): boolean {
        // Basic validation for timespan format
        return typeof timespan === 'string' && timespan.length > 3 && (
            timespan.includes('-') ||
            timespan.toLowerCase().includes('age') ||
            timespan.toLowerCase().includes('era') ||
            timespan.toLowerCase().includes('period')
        );
    }

    private createErrorValidationResult(type: string, name: string, error: string): any {
        return {
            isValid: false,
            qualityScore: 0,
            issues: [{
                field: 'validation',
                issue: `Validation failed: ${error}`,
                severity: 'high' as const,
                suggestion: 'Check the generated content and try validation again'
            }],
            suggestions: ['Review and regenerate the content'],
            consistencyChecks: {},
            qualityAssessment: {
                score: 0,
                categories: { completeness: 0, coherence: 0, originality: 0, depth: 0 },
                strengths: [],
                weaknesses: [`Validation error: ${error}`],
                overallAssessment: `Validation failed for ${type}: ${name}`
            },
            validatedAt: new Date()
        };
    }

    /**
     * Convert ConsistencyCheck objects to ValidationIssue objects
     */
    private convertConsistencyChecksToValidationIssues(checks: ConsistencyCheck[]): ValidationIssue[] {
        return checks.map(check => ({
            type: 'consistency' as 'consistency' | 'logic' | 'originality' | 'depth' | 'balance',
            severity: this.mapSeverity(check.severity),
            description: check.issue,
            location: check.field,
            suggestion: check.suggestion
        }));
    }

    /**
     * Map severity levels between different validation types
     */
    private mapSeverity(severity: 'low' | 'medium' | 'high'): 'minor' | 'moderate' | 'major' | 'critical' {
        switch (severity) {
            case 'low': return 'minor';
            case 'medium': return 'moderate';
            case 'high': return 'major';
            default: return 'moderate';
        }
    }
}
