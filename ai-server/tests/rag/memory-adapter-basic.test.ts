import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { InMemoryRagAdapter } from '../../src/rag/adapters/memory.adapter.js';
import { RAGNode, RAGRelationship } from '../../src/rag/core/types.js';

describe('InMemoryRagAdapter - Basic Tests', () => {
    let adapter: InMemoryRagAdapter;

    beforeEach(async () => {
        adapter = new InMemoryRagAdapter();
        await adapter.initialize();
    });

    afterEach(async () => {
        await adapter.disconnect();
    });

    test('should initialize and disconnect properly', async () => {
        const newAdapter = new InMemoryRagAdapter();
        await newAdapter.initialize();
        await newAdapter.disconnect();
        // Should not throw
    });

    test('should store and retrieve a simple node', async () => {
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

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe('test-node-1');
        expect(retrieved?.title).toBe('Luke Skywalker');
    });

    test('should store and retrieve a simple relationship', async () => {
        // First create two nodes
        const node1: RAGNode = {
            id: 'node-1',
            type: 'character',
            title: 'Luke',
            content: { description: 'Jedi' },
            summaries: { brief: 'Jedi', medium: 'Jedi Knight', detailed: 'Luke Skywalker' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        const node2: RAGNode = {
            id: 'node-2',
            type: 'character',
            title: 'Vader',
            content: { description: 'Sith' },
            summaries: { brief: 'Sith', medium: 'Sith Lord', detailed: 'Darth Vader' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        await adapter.storeNode(node1);
        await adapter.storeNode(node2);

        const relationship: RAGRelationship = {
            id: 'test-rel-1',
            fromNodeId: 'node-1',
            toNodeId: 'node-2',
            type: 'character_interaction',
            weight: 0.9,
            metadata: {
                universeId: 'star-wars',
                description: 'Father-son relationship'
            },
            privacy: {
                encrypted: false,
                visibility: 'public'
            },
            timestamps: {
                created: new Date('2024-01-01'),
                modified: new Date('2024-01-01')
            }
        };

        await adapter.storeRelationship(relationship);
        const retrieved = await adapter.retrieveRelationship('test-rel-1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe('test-rel-1');
        expect(retrieved?.fromNodeId).toBe('node-1');
        expect(retrieved?.toNodeId).toBe('node-2');
    });

    test('should get relationships for a node', async () => {
        // Create nodes
        const node1: RAGNode = {
            id: 'graph-node-1',
            type: 'character',
            title: 'Luke',
            content: { description: 'Jedi' },
            summaries: { brief: 'Jedi', medium: 'Jedi Knight', detailed: 'Luke Skywalker' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        const node2: RAGNode = {
            id: 'graph-node-2',
            type: 'character',
            title: 'Vader',
            content: { description: 'Sith' },
            summaries: { brief: 'Sith', medium: 'Sith Lord', detailed: 'Darth Vader' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        await adapter.storeNode(node1);
        await adapter.storeNode(node2);

        // Create relationship
        const relationship: RAGRelationship = {
            id: 'graph-rel-1',
            fromNodeId: 'graph-node-1',
            toNodeId: 'graph-node-2',
            type: 'character_interaction',
            weight: 1.0,
            metadata: { universeId: 'star-wars' },
            privacy: { encrypted: false, visibility: 'public' },
            timestamps: { created: new Date(), modified: new Date() }
        };

        await adapter.storeRelationship(relationship);

        const relationships = await adapter.getNodeRelationships('graph-node-1');
        expect(relationships).toHaveLength(1);
        expect(relationships[0].id).toBe('graph-rel-1');
    });

    test('should search nodes by text', async () => {
        const node1: RAGNode = {
            id: 'search-node-1',
            type: 'character',
            title: 'Obi-Wan Kenobi',
            content: { description: 'Wise Jedi Master who trained Anakin and Luke' },
            summaries: { brief: 'Jedi Master', medium: 'Wise Jedi trainer', detailed: 'Obi-Wan Kenobi, wise Jedi Master' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: ['jedi', 'master'], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        const node2: RAGNode = {
            id: 'search-node-2',
            type: 'character',
            title: 'Yoda',
            content: { description: 'Ancient Jedi Master with great wisdom' },
            summaries: { brief: 'Jedi Master', medium: 'Ancient wise Jedi', detailed: 'Yoda, ancient Jedi Master' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: ['jedi', 'master'], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        await adapter.storeNode(node1);
        await adapter.storeNode(node2);

        const results = await adapter.searchNodes('Jedi Master');
        expect(results.length).toBeGreaterThan(0);

        const titles = results.map(n => n.title);
        expect(titles).toContain('Obi-Wan Kenobi');
        expect(titles).toContain('Yoda');
    });

    test('should handle delete operations', async () => {
        const node: RAGNode = {
            id: 'delete-test-node',
            type: 'location',
            title: 'Tatooine',
            content: { description: 'Desert planet' },
            summaries: { brief: 'Desert planet', medium: 'Twin-sun desert world', detailed: 'Tatooine desert planet' },
            embeddings: [],
            metadata: { universeId: 'star-wars', ownerId: 'user-1', sensitivity: 'public', tags: [], version: 1 },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: new Date(), modified: new Date() }
        };

        await adapter.storeNode(node);

        // Verify it was stored
        const retrieved = await adapter.retrieveNode('delete-test-node');
        expect(retrieved).toBeDefined();

        // Delete it
        await adapter.deleteNode('delete-test-node');

        // Verify it was deleted
        const afterDelete = await adapter.retrieveNode('delete-test-node');
        expect(afterDelete).toBeNull();
    });

    test('should track counts correctly', async () => {
        expect(adapter.getNodeCount()).toBe(0);
        expect(adapter.getRelationshipCount()).toBe(0);

        const node: RAGNode = {
            id: 'count-test-node',
            type: 'character',
            title: 'Test Character',
            content: { description: 'Test' },
            summaries: { brief: 'Test', medium: 'Test character', detailed: 'Test character for counting' },
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
