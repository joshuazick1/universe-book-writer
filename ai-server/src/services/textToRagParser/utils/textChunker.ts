/**
 * Smart text chunking utility for the Text-to-RAG Parser
 */

import { TextChunk } from '../core/interfaces.js';


/**
 * Options for splitting text into canonical sections.
 */
export interface SectioningOptions {
    maxSectionSize: number;
    overlapSize?: number;
    respectSentences?: boolean;
    respectParagraphs?: boolean;
}

export class TextChunker {
    /**
     * Split text into canonical sections with optional overlap.
     * @param text The input text
     * @param options Sectioning options
     * @param onProgress Optional callback for real-time progress reporting
     * @returns Array of section objects (canonical for downstream node creation)
     */
    /**
     * Split text into canonical sections with optional overlap.
     *
     * - Ensures section boundaries align with paragraphs/sentences when possible.
     * - Each output section is canonical and should be used for all downstream referencing (entity candidates, source refs, etc.).
     * - Output structure is stable for in-memory candidate aggregation and accurate source referencing.
     * - Section indices and offsets are guaranteed accurate for mapping appearances and relationships.
     *
     * @param text The input text
     * @param options Sectioning options
     * @param onProgress Optional callback for real-time progress reporting
     * @returns Array of canonical section objects for downstream node creation and referencing
     */
    static sectionText(
        text: string,
        options: SectioningOptions,
        onProgress?: (info: { type: string; data: any }) => void
    ): Array<{
        sectionIndex: number;
        text: string;
        startOffset: number;
        endOffset: number;
        wordCount: number;
    }> {
        const {
            maxSectionSize,
            overlapSize = 200,
            respectSentences = true,
            respectParagraphs = true
        } = options;

        if (!text || text.length === 0) {
            if (onProgress) onProgress({ type: 'empty', data: {} });
            return [];
        }

        if (text.length <= maxSectionSize) {
            const section = {
                sectionIndex: 0,
                text: text,
                startOffset: 0,
                endOffset: text.length,
                wordCount: this.countWords(text)
            };
            if (onProgress) onProgress({ type: 'section', data: section });
            return [section];
        }

        const sections: Array<any> = [];
        let currentPosition = 0;
        let sectionIndex = 0;

        while (currentPosition < text.length) {
            const remainingText = text.slice(currentPosition);
            if (onProgress) onProgress({ type: 'progress', data: { sectionIndex, currentPosition, remainingTextLength: remainingText.length } });

            if (remainingText.length <= maxSectionSize) {
                // Last section
                const lastSection = {
                    sectionIndex,
                    text: remainingText,
                    startOffset: currentPosition,
                    endOffset: text.length,
                    wordCount: this.countWords(remainingText)
                };
                sections.push(lastSection);
                if (onProgress) onProgress({ type: 'section', data: lastSection });
                break;
            }

            // Find the best break point within the section size limit
            const sectionEnd = this.findOptimalBreakPoint(
                text,
                currentPosition,
                currentPosition + maxSectionSize,
                respectParagraphs,
                respectSentences
            );
            if (onProgress) onProgress({ type: 'breakpoint', data: { sectionIndex, sectionEnd } });

            const sectionText = text.slice(currentPosition, sectionEnd);
            const sectionObj = {
                sectionIndex,
                text: sectionText,
                startOffset: currentPosition,
                endOffset: sectionEnd,
                wordCount: this.countWords(sectionText)
            };
            sections.push(sectionObj);
            if (onProgress) onProgress({ type: 'section', data: sectionObj });

            // Move to next section position with overlap
            currentPosition = Math.max(
                currentPosition + 1,
                sectionEnd - overlapSize
            );
            sectionIndex++;
        }

        if (onProgress) onProgress({ type: 'done', data: { totalSections: sections.length } });
        return sections;
    }

    /**
     * Find the optimal break point for a chunk
     */
    private static findOptimalBreakPoint(
        text: string,
        start: number,
        maxEnd: number,
        respectParagraphs: boolean,
        respectSentences: boolean
    ): number {
        const searchRange = text.slice(start, maxEnd);

        // Look for paragraph breaks first (double newlines)
        if (respectParagraphs) {
            const paragraphBreaks = this.findAll(searchRange, /\n\s*\n/g);
            if (paragraphBreaks.length > 0) {
                const lastBreak = paragraphBreaks[paragraphBreaks.length - 1];
                if (lastBreak.index > searchRange.length * 0.5) { // At least halfway through
                    return start + lastBreak.index + lastBreak.match.length;
                }
            }
        }

        // Look for sentence breaks
        if (respectSentences) {
            const sentenceBreaks = this.findAll(searchRange, /[.!?]+\s+/g);
            if (sentenceBreaks.length > 0) {
                const lastBreak = sentenceBreaks[sentenceBreaks.length - 1];
                if (lastBreak.index > searchRange.length * 0.5) { // At least halfway through
                    return start + lastBreak.index + lastBreak.match.length;
                }
            }
        }

        // Fall back to word boundaries
        const words = searchRange.split(/\s+/);
        if (words.length > 1) {
            // Take all but the last word to avoid cutting mid-word
            const safeText = words.slice(0, -1).join(' ');
            return start + safeText.length;
        }

        // Last resort: use the max end position
        return maxEnd;
    }

    /**
     * Find all matches of a regex in text with their positions
     */
    private static findAll(text: string, regex: RegExp): Array<{ index: number, match: string }> {
        const matches: Array<{ index: number, match: string }> = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            matches.push({
                index: match.index,
                match: match[0]
            });

            // Prevent infinite loop for zero-length matches
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }

        return matches;
    }

    /**
     * Count words in text
     */
    private static countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Calculate optimal chunk size based on text length and target number of chunks
     */
    static calculateOptimalChunkSize(textLength: number, targetChunks: number): number {
        const baseChunkSize = Math.ceil(textLength / targetChunks);

        // Ensure chunk size is within reasonable bounds
        const minChunkSize = 500;
        const maxChunkSize = 4000;

        return Math.max(minChunkSize, Math.min(maxChunkSize, baseChunkSize));
    }

    /**
     * Estimate processing time based on text length and model speed
     */
    static estimateProcessingTime(text: string, chunkSize: number, modelSpeed = 1000): number {
        const chunks = this.sectionText(text, { maxSectionSize: chunkSize });

        // Estimate based on words per minute for the model
        const totalWords = this.countWords(text);
        const estimatedMinutes = totalWords / modelSpeed;

        // Add overhead for chunk processing
        const overhead = chunks.length * 0.5; // 30 seconds per chunk overhead

        return Math.ceil(estimatedMinutes + overhead);
    }

    /**
     * Merge overlapping text ranges
     */
    static mergeOverlappingRanges(ranges: Array<{ start: number, end: number }>): Array<{ start: number, end: number }> {
        if (ranges.length === 0) return [];

        // Sort by start position
        const sorted = ranges.sort((a, b) => a.start - b.start);
        const merged: Array<{ start: number, end: number }> = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const last = merged[merged.length - 1];

            if (current.start <= last.end) {
                // Overlapping ranges, merge them
                last.end = Math.max(last.end, current.end);
            } else {
                // Non-overlapping, add as new range
                merged.push(current);
            }
        }

        return merged;
    }
}
