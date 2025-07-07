import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { InMemoryRagAdapter } from '../../src/rag/adapters/memory.adapter.js';
import { RAGNode, RAGRelationship } from '../../src/rag/core/types.js';

describe('InMemoryRagAdapter', () => {
    let adapter: InMemoryRagAdapter;

    beforeEach(async () => {
        adapter = new InMemoryRagAdapter();
        await adapter.initialize();
    });

    afterEach(async () => {
        await adapter.disconnect();
    });

    describe('Node operations', () => {
        test('should store and retrieve a node', async () => {
            const node: RAGNode = {
                id: 'test-node-1',
                type: 'character',
                title: 'Luke Skywalker',
                content: {
                    description: 'Young Jedi Knight from Tatooine'
                },
                summaries: {
                    brief: 'Jedi Knight',
                    medium: 'Young Jedi from Tatooine',
                    detailed: 'Luke Skywalker is a young Jedi Knight who played a crucial role in the destruction of the Death Star'
                },
                embeddings: [0.1, 0.2, 0.3],
                metadata: {
                    universeId: 'star-wars',
                    ownerId: 'user-1',
                    sensitivity: 'public',
                    tags: ['jedi', 'hero'],
                    version: 1
                },
                privacy: {
                    encrypted: false,
                    shareable: true
                },
                timestamps: {
                    created: new Date('2024-01-01'),
                    modified: new Date('2024-01-01')
                }
            };

            await adapter.storeNode(node);
            const retrieved = await adapter.retrieveNode('test-node-1');

            expect(retrieved).toEqual(node);
        });

        test('should update a node', async () => {
            const node: RAGNode = {
                id: 'test-node-2',
                type: 'character',
                title: 'Darth Vader',
                content: {
                    description: 'Fallen Jedi turned Sith Lord'
                },
                summaries: {
                    brief: 'Sith Lord',
                    medium: 'Fallen Jedi, now Sith',
                    detailed: 'Anakin Skywalker who fell to the dark side and became Darth Vader'
                },
                embeddings: [0.4, 0.5, 0.6],
                metadata: {
                    universeId: 'star-wars',
                    ownerId: 'user-1',
                    sensitivity: 'public',
                    tags: ['sith', 'villain'],
                    version: 1
                },
                privacy: {
                    encrypted: false,
                    shareable: true
                },
                timestamps: {
                    created: new Date('2024-01-01'),
                    modified: new Date('2024-01-01')
                }
            };

            await adapter.storeNode(node);

            const updatedNode = {
                ...node,
                content: {
                    description: 'Redeemed Sith Lord who saved his son'
                },
                metadata: {
                    ...node.metadata,
                    tags: ['sith', 'villain', 'redeemed']
                }
            };

            await adapter.updateNode(updatedNode);
            const retrieved = await adapter.retrieveNode('test-node-2');

            expect(retrieved?.content.description).toBe('Redeemed Sith Lord who saved his son');
            expect(retrieved?.metadata.tags).toContain('redeemed');
        });

        test('should delete a node', async () => {
            const node: RAGNode = {
                id: 'test-node-3',
                type: 'location',
                title: 'Tatooine',
                content: {
                    description: 'Desert planet with twin suns'
                },
                summaries: {
                    brief: 'Desert planet',
                    medium: 'Twin-sun desert world',
                    detailed: 'Tatooine is a desert planet in the Outer Rim with twin suns'
                },
                embeddings: [0.7, 0.8, 0.9],
                metadata: {
                    universeId: 'star-wars',
                    ownerId: 'user-1',
                    sensitivity: 'public',
                    tags: ['planet', 'desert'],
                    version: 1
                },
                privacy: {
                    encrypted: false,
                    shareable: true
                },
                timestamps: {
                    created: new Date('2024-01-01'),
                    modified: new Date('2024-01-01')
                }
            };

            await adapter.storeNode(node);
            await adapter.deleteNode('test-node-3');

            const retrieved = await adapter.retrieveNode('test-node-3');
            expect(retrieved).toBeNull();
        });
    });

    describe('Relationship operations', () => {
        test('should store and retrieve a relationship', async () => {
            const relationship: RAGRelationship = {
                id: 'test-rel-1',
                fromNodeId: 'luke',
                toNodeId: 'vader',
                type: 'family',
                weight: 0.9,
                metadata: {
                    universeId: 'star-wars',
                    ownerId: 'user-1',
                    sensitivity: 'public',
                    tags: ['father-son'],
                    version: 1
                },
                temporal: {
                    startDate: new Date('1977-05-25'),
                    timeline: 'Episode IV'
                },
                privacy: {
                    encrypted: false,
                    shareable: true
                },
                timestamps: {
                    created: new Date('2024-01-01'),
                    modified: new Date('2024-01-01')
                }
            };

            await adapter.storeRelationship(relationship);
            const retrieved = await adapter.retrieveRelationship('test-rel-1');

            expect(retrieved).toEqual(relationship);
        });

        test('should get relationships for a node', async () => {
            // Create nodes first
            const luke: RAGNode = {
                id: 'luke-node',
                type: 'character',
                title: 'Luke Skywalker',
                content: { description: 'Jedi Knight' },
                summaries: { brief: 'Jedi', medium: 'Jedi Knight', detailed: 'Luke Skywalker, Jedi Knight' },
                embeddings: [],
                metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                privacy: { encrypted: false, shareable: true },
                timestamps: { created: new Date(), modified: new Date() }
            };

            const vader: RAGNode = {
                id: 'vader-node',
                type: 'character',
                title: 'Darth Vader',
                content: { description: 'Sith Lord' },
                summaries: { brief: 'Sith', medium: 'Sith Lord', detailed: 'Darth Vader, Sith Lord' },
                embeddings: [],
                metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                privacy: { encrypted: false, shareable: true },
                timestamps: { created: new Date(), modified: new Date() }
            };

            await adapter.storeNode(luke);
            await adapter.storeNode(vader);

            // Create relationship
            const relationship: RAGRelationship = {
                id: 'luke-vader-rel',
                fromNodeId: 'luke-node',
                toNodeId: 'vader-node',
                type: 'family',
                weight: 0.9,
                metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                privacy: { encrypted: false, shareable: true },
                timestamps: { created: new Date(), modified: new Date() }
            };

            await adapter.storeRelationship(relationship);

            const relationships = await adapter.getNodeRelationships('luke-node');
            expect(relationships).toHaveLength(1);
            expect(relationships[0].id).toBe('luke-vader-rel');
        });
    });

    describe('Search operations', () => {
        beforeEach(async () => {
            // Add some test data
            const nodes: RAGNode[] = [
                {
                    id: 'search-node-1',
                    type: 'character',
                    title: 'Obi-Wan Kenobi',
                    content: { description: 'Wise Jedi Master who trained Anakin and Luke' },
                    summaries: { brief: 'Jedi Master', medium: 'Wise Jedi trainer', detailed: 'Obi-Wan Kenobi, wise Jedi Master' },
                    embeddings: [0.1, 0.9, 0.1],
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: ['jedi', 'master'], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                },
                {
                    id: 'search-node-2',
                    type: 'character',
                    title: 'Yoda',
                    content: { description: 'Ancient Jedi Master with great wisdom' },
                    summaries: { brief: 'Jedi Master', medium: 'Ancient wise Jedi', detailed: 'Yoda, ancient Jedi Master' },
                    embeddings: [0.2, 0.8, 0.2],
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: ['jedi', 'master', 'ancient'], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                }
            ];

            for (const node of nodes) {
                await adapter.storeNode(node);
            }
        });

        test('should search nodes by text', async () => {
            const results = await adapter.searchNodes('Jedi Master');
            expect(results).toHaveLength(2);
            expect(results.map(n => n.title)).toContain('Obi-Wan Kenobi');
            expect(results.map(n => n.title)).toContain('Yoda');
        });

        test('should search nodes with filters', async () => {
            const results = await adapter.searchNodes('Jedi', { 'metadata.tags': 'ancient' });
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('Yoda');
        });

        test('should search by embedding similarity', async () => {
            const queryEmbedding = [0.25, 0.75, 0.25]; // Closer to Yoda's embedding [0.2, 0.8, 0.2]
            const results = await adapter.searchByEmbedding(queryEmbedding, 2);

            expect(results.nodes).toHaveLength(2);
            expect(results.scores).toHaveLength(2);
            // Yoda should have higher similarity score with this query vector
            expect(results.nodes[0].title).toBe('Yoda');
        });
    });

    describe('Graph traversal', () => {
        beforeEach(async () => {
            // Create a small graph: Luke -> Vader -> Palpatine
            const nodes: RAGNode[] = [
                {
                    id: 'luke-graph',
                    type: 'character',
                    title: 'Luke',
                    content: { description: 'Jedi' },
                    summaries: { brief: 'Jedi', medium: 'Jedi Knight', detailed: 'Luke Skywalker' },
                    embeddings: [],
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                },
                {
                    id: 'vader-graph',
                    type: 'character',
                    title: 'Vader',
                    content: { description: 'Sith' },
                    summaries: { brief: 'Sith', medium: 'Sith Lord', detailed: 'Darth Vader' },
                    embeddings: [],
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                },
                {
                    id: 'palpatine-graph',
                    type: 'character',
                    title: 'Palpatine',
                    content: { description: 'Emperor' },
                    summaries: { brief: 'Emperor', medium: 'Sith Emperor', detailed: 'Emperor Palpatine' },
                    embeddings: [],
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                }
            ];

            const relationships: RAGRelationship[] = [
                {
                    id: 'luke-vader-graph',
                    fromNodeId: 'luke-graph',
                    toNodeId: 'vader-graph',
                    type: 'family',
                    weight: 1.0,
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                },
                {
                    id: 'vader-palpatine-graph',
                    fromNodeId: 'vader-graph',
                    toNodeId: 'palpatine-graph',
                    type: 'apprentice',
                    weight: 0.8,
                    metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: new Date(), modified: new Date() }
                }
            ];

            for (const node of nodes) {
                await adapter.storeNode(node);
            }
            for (const rel of relationships) {
                await adapter.storeRelationship(rel);
            }
        });

        test('should get connected nodes within distance', async () => {
            const result = await adapter.getConnectedNodes('luke-graph', 2);

            expect(result.nodes).toHaveLength(3); // Luke, Vader, Palpatine
            expect(result.relationships).toHaveLength(2);
            expect(result.distances.get('luke-graph')).toBe(0);
            expect(result.distances.get('vader-graph')).toBe(1);
            expect(result.distances.get('palpatine-graph')).toBe(2);
        });

        test('should limit by distance', async () => {
            const result = await adapter.getConnectedNodes('luke-graph', 1);

            expect(result.nodes).toHaveLength(2); // Luke, Vader only
            expect(result.distances.get('palpatine-graph')).toBeUndefined();
        });
    });

    describe('Utility methods', () => {
        test('should track node and relationship counts', () => {
            expect(adapter.getNodeCount()).toBe(0);
            expect(adapter.getRelationshipCount()).toBe(0);
        });

        test('should clear all data', async () => {
            const node: RAGNode = {
                id: 'test-clear',
                type: 'character',
                title: 'Test',
                content: { description: 'Test node' },
                summaries: { brief: 'Test', medium: 'Test node', detailed: 'Test node for clearing' },
                embeddings: [],
                metadata: { universeId: 'test', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
                privacy: { encrypted: false, shareable: true },
                timestamps: { created: new Date(), modified: new Date() }
            };

            await adapter.storeNode(node);
            expect(adapter.getNodeCount()).toBe(1);

            adapter.clear();
            expect(adapter.getNodeCount()).toBe(0);
        });
    });
});
