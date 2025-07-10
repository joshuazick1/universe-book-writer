/**
 * Sample Data Controller
 * Handles robust sample data population for RAG and chat testing.
 * Populates universes, characters, and chunked book text using the Text-to-RAG pipeline.
 */
import { Request, Response, RequestHandler } from 'express';

// Example sample book text (can be replaced with real public domain text)
const sampleBookText = `
Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world...

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people’s hats off—then, I account it high time to get to sea as soon as I can.`;

/**
 * POST /api/sample/populate
 * Populates the RAG database with robust sample universes, characters, and chunked book text.
 * Uses the Text-to-RAG pipeline for book ingestion.
 */
export const populateSampleData: RequestHandler = async (req: Request, res: Response) => {
    try {
        const results = {
            universes: [] as any[],
            characters: [] as any[],
            bookChunks: [] as any[],
            errors: [] as string[]
        };

        // Sample universes
        const sampleUniverses = [
            {
                nodeId: 'classic_lit_universe',
                nodeType: 'universe',
                title: 'Classic Literature Universe',
                content: 'A universe containing classic literary works and their characters.',
                properties: {
                    name: 'Classic Literature Universe',
                    description: 'A universe for classic books and their characters',
                    genre: 'literature',
                    timeFrame: 'various',
                    themes: ['adventure', 'tragedy', 'human nature']
                },
                tags: ['literature', 'classic', 'books'],
                universeId: 'classic_lit_universe'
            }
        ];

        // Sample characters
        const sampleCharacters = [
            {
                nodeId: 'ishmael',
                nodeType: 'character',
                title: 'Ishmael',
                content: 'The narrator and a sailor in Moby-Dick.',
                properties: {
                    name: 'Ishmael',
                    occupation: 'Sailor',
                    personality: 'Reflective, philosophical',
                    traits: ['reflective', 'philosophical', 'curious'],
                    archetype: 'The Observer',
                    motivations: ['adventure', 'understanding the world'],
                    fears: ['isolation', 'death'],
                    quirks: ['narrative digressions']
                },
                tags: ['moby-dick', 'sailor', 'narrator'],
                universeId: 'classic_lit_universe'
            }
        ];

        // Create universes in RAG
        for (const universe of sampleUniverses) {
            try {
                const response = await fetch('http://localhost:5100/api/rag/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(universe)
                });
                if (response.ok) {
                    const data = await response.json();
                    results.universes.push(data);
                } else {
                    const error = await response.text();
                    results.errors.push(`Failed to create universe ${universe.title}: ${error}`);
                }
            } catch (error) {
                results.errors.push(`Error creating universe ${universe.title}: ${error}`);
            }
        }


        // Create characters in RAG and give them temporal-aware memories
        for (const character of sampleCharacters) {
            try {
                const response = await fetch('http://localhost:5100/api/rag/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(character)
                });
                let characterData = null;
                if (response.ok) {
                    characterData = await response.json();
                    results.characters.push(characterData);
                } else {
                    const error = await response.text();
                    results.errors.push(`Failed to create character ${character.title}: ${error}`);
                }

                // Add temporal-aware memories for the character
                if (characterData && characterData.nodeId) {
                    const now = Date.now();
                    const memories = [
                        {
                            characterId: characterData.nodeId,
                            content: "Arrived in New Bedford and found lodging at the Spouter-Inn.",
                            type: "arrival",
                            importance: 0.8,
                            tags: ["arrival", "inn", "new bedford"],
                            timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                            emotional_impact: 0.6,
                            context: {
                                location: "Spouter-Inn",
                                participants: ["Ishmael", "landlord"],
                                situation: "Securing a room"
                            }
                        },
                        {
                            characterId: characterData.nodeId,
                            content: "Met Queequeg and agreed to share a room.",
                            type: "meeting",
                            importance: 0.9,
                            tags: ["meeting", "queequeg", "friendship"],
                            timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000), // 4 days ago
                            emotional_impact: 0.85,
                            context: {
                                location: "Spouter-Inn",
                                participants: ["Ishmael", "Queequeg"],
                                situation: "First encounter"
                            }
                        },
                        {
                            characterId: characterData.nodeId,
                            content: "Signed up for the whaling voyage on the Pequod.",
                            type: "decision",
                            importance: 0.95,
                            tags: ["decision", "voyage", "pequod"],
                            timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                            emotional_impact: 0.7,
                            context: {
                                location: "Pequod",
                                participants: ["Ishmael", "ship owners"],
                                situation: "Signing contract"
                            }
                        },
                        {
                            characterId: characterData.nodeId,
                            content: "Set sail and experienced the first storm at sea.",
                            type: "event",
                            importance: 0.88,
                            tags: ["storm", "sea", "voyage"],
                            timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                            emotional_impact: 0.9,
                            context: {
                                location: "Atlantic Ocean",
                                participants: ["Ishmael", "crew"],
                                situation: "Storm at sea"
                            }
                        }
                    ];
                    try {
                        const memResponse = await fetch(`http://localhost:5100/api/characters/${characterData.nodeId}/memories`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ memories })
                        });
                        if (!memResponse.ok) {
                            const error = await memResponse.text();
                            results.errors.push(`Failed to add memories for character ${character.title}: ${error}`);
                        }
                    } catch (memError) {
                        results.errors.push(`Error adding memories for character ${character.title}: ${memError}`);
                    }
                }
            } catch (error) {
                results.errors.push(`Error creating character ${character.title}: ${error}`);
            }
        }

        // Ingest sample book text using Text-to-RAG pipeline (chunked)
        try {
            const textToRagResponse = await fetch('http://localhost:5100/api/text-to-rag/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceText: sampleBookText,
                    options: {
                        useChunking: true,
                        chunkSize: 500,
                        model: 'llama3.1:8b',
                        universeId: 'classic_lit_universe',
                        autoCreateRAGNodes: true,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        userId: 'sample_populator'
                    }
                })
            });
            if (textToRagResponse.ok) {
                const ragJob = await textToRagResponse.json();
                results.bookChunks.push(ragJob);
            } else {
                const error = await textToRagResponse.text();
                results.errors.push(`Failed to ingest sample book text: ${error}`);
            }
        } catch (error) {
            results.errors.push(`Error ingesting sample book text: ${error}`);
        }

        res.json({
            success: true,
            message: 'Sample data population completed',
            results,
            summary: {
                universesCreated: results.universes.length,
                charactersCreated: results.characters.length,
                bookChunksIngested: results.bookChunks.length,
                errors: results.errors.length
            }
        });
    } catch (error) {
        console.error('Failed to populate sample data:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
