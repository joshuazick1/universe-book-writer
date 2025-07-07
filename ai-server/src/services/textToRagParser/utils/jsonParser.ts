/**
 * Robust JSON parsing utility for AI responses
 */

export interface JSONParseResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    rawText?: string;
    cleanedText?: string;
}

export class JSONParser {
    /**
     * Attempt to parse JSON from AI response with multiple fallback strategies
     */
    static parseAIResponse<T = any>(response: string): JSONParseResult<T> {
        if (!response || typeof response !== 'string') {
            return {
                success: false,
                error: 'Invalid input: response must be a non-empty string',
                rawText: response
            };
        }

        const strategies = [
            () => this.directParse<T>(response),
            () => this.extractFromCodeBlocks<T>(response),
            () => this.extractFromMarkdown<T>(response),
            () => this.extractWithRegex<T>(response),
            () => this.cleanAndParse<T>(response),
            () => this.partialParse<T>(response),
            () => this.fuzzyExtraction<T>(response)
        ];

        for (const strategy of strategies) {
            try {
                const result = strategy();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                // Continue to next strategy
                continue;
            }
        }

        return {
            success: false,
            error: 'All parsing strategies failed',
            rawText: response
        };
    }

    /**
     * Direct JSON parse attempt
     */
    private static directParse<T>(text: string): JSONParseResult<T> {
        try {
            const data = JSON.parse(text);
            return { success: true, data, rawText: text };
        } catch (error) {
            return {
                success: false,
                error: `Direct parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                rawText: text
            };
        }
    }

    /**
     * Extract JSON from markdown code blocks
     */
    private static extractFromCodeBlocks<T>(text: string): JSONParseResult<T> {
        const codeBlockPatterns = [
            /```json\s*\n([\s\S]*?)\n```/gi,
            /```\s*\n([\s\S]*?)\n```/gi,
            /`([^`]+)`/gi
        ];

        for (const pattern of codeBlockPatterns) {
            const matches = Array.from(text.matchAll(pattern));
            for (const match of matches) {
                try {
                    const jsonText = match[1].trim();
                    const data = JSON.parse(jsonText);
                    return { 
                        success: true, 
                        data, 
                        rawText: text,
                        cleanedText: jsonText 
                    };
                } catch {
                    continue;
                }
            }
        }

        return {
            success: false,
            error: 'No valid JSON found in code blocks',
            rawText: text
        };
    }

    /**
     * Extract JSON from various markdown formats
     */
    private static extractFromMarkdown<T>(text: string): JSONParseResult<T> {
        // Remove common markdown elements that might interfere
        let cleaned = text
            .replace(/^\s*#+\s*.*/gm, '') // Headers
            .replace(/^\s*[*-]\s*.*/gm, '') // List items
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/__(.*?)__/g, '$1') // Bold
            .replace(/_(.*?)_/g, '$1'); // Italic

        return this.directParse<T>(cleaned);
    }

    /**
     * Use regex to find JSON-like structures
     */
    private static extractWithRegex<T>(text: string): JSONParseResult<T> {
        // Look for JSON object patterns
        const patterns = [
            /\{[\s\S]*\}/g, // Any content between braces
            /\[[\s\S]*\]/g  // Any content between brackets
        ];

        for (const pattern of patterns) {
            const matches = Array.from(text.matchAll(pattern));
            for (const match of matches) {
                try {
                    const data = JSON.parse(match[0]);
                    return { 
                        success: true, 
                        data, 
                        rawText: text,
                        cleanedText: match[0] 
                    };
                } catch {
                    continue;
                }
            }
        }

        return {
            success: false,
            error: 'No valid JSON found with regex patterns',
            rawText: text
        };
    }

    /**
     * Clean common AI response artifacts and parse
     */
    private static cleanAndParse<T>(text: string): JSONParseResult<T> {
        let cleaned = text
            // Remove common AI prefixes/suffixes
            .replace(/^(Here's|Here is|The|A|An)\s+.*?:\s*/i, '')
            .replace(/\s*I hope this helps.*$/i, '')
            .replace(/\s*Let me know if.*$/i, '')
            
            // Remove explanation text around JSON
            .replace(/.*?(?=\{)/, '') // Remove everything before first {
            .replace(/\}.*$/, '}') // Remove everything after last }
            
            // Fix common formatting issues
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/,\s*\}/g, '}') // Remove trailing commas before }
            .replace(/,\s*\]/g, ']') // Remove trailing commas before ]
            .replace(/\n\s*/g, ' ') // Replace newlines with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        return this.directParse<T>(cleaned);
    }

    /**
     * Attempt to parse incomplete JSON by fixing common issues
     */
    private static partialParse<T>(text: string): JSONParseResult<T> {
        let fixed = text.trim();

        // Fix unclosed strings
        const stringMatches = fixed.match(/"/g);
        if (stringMatches && stringMatches.length % 2 !== 0) {
            fixed += '"';
        }

        // Fix unclosed objects/arrays
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            fixed += '}'.repeat(openBraces - closeBraces);
        }

        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            fixed += ']'.repeat(openBrackets - closeBrackets);
        }

        return this.directParse<T>(fixed);
    }

    /**
     * Fuzzy extraction - extract key-value pairs and reconstruct JSON
     */
    private static fuzzyExtraction<T>(text: string): JSONParseResult<T> {
        try {
            // Extract key-value patterns
            const kvPatterns = [
                /"([^"]+)":\s*"([^"]*)"/g,
                /"([^"]+)":\s*(\d+\.?\d*)/g,
                /"([^"]+)":\s*(true|false|null)/g,
                /"([^"]+)":\s*\[([^\]]*)\]/g
            ];

            const extracted: Record<string, any> = {};

            for (const pattern of kvPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const key = match[1];
                    let value: any = match[2];

                    // Parse value appropriately
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (value === 'null') value = null;
                    else if (!isNaN(Number(value))) value = Number(value);
                    else if (value.startsWith('[')) {
                        try {
                            value = JSON.parse(`[${match[2]}]`);
                        } catch {
                            value = match[2].split(',').map(s => s.trim().replace(/"/g, ''));
                        }
                    }

                    extracted[key] = value;
                }
            }

            if (Object.keys(extracted).length > 0) {
                return {
                    success: true,
                    data: extracted as T,
                    rawText: text,
                    cleanedText: JSON.stringify(extracted)
                };
            }
        } catch (error) {
            // Fall through to failure
        }

        return {
            success: false,
            error: 'Fuzzy extraction failed',
            rawText: text
        };
    }

    /**
     * Validate that parsed JSON has expected structure
     */
    static validateStructure<T>(
        data: any,
        validator: (data: any) => data is T
    ): JSONParseResult<T> {
        if (validator(data)) {
            return { success: true, data };
        }
        return {
            success: false,
            error: 'Data structure validation failed',
            data: data
        };
    }

    /**
     * Create a validator function for entity arrays
     */
    static createEntityArrayValidator() {
        return (data: any): data is any[] => {
            return Array.isArray(data) && data.every(item => 
                typeof item === 'object' &&
                item !== null &&
                typeof item.type === 'string' &&
                typeof item.name === 'string' &&
                typeof item.confidence === 'number'
            );
        };
    }

    /**
     * Extract and validate entities from AI response
     */
    static parseEntities(response: string): JSONParseResult<any[]> {
        const parseResult = this.parseAIResponse(response);
        
        if (!parseResult.success) {
            return parseResult;
        }

        // Handle various response formats
        let entities = parseResult.data;
        
        // If response is an object with an entities property
        if (entities && typeof entities === 'object' && entities.entities) {
            entities = entities.entities;
        }
        
        // If response is an object with results property
        if (entities && typeof entities === 'object' && entities.results) {
            entities = entities.results;
        }

        // Ensure we have an array
        if (!Array.isArray(entities)) {
            return {
                success: false,
                error: 'Response does not contain an entity array',
                rawText: response,
                data: parseResult.data
            };
        }

        const validator = this.createEntityArrayValidator();
        return this.validateStructure(entities, validator);
    }
}
