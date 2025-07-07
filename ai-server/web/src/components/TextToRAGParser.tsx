import React, { useState, useEffect } from 'react';
import { ragService, type RAGNode } from '../services/ragService';

interface ParsedEntity {
    type: 'character' | 'location' | 'event' | 'lore' | 'plot_point' | 'organization' | 'object' | 'dialogue' | 'source_text';
    name: string;
    description: string;
    confidence: number;
    relationships?: Array<{
        target: string;
        type: string;
        description?: string;
    }>;
    metadata?: Record<string, any>;
}

interface ChunkAnalysis {
    summary: string;
    tags: string[];
    characters: string[];
    locations: string[];
    organizations: string[];
    objects: string[];
    themes: string[];
    mood: string;
    pov?: string;
    timelineAnchor?: string;
    dialogues?: Array<{
        speaker: string;
        quote: string;
    }>;
    unresolvedQuestions?: string[];
    settingDetails?: string;
}

interface JobStatus {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    type: string;
    universeId: string;
    userId: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    progress?: {
        current: number;
        total: number;
        currentChunk?: string;
    };
    error?: string;
}

interface TextToRAGParserProps {
    className?: string;
}

export const TextToRAGParser: React.FC<TextToRAGParserProps> = ({ className }) => {
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    const [inputText, setInputText] = useState('');
    const [universeId, setUniverseId] = useState('text-parser-universe');
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedEntities, setParsedEntities] = useState<ParsedEntity[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [createdNodes, setCreatedNodes] = useState<RAGNode[]>([]);
    const [simpleMode, setSimpleMode] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [useChunking, setUseChunking] = useState(false);
    const [chunkSize, setChunkSize] = useState(2000);
    const [processingProgress, setProcessingProgress] = useState<{
        current: number;
        total: number;
        currentChunk: string;
    } | null>(null);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [chunkAnalyses, setChunkAnalyses] = useState<ChunkAnalysis[]>([]);
    
    // New backend integration state
    const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
    const [useBackendParser, setUseBackendParser] = useState(true);
    const [jobPollingInterval, setJobPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Load models on component mount
    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoadingModels(true);
        setModelsError(null);
        try {
            const res = await fetch("http://localhost:5100/api/tags");
            if (!res.ok) throw new Error("Failed to fetch models");
            const data = await res.json();

            const modelNames = Array.isArray(data.models)
                ? data.models.map((m: any) => typeof m === "string" ? m : m.name)
                : [];
            modelNames.sort((a: string, b: string) => a.localeCompare(b));
            setModels(modelNames);
            setSelectedModel(modelNames.length > 0 ? modelNames[0] : "");
        } catch (e: any) {
            setModelsError(e.message || "Unknown error");
        } finally {
            setLoadingModels(false);
        }
    };

    // Backend integration functions
    const parseTextWithBackend = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to parse');
            return;
        }

        if (!selectedModel) {
            setError('Please select an AI model');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setParsedEntities([]);
        setProcessingProgress(null);
        setCurrentJob(null);

        try {
            // Determine whether to use sync or async endpoint
            const useSyncEndpoint = inputText.length <= 5000 && !useChunking;
            
            if (useSyncEndpoint) {
                await parseTextSync();
            } else {
                await parseTextAsync();
            }
        } catch (err) {
            setError(`Failed to parse text: ${err instanceof Error ? err.message : String(err)}`);
            setIsProcessing(false);
        }
    };

    const parseTextSync = async () => {
        try {
            const response = await fetch('http://localhost:5100/api/text-to-rag/parse-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceText: inputText,
                    options: {
                        useChunking,
                        chunkSize,
                        model: selectedModel,
                        universeId,
                        confidenceThreshold: 0.6,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        autoCreateRAGNodes: false, // We'll handle this in the frontend
                        userId: 'frontend-user'
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.results) {
                handleParsingResults(data.results);
            } else {
                throw new Error(data.error || 'Unexpected response format');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const parseTextAsync = async () => {
        try {
            const response = await fetch('http://localhost:5100/api/text-to-rag/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceText: inputText,
                    options: {
                        useChunking,
                        chunkSize,
                        model: selectedModel,
                        universeId,
                        confidenceThreshold: 0.6,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        autoCreateRAGNodes: false, // We'll handle this in the frontend
                        userId: 'frontend-user'
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.jobId) {
                await pollJobStatus(data.jobId);
            } else {
                throw new Error(data.error || 'Failed to start parsing job');
            }
        } catch (err) {
            setIsProcessing(false);
            throw err;
        }
    };

    const pollJobStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:5100/api/text-to-rag/job/${jobId}/status`);
                if (!response.ok) {
                    throw new Error(`Failed to get job status: HTTP ${response.status}`);
                }

                const data = await response.json();
                if (data.success && data.job) {
                    const job = data.job as JobStatus;
                    setCurrentJob(job);

                    // Update progress if available
                    if (job.progress) {
                        setProcessingProgress({
                            current: job.progress.current,
                            total: job.progress.total,
                            currentChunk: job.progress.currentChunk || ''
                        });
                    }

                    // Handle completed job
                    if (job.status === 'completed') {
                        clearInterval(interval);
                        setJobPollingInterval(null);
                        await fetchJobResults(jobId);
                        setIsProcessing(false);
                    } else if (job.status === 'failed') {
                        clearInterval(interval);
                        setJobPollingInterval(null);
                        setIsProcessing(false);
                        setError(job.error || 'Job failed with unknown error');
                    } else if (job.status === 'cancelled') {
                        clearInterval(interval);
                        setJobPollingInterval(null);
                        setIsProcessing(false);
                        setError('Job was cancelled');
                    }
                }
            } catch (err) {
                console.error('Error polling job status:', err);
                // Don't stop polling for network errors, but log them
            }
        }, 2000); // Poll every 2 seconds

        setJobPollingInterval(interval);
    };

    const fetchJobResults = async (jobId: string) => {
        try {
            const response = await fetch(`http://localhost:5100/api/text-to-rag/job/${jobId}/results`);
            if (!response.ok) {
                throw new Error(`Failed to get job results: HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.results) {
                handleParsingResults(data.results);
            } else {
                throw new Error(data.error || 'Failed to retrieve results');
            }
        } catch (err) {
            setError(`Failed to fetch results: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const handleParsingResults = (results: any) => {
        if (results.entities && Array.isArray(results.entities)) {
            const entities = results.entities as ParsedEntity[];
            setParsedEntities(entities);
            
            // Auto-select all entities by default
            setSelectedEntities(new Set(entities.map((_, index) => index)));

            // Log machine-readable output
            console.log('📊 RAG_ENTITIES_PARSED:', JSON.stringify({
                timestamp: new Date().toISOString(),
                inputLength: inputText.length,
                entitiesFound: {
                    total: entities.length
                },
                entityBreakdown: entities.reduce((acc: Record<string, number>, entity) => {
                    acc[entity.type] = (acc[entity.type] || 0) + 1;
                    return acc;
                }, {}),
                entities: entities.map((entity, index) => ({
                    index,
                    type: entity.type,
                    name: entity.name,
                    confidence: entity.confidence,
                    description: entity.description.substring(0, 100) + (entity.description.length > 100 ? '...' : '')
                }))
            }, null, 2));
        }

        if (results.ragNodes && Array.isArray(results.ragNodes)) {
            setCreatedNodes(results.ragNodes);
        }
    };

    const cancelCurrentJob = async () => {
        if (currentJob && currentJob.status === 'processing') {
            try {
                const response = await fetch(`http://localhost:5100/api/text-to-rag/job/${currentJob.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    if (jobPollingInterval) {
                        clearInterval(jobPollingInterval);
                        setJobPollingInterval(null);
                    }
                    setIsProcessing(false);
                    setCurrentJob(null);
                    setProcessingProgress(null);
                } else {
                    console.error('Failed to cancel job');
                }
            } catch (err) {
                console.error('Error cancelling job:', err);
            }
        }
    };

    // Cleanup effect for job polling
    useEffect(() => {
        return () => {
            if (jobPollingInterval) {
                clearInterval(jobPollingInterval);
            }
        };
    }, [jobPollingInterval]);

    const parseTextWithAI = async () => {
        if (useBackendParser) {
            await parseTextWithBackend();
        } else {
            await parseTextWithLocalAI();
        }
    };

    const parseTextWithLocalAI = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to parse');
            return;
        }

        if (!selectedModel) {
            setError('Please select an AI model');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setParsedEntities([]);
        setProcessingProgress(null);

        try {
            if (useChunking && inputText.length > chunkSize) {
                await parseTextInChunks();
            } else {
                await parseSingleText(inputText);
            }
        } catch (err) {
            setError(`Failed to parse text: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsProcessing(false);
            setProcessingProgress(null);
        }
    };

    const parseTextInChunks = async () => {
        const chunks = splitTextIntoChunks(inputText, chunkSize);
        const allEntities: ParsedEntity[] = [];
        const analyses: ChunkAnalysis[] = [];

        setProcessingProgress({ current: 0, total: chunks.length, currentChunk: '' });

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            setProcessingProgress({
                current: i + 1,
                total: chunks.length,
                currentChunk: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
            });

            try {
                if (advancedMode) {
                    const chunkAnalysis = await parseChunkWithAnalysis(chunk, i + 1, analyses);
                    analyses.push(chunkAnalysis);

                    // Convert analysis to entities and add source text node
                    const chunkEntities = convertAnalysisToEntities(chunkAnalysis, chunk, i + 1);
                    allEntities.push(...chunkEntities);
                } else {
                    const chunkEntities = await parseSingleText(chunk, i + 1);
                    allEntities.push(...chunkEntities);
                }

                // Small delay to prevent overwhelming the AI API
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (err) {
                console.warn(`Failed to parse chunk ${i + 1}:`, err);
                // Continue with other chunks even if one fails
            }
        }

        // Deduplicate entities by name (case-insensitive)
        const uniqueEntities = deduplicateEntities(allEntities);
        
        // Log machine-readable output for parsed entities
        console.log('📊 RAG_ENTITIES_PARSED:', JSON.stringify({
            timestamp: new Date().toISOString(),
            inputLength: inputText.length,
            chunksProcessed: chunks.length,
            entitiesFound: {
                raw: allEntities.length,
                unique: uniqueEntities.length
            },
            entityBreakdown: uniqueEntities.reduce((acc: Record<string, number>, entity) => {
                acc[entity.type] = (acc[entity.type] || 0) + 1;
                return acc;
            }, {}),
            entities: uniqueEntities.map((entity, index) => ({
                index,
                type: entity.type,
                name: entity.name,
                confidence: entity.confidence,
                chunks: entity.metadata?.mentionedIn || [],
                description: entity.description.substring(0, 100) + (entity.description.length > 100 ? '...' : '')
            }))
        }, null, 2));
        
        setParsedEntities(uniqueEntities);
        setChunkAnalyses(analyses);

        // Auto-select all entities by default
        setSelectedEntities(new Set(uniqueEntities.map((_, index) => index)));
    };

    const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
        if (text.length <= maxChunkSize) {
            return [text];
        }

        const chunks: string[] = [];
        let currentPos = 0;

        while (currentPos < text.length) {
            let chunkEnd = Math.min(currentPos + maxChunkSize, text.length);

            // If we're at the end of the text, take what's left
            if (chunkEnd >= text.length) {
                chunks.push(text.substring(currentPos));
                break;
            }

            // Look for chapter/section breaks first (highest priority)
            const chapterMarkers = [
                /\n\s*Chapter\s+\d+/gi,
                /\n\s*CHAPTER\s+\d+/gi,
                /\n\s*Section\s+\d+/gi,
                /\n\s*Part\s+\d+/gi,
                /\n\s*\*\s*\*\s*\*/gi, // Triple asterisk breaks
                /\n\s*---+/gi, // Dash breaks
                /\n\s*===+/gi  // Equal sign breaks
            ];

            let bestBreak = -1;
            for (const marker of chapterMarkers) {
                const matches = Array.from(text.substring(currentPos, chunkEnd).matchAll(marker));
                if (matches.length > 0) {
                    const lastMatch = matches[matches.length - 1];
                    const breakPos = currentPos + (lastMatch.index || 0);
                    if (breakPos > currentPos + maxChunkSize * 0.3) { // Don't break too early
                        bestBreak = breakPos;
                        break;
                    }
                }
            }

            // If no chapter break found, look for paragraph breaks
            if (bestBreak === -1) {
                const paragraphBreaks = text.substring(currentPos, chunkEnd).match(/\n\s*\n/g);
                if (paragraphBreaks) {
                    // Find the last paragraph break in the chunk
                    let searchPos = chunkEnd - 1;
                    while (searchPos > currentPos + maxChunkSize * 0.5) {
                        if (text.substring(searchPos, searchPos + 2) === '\n\n' ||
                            text.substring(searchPos, searchPos + 3) === '\n \n') {
                            bestBreak = searchPos;
                            break;
                        }
                        searchPos--;
                    }
                }
            }

            // If no paragraph break found, look for sentence breaks
            if (bestBreak === -1) {
                const sentenceEnders = /[.!?]\s+[A-Z]/g;
                const sentenceMatches = Array.from(text.substring(currentPos, chunkEnd).matchAll(sentenceEnders));
                if (sentenceMatches.length > 0) {
                    const lastSentence = sentenceMatches[sentenceMatches.length - 1];
                    const sentencePos = currentPos + (lastSentence.index || 0) + 1; // +1 to include the punctuation
                    if (sentencePos > currentPos + maxChunkSize * 0.5) {
                        bestBreak = sentencePos;
                    }
                }
            }

            // If no good break found, look for any whitespace
            if (bestBreak === -1) {
                let searchPos = chunkEnd - 1;
                while (searchPos > currentPos + maxChunkSize * 0.7) {
                    if (/\s/.test(text[searchPos])) {
                        bestBreak = searchPos;
                        break;
                    }
                    searchPos--;
                }
            }

            // Use the best break point we found, or fall back to max chunk size
            const actualEnd = bestBreak !== -1 ? bestBreak : chunkEnd;

            // Extract the chunk and trim whitespace
            const chunk = text.substring(currentPos, actualEnd).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // Move to the next position
            currentPos = actualEnd;

            // Skip any leading whitespace for the next chunk
            while (currentPos < text.length && /\s/.test(text[currentPos])) {
                currentPos++;
            }
        }

        return chunks.filter(chunk => chunk.trim().length > 0);
    };

    const parseSingleText = async (text: string, chunkNumber?: number): Promise<ParsedEntity[]> => {
        const prompt = simpleMode ? getSimplePrompt(text) : getComplexPrompt(text);

        const response = await fetch('http://localhost:5100/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: 'user', content: prompt }],
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error(`AI API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.message?.content || data.response || '';

        if (!aiResponse) {
            throw new Error('No response from AI model');
        }

        console.log(`Raw AI Response${chunkNumber ? ` (Chunk ${chunkNumber})` : ''}:`, aiResponse);

        // Parse AI response with robust error handling
        const entities = parseAIResponse(aiResponse);

        // Add chunk metadata if this is part of chunked processing
        if (chunkNumber) {
            entities.forEach(entity => {
                entity.metadata = {
                    ...entity.metadata,
                    sourceChunk: chunkNumber,
                    totalChunks: processingProgress?.total || 1
                };
            });
        } else {
            // Log for non-chunked processing
            console.log('📊 RAG_ENTITIES_PARSED:', JSON.stringify({
                timestamp: new Date().toISOString(),
                inputLength: text.length,
                chunksProcessed: 1,
                entitiesFound: {
                    raw: entities.length,
                    unique: entities.length
                },
                entityBreakdown: entities.reduce((acc: Record<string, number>, entity) => {
                    acc[entity.type] = (acc[entity.type] || 0) + 1;
                    return acc;
                }, {}),
                entities: entities.map((entity, index) => ({
                    index,
                    type: entity.type,
                    name: entity.name,
                    confidence: entity.confidence,
                    description: entity.description.substring(0, 100) + (entity.description.length > 100 ? '...' : '')
                }))
            }, null, 2));
        }

        return entities;
    };

    const parseChunkWithAnalysis = async (chunk: string, chunkNumber: number, previousAnalyses: ChunkAnalysis[]): Promise<ChunkAnalysis> => {
        const prompt = buildAdvancedPrompt(chunk, previousAnalyses);

        const response = await fetch('http://localhost:5100/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: 'user', content: prompt }],
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error(`AI API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.message?.content || data.response || '';

        if (!aiResponse) {
            throw new Error('No response from AI model');
        }

        console.log(`Raw AI Analysis Response (Chunk ${chunkNumber}):`, aiResponse);

        // Parse AI response
        return parseAnalysisResponse(aiResponse);
    };

    const buildAdvancedPrompt = (chunk: string, previousAnalyses: ChunkAnalysis[]): string => {
        const contextSummary = previousAnalyses.length > 0
            ? previousAnalyses.map((analysis, index) =>
                `Chunk ${index + 1}: ${analysis.summary} | Characters: ${analysis.characters.join(', ')} | Mood: ${analysis.mood}`
            ).join('\n')
            : 'No previous context';

        return `
You are an advanced narrative analysis AI. Analyze the following text chunk and extract comprehensive information.

${previousAnalyses.length > 0 ? `Previous context:\n${contextSummary}\n` : ''}

Text chunk to analyze:
"""${chunk}"""

Respond ONLY with a valid JSON object containing:
{
  "summary": "Brief 1-2 sentence summary",
  "tags": ["keyword1", "keyword2", "theme1"],
  "characters": ["Character Name 1", "Character Name 2"],
  "locations": ["Location 1", "Location 2"],
  "organizations": ["Organization 1", "Faction 2"],
  "objects": ["Artifact 1", "Technology 2"],
  "themes": ["redemption", "betrayal", "discovery"],
  "mood": "tense/hopeful/tragic/mysterious/action-packed",
  "pov": "Character Name or third-person",
  "timelineAnchor": "Year 2387/Chapter 3/Three days later",
  "dialogues": [{"speaker": "Character", "quote": "Important dialogue"}],
  "unresolvedQuestions": ["Mystery 1", "Plot thread 2"],
  "settingDetails": "Weather, time of day, atmosphere description"
}

CRITICAL: All arrays (tags, characters, locations, organizations, objects, themes, unresolvedQuestions) MUST contain only simple strings, NOT objects or null values. 
For example: "characters": ["John Smith", "Mary Johnson"] NOT [{"name": "John Smith"}, {"name": "Mary Johnson"}]
For example: "objects": ["Sword", "Shield"] NOT ["Sword", null] or ["Sword", {"name": "Shield"}]
Extract what's present, use empty arrays/null for missing elements.`;
    };

    const parseAnalysisResponse = (aiResponse: string): ChunkAnalysis => {
        let cleanResponse = aiResponse.trim();

        // Remove common AI response prefixes/suffixes
        cleanResponse = cleanResponse.replace(/^(Here's the analysis:|```json|```)/gi, '');
        cleanResponse = cleanResponse.replace(/(```|Here's the result:)$/gi, '');
        cleanResponse = cleanResponse.trim();

        // Fix common JSON issues before parsing
        cleanResponse = fixMalformedJson(cleanResponse);

        try {
            const parsed = JSON.parse(cleanResponse);

            // Helper function to extract strings from mixed arrays (objects or strings)
            const extractStrings = (arr: any[]): string[] => {
                if (!Array.isArray(arr)) return [];
                return arr.filter(item => {
                    // Skip null, undefined, or empty values
                    return item !== null && item !== undefined && item !== '';
                }).map(item => {
                    if (typeof item === 'string') return item.trim();
                    if (typeof item === 'object' && item !== null) {
                        // Try multiple common name properties
                        const name = item.name || item.title || item.character || item.location || item.organization;
                        if (name && typeof name === 'string') return name.trim();
                        
                        // If it's a more complex object, try to extract the first string value
                        const values = Object.values(item);
                        const firstString = values.find(v => typeof v === 'string' && v.trim().length > 0);
                        if (firstString) return String(firstString).trim();
                        
                        // Fall back to string conversion
                        return String(item).trim();
                    }
                    return String(item).trim();
                }).filter(str => str && str.length > 0 && str !== '[object Object]' && str !== 'null' && str !== 'undefined');
            };

            return {
                summary: parsed.summary || 'No summary provided',
                tags: extractStrings(parsed.tags || []),
                characters: extractStrings(parsed.characters || []),
                locations: extractStrings(parsed.locations || []),
                organizations: extractStrings(parsed.organizations || []),
                objects: extractStrings(parsed.objects || []),
                themes: extractStrings(parsed.themes || []),
                mood: parsed.mood || 'neutral',
                pov: parsed.pov || undefined,
                timelineAnchor: parsed.timelineAnchor || undefined,
                dialogues: Array.isArray(parsed.dialogues) ? 
                    parsed.dialogues.filter((d: any) => 
                        d && 
                        typeof d === 'object' && 
                        d.speaker && 
                        d.quote &&
                        typeof d.speaker === 'string' &&
                        typeof d.quote === 'string' &&
                        d.speaker.trim().length > 0 && 
                        d.quote.trim().length > 0
                    ) : [],
                unresolvedQuestions: extractStrings(parsed.unresolvedQuestions || []),
                settingDetails: typeof parsed.settingDetails === 'object' && parsed.settingDetails !== null ? 
                    (() => {
                        // Handle object settingDetails by extracting useful text
                        const details = parsed.settingDetails;
                        const parts: string[] = [];
                        
                        if (details.atmosphere) parts.push(details.atmosphere);
                        if (details.time_of_day) parts.push(details.time_of_day);
                        if (details.weather) parts.push(details.weather);
                        if (details.description) parts.push(details.description);
                        
                        // If we have specific parts, join them
                        if (parts.length > 0) return parts.filter(Boolean).join(', ');
                        
                        // Otherwise, try to extract any string values
                        const values = Object.values(details);
                        const stringValues = values.filter(v => typeof v === 'string' && v.trim().length > 0);
                        return stringValues.length > 0 ? stringValues.join(', ') : undefined;
                    })() : 
                    (typeof parsed.settingDetails === 'string' ? parsed.settingDetails : undefined)
            };
        } catch (error) {
            console.warn('Failed to parse analysis response, using fallback:', error);
            return {
                summary: aiResponse.substring(0, 200) + '...',
                tags: [],
                characters: [],
                locations: [],
                organizations: [],
                objects: [],
                themes: [],
                mood: 'neutral',
                dialogues: [],
                unresolvedQuestions: []
            };
        }
    };

    const convertAnalysisToEntities = (analysis: ChunkAnalysis, originalText: string, chunkNumber: number): ParsedEntity[] => {
        const entities: ParsedEntity[] = [];

        // Add source text node
        entities.push({
            type: 'source_text',
            name: `Text Chunk ${chunkNumber}`,
            description: analysis.summary,
            confidence: 1.0,
            metadata: {
                originalText,
                sourceChunk: chunkNumber,
                totalChunks: processingProgress?.total || 1,
                tags: analysis.tags,
                mood: analysis.mood,
                pov: analysis.pov,
                timelineAnchor: analysis.timelineAnchor,
                settingDetails: analysis.settingDetails,
                themes: analysis.themes
            }
        });

        // Convert characters
        analysis.characters.forEach(char => {
            // Ensure char is a string
            const charName = typeof char === 'string' ? char : String(char || 'Unknown Character');
            const isPovChar = analysis.pov === charName;
            const description = `Character appearing in chunk ${chunkNumber}${isPovChar ? ' (POV character)' : ''}. ${analysis.summary || ''}`.trim();

            entities.push({
                type: 'character',
                name: charName,
                description: description,
                confidence: 0.8,
                metadata: {
                    sourceChunk: chunkNumber,
                    isPovCharacter: isPovChar,
                    mentionedIn: [chunkNumber],
                    chunkSummary: analysis.summary,
                    mood: analysis.mood,
                    timelineAnchor: analysis.timelineAnchor,
                    associatedThemes: analysis.themes,
                    associatedLocations: analysis.locations
                }
            });
        });

        // Convert locations
        analysis.locations.forEach(loc => {
            // Ensure loc is a string
            const locName = typeof loc === 'string' ? loc : String(loc || 'Unknown Location');
            const description = `Location in chunk ${chunkNumber}${analysis.settingDetails ? `. Setting: ${analysis.settingDetails}` : ''}${analysis.summary ? `. Context: ${analysis.summary}` : ''}`.trim();

            entities.push({
                type: 'location',
                name: locName,
                description: description,
                confidence: 0.8,
                metadata: {
                    sourceChunk: chunkNumber,
                    settingDetails: analysis.settingDetails,
                    mentionedIn: [chunkNumber],
                    chunkSummary: analysis.summary,
                    mood: analysis.mood,
                    timelineAnchor: analysis.timelineAnchor,
                    associatedCharacters: analysis.characters,
                    associatedThemes: analysis.themes
                }
            });
        });

        // Convert organizations
        analysis.organizations.forEach(org => {
            // Ensure org is a string
            const orgName = typeof org === 'string' ? org : String(org || 'Unknown Organization');
            const description = `Organization or faction in chunk ${chunkNumber}${analysis.summary ? `. Context: ${analysis.summary}` : ''}`.trim();

            entities.push({
                type: 'organization',
                name: orgName,
                description: description,
                confidence: 0.7,
                metadata: {
                    sourceChunk: chunkNumber,
                    mentionedIn: [chunkNumber],
                    chunkSummary: analysis.summary,
                    associatedCharacters: analysis.characters,
                    associatedLocations: analysis.locations,
                    timelineAnchor: analysis.timelineAnchor
                }
            });
        });

        // Convert objects/artifacts
        analysis.objects.forEach(obj => {
            // Ensure obj is a string
            const objName = typeof obj === 'string' ? obj : String(obj || 'Unknown Object');
            const description = `Object, artifact, or technology in chunk ${chunkNumber}${analysis.summary ? `. Context: ${analysis.summary}` : ''}`.trim();

            entities.push({
                type: 'object',
                name: objName,
                description: description,
                confidence: 0.7,
                metadata: {
                    sourceChunk: chunkNumber,
                    mentionedIn: [chunkNumber],
                    chunkSummary: analysis.summary,
                    associatedCharacters: analysis.characters,
                    associatedLocations: analysis.locations,
                    timelineAnchor: analysis.timelineAnchor
                }
            });
        });

        // Convert dialogues
        if (analysis.dialogues && Array.isArray(analysis.dialogues)) {
            analysis.dialogues.forEach((dialogue, index) => {
                // Skip dialogues with null, undefined, or empty quotes or speakers
                if (!dialogue ||
                    typeof dialogue !== 'object' ||
                    !dialogue.quote ||
                    !dialogue.speaker ||
                    typeof dialogue.quote !== 'string' ||
                    typeof dialogue.speaker !== 'string' ||
                    dialogue.quote.trim() === '' ||
                    dialogue.speaker.trim() === '') {
                    console.warn(`Skipping invalid dialogue at index ${index}:`, dialogue);
                    return;
                }

                const safeQuote = String(dialogue.quote).trim();
                const safeSpeaker = String(dialogue.speaker).trim();

                entities.push({
                    type: 'dialogue',
                    name: `${safeSpeaker}: "${safeQuote.substring(0, 50)}${safeQuote.length > 50 ? '...' : ''}"`,
                    description: `Dialogue by ${safeSpeaker}: "${safeQuote}"`,
                    confidence: 0.9,
                    metadata: {
                        sourceChunk: chunkNumber,
                        speaker: safeSpeaker,
                        fullQuote: safeQuote,
                        dialogueIndex: index
                    }
                });
            });
        }

        // Add lore entries for themes and unresolved questions
        if (analysis.themes && analysis.themes.length > 0) {
            entities.push({
                type: 'lore',
                name: `Themes - Chunk ${chunkNumber}`,
                description: `Thematic elements: ${analysis.themes.join(', ')}`,
                confidence: 0.6,
                metadata: {
                    sourceChunk: chunkNumber,
                    themes: analysis.themes,
                    type: 'themes'
                }
            });
        }

        if (analysis.unresolvedQuestions && analysis.unresolvedQuestions.length > 0) {
            entities.push({
                type: 'plot_point',
                name: `Unresolved Questions - Chunk ${chunkNumber}`,
                description: `Open plot threads: ${analysis.unresolvedQuestions.join('; ')}`,
                confidence: 0.7,
                metadata: {
                    sourceChunk: chunkNumber,
                    unresolvedQuestions: analysis.unresolvedQuestions,
                    type: 'mysteries'
                }
            });
        }

        return entities;
    };

    const deduplicateEntities = (entities: ParsedEntity[]): ParsedEntity[] => {
        const seen = new Map<string, ParsedEntity>();

        for (const entity of entities) {
            // Ensure entity.name is a string
            const entityName = typeof entity.name === 'string' ? entity.name : String(entity.name || 'Unnamed');
            const key = `${entity.type}:${entityName.toLowerCase()}`;

            if (seen.has(key)) {
                const existing = seen.get(key)!;

                // Merge entities with more sophisticated logic
                const merged: ParsedEntity = {
                    ...existing,
                    // Use higher confidence
                    confidence: Math.max(existing.confidence, entity.confidence),
                    // Merge descriptions intelligently
                    description: mergeDescriptions(existing.description, entity.description),
                    // Merge metadata
                    metadata: mergeMetadata(existing.metadata, entity.metadata, entity.type)
                };

                seen.set(key, merged);
            } else {
                seen.set(key, entity);
            }
        }

        return Array.from(seen.values());
    };

    const mergeDescriptions = (desc1: string, desc2: string): string => {
        // Remove redundant "mentioned in chunk X" parts for cleaner merging
        const clean1 = desc1.replace(/mentioned in chunk \d+/gi, '').trim();
        const clean2 = desc2.replace(/mentioned in chunk \d+/gi, '').trim();

        // Don't duplicate identical descriptions
        if (clean1 === clean2) return clean1;

        // Combine with separator
        const combined = `${clean1} | ${clean2}`;
        return combined.length > 500 ? combined.substring(0, 497) + '...' : combined;
    };

    const mergeMetadata = (meta1: any = {}, meta2: any = {}, entityType: string): any => {
        const merged = { ...meta1 };

        // Merge chunk tracking
        const chunks1 = meta1.mentionedIn || [meta1.sourceChunk].filter(Boolean);
        const chunks2 = meta2.mentionedIn || [meta2.sourceChunk].filter(Boolean);
        merged.mentionedIn = [...new Set([...chunks1, ...chunks2])].sort((a, b) => a - b);

        // For characters, merge special attributes
        if (entityType === 'character') {
            merged.isPovCharacter = meta1.isPovCharacter || meta2.isPovCharacter;
            if (meta2.isPovCharacter) {
                merged.povInChunks = [...(merged.povInChunks || []), meta2.sourceChunk];
            }
        }

        // For locations, merge setting details
        if (entityType === 'location') {
            const settings = [meta1.settingDetails, meta2.settingDetails].filter(Boolean);
            if (settings.length > 0) {
                merged.settingDetails = settings.join(' | ');
            }
        }

        // Merge themes and tags
        if (meta1.themes && meta2.themes) {
            merged.themes = [...new Set([...meta1.themes, ...meta2.themes])];
        }
        if (meta1.tags && meta2.tags) {
            merged.tags = [...new Set([...meta1.tags, ...meta2.tags])];
        }

        return merged;
    };

    const getSimplePrompt = (text: string) => `
You must extract entities from this text and return ONLY a valid JSON array. 

CRITICAL: Your response must be ONLY the JSON array - no explanations, no markdown, no extra text.

Each entity must have exactly these fields:
- type: "character", "location", "event", "lore", "plot_point", "organization", "object", or "dialogue"  
- name: entity name
- description: brief description
- confidence: number between 0 and 1

Example format:
[
  {
    "type": "character",
    "name": "John Smith",
    "description": "A brave soldier",
    "confidence": 0.9
  }
]

Text to analyze: "${text}"

JSON array:`;

    const getComplexPrompt = (text: string) => `
Extract narrative elements from this text. Return ONLY a valid JSON array - no other text.

Required fields for each entity:
- type: "character", "location", "event", "lore", "plot_point", "organization", "object", or "dialogue"
- name: clear name
- description: detailed description  
- confidence: number 0-1

Optional fields:
- relationships: array of {target: string, type: string, description?: string}
- metadata: object with extra properties (include aliases/nicknames for characters if mentioned)

Entity types:
- character: people, beings, creatures
- location: places, planets, buildings
- event: actions, battles, discoveries
- lore: background info, history, culture
- plot_point: story developments, conflicts
- organization: factions, governments, groups
- object: artifacts, technologies, weapons
- dialogue: important quotes or conversations

Text: "${text}"

Return only JSON array:`;

    const fixMalformedJson = (jsonString: string): string => {
        let fixed = jsonString;
        
        // Fix missing commas between JSON properties - this is a common AI error
        // Look for patterns like: ] "propertyName": or } "propertyName":
        fixed = fixed.replace(/(\]|\})\s*("[^"]+"\s*:)/g, '$1,$2');
        
        // Fix unquoted array values like [Seredyn Al'Vareth, Laenya] -> ["Seredyn Al'Vareth", "Laenya"]
        // But skip arrays that contain objects (have curly braces)
        fixed = fixed.replace(/\[([^\]]+)\]/g, (match, content) => {
            // Skip if already properly quoted, empty, or contains objects
            if (!content.trim() || content.includes('"') || content.includes('{')) return match;
            
            // Split by commas and quote each item
            const items = content.split(',').map((item: string) => {
                const trimmed = item.trim();
                // Skip if already quoted, null, or empty
                if (trimmed.startsWith('"') || trimmed === 'null' || !trimmed) {
                    return trimmed;
                }
                return `"${trimmed}"`;
            });
            
            return `[${items.join(', ')}]`;
        });
        
        // Fix other common JSON issues
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        fixed = fixed.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys
        
        // Fix specific issues with timeline anchors that have brackets or special characters
        fixed = fixed.replace(/"timelineAnchor":\s*"([^"]*)\[([^\]]*)\]([^"]*)"/, '"timelineAnchor": "$1($2)$3"');
        
        // Fix issues with missing quotes around complex strings that contain special characters
        fixed = fixed.replace(/:\s*([^",\{\[\]}\s][^",\}\]]*[^",\{\[\]}\s])\s*([,\}])/g, ': "$1"$2');
        
        // Fix issues where object arrays in strings aren't properly escaped
        fixed = fixed.replace(/"\s*\[\s*\{[^}]*\}\s*\]/g, (match) => {
            // If we have an object array in a string value, escape it properly
            return '"' + match.slice(1).replace(/"/g, '\\"');
        });
        
        // Fix missing commas after string values before next property
        // Pattern: "value" "nextProperty": should be "value", "nextProperty":
        fixed = fixed.replace(/("\s*)\s+("[^"]+"\s*:)/g, '$1, $2');
        
        return fixed;
    };

    const parseAIResponse = (aiResponse: string): ParsedEntity[] => {
        // Clean and prepare the response
        let cleanResponse = aiResponse.trim();

        // Remove common AI response prefixes/suffixes
        cleanResponse = cleanResponse.replace(/^(Here's the JSON array:|Here are the entities:|```json|```)/gi, '');
        cleanResponse = cleanResponse.replace(/(```|Here's the result:)$/gi, '');
        cleanResponse = cleanResponse.trim();

        // Fix common issue: AI returns objects without array wrapper
        if (cleanResponse.startsWith('{') && !cleanResponse.startsWith('[')) {
            // Count braces to find where first object ends
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < cleanResponse.length; i++) {
                const char = cleanResponse[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;

                    // If we've closed the first object, check what comes next
                    if (braceCount === 0 && i < cleanResponse.length - 1) {
                        const remaining = cleanResponse.substring(i + 1).trim();
                        // If there's another object following, wrap everything in array
                        if (remaining.startsWith(',') || remaining.startsWith('{')) {
                            cleanResponse = '[' + cleanResponse + ']';
                            console.log('Fixed missing array wrapper');
                            break;
                        }
                        // If it's just one object, wrap it
                        else if (remaining === '') {
                            cleanResponse = '[' + cleanResponse + ']';
                            console.log('Wrapped single object in array');
                            break;
                        }
                    }
                }
            }
        }

        // Try multiple JSON extraction strategies
        const jsonExtractionMethods = [
            // Method 1: Extract complete array with greedy matching
            () => {
                const match = cleanResponse.match(/\[[\s\S]*\]/);
                return match ? match[0] : null;
            },

            // Method 2: Find array bounds more carefully
            () => {
                const startIndex = cleanResponse.indexOf('[');
                if (startIndex === -1) return null;

                let openBrackets = 0;
                let endIndex = -1;

                for (let i = startIndex; i < cleanResponse.length; i++) {
                    if (cleanResponse[i] === '[') openBrackets++;
                    if (cleanResponse[i] === ']') openBrackets--;
                    if (openBrackets === 0) {
                        endIndex = i;
                        break;
                    }
                }

                return endIndex !== -1 ? cleanResponse.substring(startIndex, endIndex + 1) : null;
            },

            // Method 3: Extract line by line for malformed JSON
            () => {
                const lines = cleanResponse.split('\n');
                const jsonLines = [];
                let inArray = false;

                for (const line of lines) {
                    if (line.trim().startsWith('[')) inArray = true;
                    if (inArray) {
                        jsonLines.push(line);
                        if (line.trim().endsWith(']')) break;
                    }
                }

                return jsonLines.length > 0 ? jsonLines.join('\n') : null;
            },

            // Method 4: Handle objects that should be arrays
            () => {
                // If no brackets found but we have objects, try to parse as object sequence
                if (!cleanResponse.includes('[') && cleanResponse.includes('{')) {
                    // Split by }, { pattern and try to reconstruct
                    const objectStrings = cleanResponse.split(/},\s*{/);
                    if (objectStrings.length > 1) {
                        // Reconstruct as proper array
                        const fixedObjects = objectStrings.map((obj, index) => {
                            let fixed = obj.trim();
                            if (index > 0 && !fixed.startsWith('{')) fixed = '{' + fixed;
                            if (index < objectStrings.length - 1 && !fixed.endsWith('}')) fixed = fixed + '}';
                            return fixed;
                        });
                        return '[' + fixedObjects.join(', ') + ']';
                    }
                }
                return null;
            }
        ];

        // Try each JSON extraction method
        for (let i = 0; i < jsonExtractionMethods.length; i++) {
            try {
                const jsonString = jsonExtractionMethods[i]();
                if (!jsonString) continue;

                // Clean the JSON string
                let cleanJson = jsonString.trim();

                // Fix common JSON issues
                cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
                cleanJson = cleanJson.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys
                cleanJson = cleanJson.replace(/:\s*'([^']*?)'/g, ': "$1"'); // Replace single quotes with double quotes

                const entities = JSON.parse(cleanJson);

                if (!Array.isArray(entities)) {
                    throw new Error('Parsed result is not an array');
                }

                // Validate and clean entities
                const validEntities = entities.map((entity, index) => {
                    if (!entity || typeof entity !== 'object') {
                        throw new Error(`Entity ${index} is not an object`);
                    }

                    const validTypes = ['character', 'location', 'event', 'lore', 'plot_point', 'organization', 'object', 'dialogue'];
                    const type = validTypes.includes(entity.type) ? entity.type : 'lore';

                    return {
                        type,
                        name: String(entity.name || `Unnamed ${type} ${index + 1}`),
                        description: String(entity.description || 'No description provided'),
                        confidence: Math.min(Math.max(Number(entity.confidence) || 0.5, 0), 1),
                        relationships: Array.isArray(entity.relationships) ? entity.relationships : undefined,
                        metadata: entity.metadata || {}
                    };
                });

                console.log(`Successfully parsed JSON using method ${i + 1}:`, validEntities);
                return validEntities;

            } catch (parseError) {
                console.warn(`JSON extraction method ${i + 1} failed:`, parseError);
                continue;
            }
        }

        // If all JSON methods fail, try manual extraction
        console.warn('All JSON parsing methods failed, attempting manual extraction');
        return extractEntitiesManually(aiResponse);
    };

    const extractEntitiesManually = (text: string): ParsedEntity[] => {
        const entities: ParsedEntity[] = [];
        const lines = text.split('\n').filter(line => line.trim());

        // Look for patterns like "Name:" or "- Name:"
        let currentEntity: Partial<ParsedEntity> | null = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines or obvious non-content
            if (!trimmed || trimmed.length < 3) continue;

            // Look for entity type indicators
            if (trimmed.toLowerCase().includes('character') ||
                trimmed.toLowerCase().includes('person') ||
                trimmed.toLowerCase().includes('being')) {
                currentEntity = { type: 'character', confidence: 0.7 };
            } else if (trimmed.toLowerCase().includes('location') ||
                trimmed.toLowerCase().includes('place')) {
                currentEntity = { type: 'location', confidence: 0.7 };
            } else if (trimmed.toLowerCase().includes('event') ||
                trimmed.toLowerCase().includes('battle') ||
                trimmed.toLowerCase().includes('meeting')) {
                currentEntity = { type: 'event', confidence: 0.7 };
            } else if (trimmed.toLowerCase().includes('lore') ||
                trimmed.toLowerCase().includes('history') ||
                trimmed.toLowerCase().includes('culture')) {
                currentEntity = { type: 'lore', confidence: 0.7 };
            }

            // Extract name and description from the line
            if (trimmed.includes(':')) {
                const [key, ...valueParts] = trimmed.split(':');
                const value = valueParts.join(':').trim();

                if (key.toLowerCase().includes('name') && currentEntity) {
                    currentEntity.name = value;
                } else if ((key.toLowerCase().includes('description') ||
                    key.toLowerCase().includes('detail')) && currentEntity) {
                    currentEntity.description = value;
                }
            }

            // If we have a complete entity, add it
            if (currentEntity?.name && currentEntity?.description) {
                entities.push({
                    type: currentEntity.type || 'lore',
                    name: currentEntity.name,
                    description: currentEntity.description,
                    confidence: currentEntity.confidence || 0.5
                });
                currentEntity = null;
            }
        }

        // If no entities found, create a general lore entry
        if (entities.length === 0) {
            entities.push({
                type: 'lore',
                name: 'General Information',
                description: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
                confidence: 0.3
            });
        }

        return entities;
    };

    const createSelectedNodes = async () => {
        if (selectedEntities.size === 0) {
            setError('Please select at least one entity to create');
            return;
        }

        setIsProcessing(true);
        setError(null);
        const newNodes: RAGNode[] = [];

        try {
            for (const index of selectedEntities) {
                const entity = parsedEntities[index];
                if (!entity) continue;

                const nodeData = {
                    type: entity.type,
                    content: {
                        name: entity.name,
                        description: entity.description,
                        aiGenerated: true,
                        confidence: entity.confidence,
                        ...entity.metadata
                    },
                    metadata: {
                        universeId: universeId,
                        title: entity.name,
                        description: entity.description,
                        tags: ['ai-generated', 'text-parser', entity.type],
                        sensitivity: 'low' as const,
                        aiGenerated: true,
                        extractionConfidence: entity.confidence
                    }
                };

                const createdNode = await ragService.createNode(nodeData);
                newNodes.push(createdNode);
            }

            // Log machine-readable output for the created nodes
            console.log('🎯 RAG_NODES_CREATED:', JSON.stringify({
                timestamp: new Date().toISOString(),
                universeId: universeId,
                totalNodes: newNodes.length,
                nodeTypes: newNodes.reduce((acc: Record<string, number>, node) => {
                    acc[node.type] = (acc[node.type] || 0) + 1;
                    return acc;
                }, {}),
                nodes: newNodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    name: node.content?.name || node.metadata?.title || 'Unnamed',
                    description: node.content?.description || node.metadata?.description || '',
                    confidence: node.content?.confidence || 0,
                    chunks: node.content?.mentionedIn || [],
                    metadata: {
                        aiGenerated: node.metadata?.aiGenerated,
                        extractionConfidence: node.metadata?.extractionConfidence,
                        tags: node.metadata?.tags
                    }
                }))
            }, null, 2));

            setCreatedNodes(prev => [...newNodes, ...prev]);
            setParsedEntities([]);
            setSelectedEntities(new Set());

        } catch (err) {
            setError(`Failed to create nodes: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleEntitySelection = (index: number) => {
        const newSelected = new Set(selectedEntities);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedEntities(newSelected);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getTypeColor = (type: string) => {
        const colors = {
            character: 'bg-blue-100 text-blue-800',
            location: 'bg-green-100 text-green-800',
            event: 'bg-purple-100 text-purple-800',
            lore: 'bg-orange-100 text-orange-800',
            plot_point: 'bg-red-100 text-red-800',
            organization: 'bg-yellow-100 text-yellow-800',
            object: 'bg-indigo-100 text-indigo-800',
            dialogue: 'bg-pink-100 text-pink-800',
            source_text: 'bg-gray-100 text-gray-800'
        };
        return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const sampleText = `Commander Elena Vasquez leads the research station Aurora Base on the ice moon of Titan. The base houses advanced terraforming equipment designed to convert frozen methane into breathable atmosphere.

Dr. James Chen discovered the Resonance Crystal deep in Titan's subsurface caves. This mysterious artifact emits energy patterns that accelerate plant growth by 300%.

The first Contact Protocol was established when alien signals were detected from the Proxima Centauri system. The transmission contained mathematical sequences that suggested advanced intelligence.

The Great Exodus refers to humanity's mass migration from Earth in 2387 due to climate catastrophe. Over 2 billion people were relocated to orbital habitats and moon colonies.`;

    return (
        <div className={`p-6 ${className}`}>
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Text to RAG Parser</h2>
                <p className="text-gray-600 mb-4">
                    Parse narrative text using AI to automatically extract characters, locations, events, lore, and plot points.
                </p>

                {/* Help Section */}
                <div className="mb-4">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        {showHelp ? 'Hide Help' : 'Show Help & Sample'}
                    </button>

                    {showHelp && (
                        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                            <h4 className="font-medium text-blue-900 mb-2">How to Use:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 mb-3">
                                <li>• Paste or type narrative text in the text area</li>
                                <li>• Select an AI model and parsing mode</li>
                                <li>• For large texts, enable intelligent chunked processing</li>
                                <li>• Enable Advanced Analysis for comprehensive extraction</li>
                                <li>• Click "Parse Text" to extract entities</li>
                                <li>• Review and select entities to create as RAG nodes</li>
                                <li>• Simple Mode is more reliable but less detailed</li>
                                <li>• Smart chunking preserves context at chapter, paragraph, and sentence boundaries</li>
                            </ul>

                            <h4 className="font-medium text-blue-900 mb-2">Advanced Analysis Features:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 mb-3">
                                <li>• <strong>Dialogue Extraction:</strong> Captures important quotes and conversations</li>
                                <li>• <strong>Timeline Anchors:</strong> Detects dates, times, and sequence markers</li>
                                <li>• <strong>Organizations:</strong> Identifies factions, governments, and groups</li>
                                <li>• <strong>Objects:</strong> Extracts artifacts, technologies, and weapons</li>
                                <li>• <strong>Themes & Mood:</strong> Analyzes emotional tone and recurring motifs</li>
                                <li>• <strong>POV Tracking:</strong> Identifies perspective character</li>
                                <li>• <strong>Source Text:</strong> Preserves original chunks with AI summaries</li>
                                <li>• <strong>Unresolved Questions:</strong> Tracks mysteries and open plot threads</li>
                            </ul>

                            <h4 className="font-medium text-blue-900 mb-2">Smart Chunking Features:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 mb-3">
                                <li>• Automatically detects chapter/section breaks</li>
                                <li>• Splits at paragraph boundaries first</li>
                                <li>• Falls back to sentence boundaries if needed</li>
                                <li>• Preserves narrative coherence and context</li>
                                <li>• Handles dialogue and complex punctuation</li>
                            </ul>

                            <h4 className="font-medium text-blue-900 mb-2">Sample Text:</h4>
                            <div className="bg-white p-3 rounded border text-sm">                            <button
                                onClick={() => setInputText(sampleText)}
                                className="mb-2 px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs"
                            >
                                Use This Sample
                            </button>
                                <button
                                    onClick={() => {
                                        const testJson = `[
  {
    "type": "character",
    "name": "Test Character",
    "description": "A test character for JSON parsing",
    "confidence": 0.9
  },
  {
    "type": "location", 
    "name": "Test Location",
    "description": "A test location",
    "confidence": 0.8
  }
]`;
                                        console.log('Testing JSON parsing with known good data');
                                        try {
                                            const testEntities = parseAIResponse(testJson);
                                            setParsedEntities(testEntities);
                                            setSelectedEntities(new Set([0, 1]));
                                        } catch (err) {
                                            setError(`Test parsing failed: ${err instanceof Error ? err.message : String(err)}`);
                                        }
                                    }}
                                    className="mb-2 ml-2 px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-xs"
                                >
                                    Test Parser
                                </button>
                                <p className="text-gray-700">{sampleText.substring(0, 200)}...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Universe ID
                        </label>
                        <input
                            type="text"
                            value={universeId}
                            onChange={(e) => setUniverseId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="text-parser-universe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Model
                        </label>
                        {loadingModels ? (
                            <span className="text-gray-500 text-sm">Loading models...</span>
                        ) : modelsError ? (
                            <span className="text-red-500 text-sm">{modelsError}</span>
                        ) : (
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={models.length === 0}
                            >
                                {models.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Parsing Mode
                        </label>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    checked={simpleMode}
                                    onChange={() => setSimpleMode(true)}
                                    className="mr-2"
                                />
                                <span className="text-sm">Simple</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    checked={!simpleMode}
                                    onChange={() => setSimpleMode(false)}
                                    className="mr-2"
                                />
                                <span className="text-sm">Detailed</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Processing Mode
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={useChunking}
                                    onChange={(e) => setUseChunking(e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm">Enable Chunking</span>
                            </label>
                            {useChunking && (
                                <input
                                    type="number"
                                    value={chunkSize}
                                    onChange={(e) => setChunkSize(Math.max(500, Math.min(5000, parseInt(e.target.value) || 2000)))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="Chunk size"
                                    min="500"
                                    max="5000"
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Analysis Mode
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={advancedMode}
                                    onChange={(e) => setAdvancedMode(e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm">Advanced Analysis</span>
                            </label>
                            {advancedMode && (
                                <div className="text-xs text-gray-500">
                                    Extracts dialogue, themes, mood, POV, timeline anchors
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Text Input */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Text to Parse
                        </label>
                        <div className="text-xs text-gray-500">
                            {inputText.length} characters
                            {useChunking && inputText.length > chunkSize && (
                                <span className="ml-2 text-blue-600">
                                    (Will be split into ~{Math.ceil(inputText.length / chunkSize)} chunks)
                                </span>
                            )}
                        </div>
                    </div>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your narrative text here... The AI will extract characters, locations, events, lore, and plot points."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={8}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={parseTextWithAI}
                        disabled={isProcessing || !selectedModel || !inputText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            processingProgress ?
                                `Processing ${processingProgress.current}/${processingProgress.total}...` :
                                'Parsing...'
                        ) : 'Parse Text'}
                    </button>

                    {parsedEntities.length > 0 && (
                        <button
                            onClick={createSelectedNodes}
                            disabled={isProcessing || selectedEntities.size === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Creating...' : `Create ${selectedEntities.size} Selected Nodes`}
                        </button>
                    )}
                </div>

                {/* Processing Progress */}
                {processingProgress && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-900 font-medium">
                                Processing chunk {processingProgress.current} of {processingProgress.total}
                            </span>
                            <span className="text-blue-700 text-sm">
                                {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                            </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        <div className="text-blue-800 text-xs">
                            Current chunk: {processingProgress.currentChunk}
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 font-semibold">Error:</p>
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Parsed Entities */}
            {parsedEntities.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Parsed Entities ({parsedEntities.length})</h3>
                    <div className="space-y-3">
                        {parsedEntities.map((entity, index) => (
                            <div key={index} className="border border-gray-200 rounded-md p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedEntities.has(index)}
                                            onChange={() => toggleEntitySelection(index)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entity.type)}`}>
                                                    {entity.type}
                                                </span>
                                                <span className={`text-sm font-medium ${getConfidenceColor(entity.confidence)}`}>
                                                    {Math.round(entity.confidence * 100)}% confidence
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-gray-900 mb-1">{entity.name}</h4>
                                            <p className="text-gray-700 text-sm">{entity.description}</p>
                                            {entity.metadata?.sourceChunk && (
                                                <div className="mt-1 text-xs text-gray-500">
                                                    From chunk {entity.metadata.sourceChunk} of {entity.metadata.totalChunks}
                                                </div>
                                            )}
                                            {/* Advanced metadata display */}
                                            {entity.metadata?.mood && (
                                                <div className="mt-1 text-xs text-blue-600">
                                                    Mood: {entity.metadata.mood}
                                                </div>
                                            )}
                                            {entity.metadata?.pov && (
                                                <div className="mt-1 text-xs text-green-600">
                                                    POV: {entity.metadata.pov}
                                                </div>
                                            )}
                                            {entity.metadata?.timelineAnchor && (
                                                <div className="mt-1 text-xs text-purple-600">
                                                    Timeline: {entity.metadata.timelineAnchor}
                                                </div>
                                            )}
                                            {entity.metadata?.themes && entity.metadata.themes.length > 0 && (
                                                <div className="mt-1 text-xs text-orange-600">
                                                    Themes: {entity.metadata.themes.join(', ')}
                                                </div>
                                            )}
                                            {entity.metadata?.speaker && (
                                                <div className="mt-1 text-xs text-pink-600">
                                                    Speaker: {entity.metadata.speaker}
                                                </div>
                                            )}
                                            {entity.relationships && entity.relationships.length > 0 && (
                                                <div className="mt-2">
                                                    <span className="text-xs font-medium text-gray-500">Relationships:</span>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        {entity.relationships.map((rel, relIndex) => (
                                                            <div key={relIndex}>
                                                                {rel.type} → {rel.target}
                                                                {rel.description && `: ${rel.description}`}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        {selectedEntities.size} of {parsedEntities.length} entities selected
                    </div>
                </div>
            )}

            {/* Created Nodes */}
            {createdNodes.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Created Nodes ({createdNodes.length})</h3>
                    <div className="space-y-3">
                        {createdNodes.map((node) => (
                            <div key={node.id} className="border border-green-200 bg-green-50 rounded-md p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(node.type)}`}>
                                        {node.type}
                                    </span>
                                    <span className="text-green-600 text-sm">✅ Created</span>
                                </div>
                                <h4 className="font-medium text-gray-900 mb-1">{node.metadata.title}</h4>
                                <p className="text-gray-700 text-sm">{node.content.description}</p>
                                <div className="text-xs text-gray-500 mt-2">
                                    ID: {node.id} | Universe: {node.metadata.universeId}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {parsedEntities.length === 0 && createdNodes.length === 0 && !isProcessing && (
                <div className="text-center py-8 text-gray-500">
                    <p>Enter some text and click "Parse Text" to extract entities.</p>
                </div>
            )}
        </div>
    );
};
