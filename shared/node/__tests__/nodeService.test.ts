/**
 * Unit tests for shared/node/nodeService
 *
 * @group shared-node
 */
import { ensureNode } from '../nodeService.js';
import type { NodeInput } from '../../types/nodeTypes.js';

describe('ensureNode', () => {
    it('creates a node with required fields', async () => {
        const input: NodeInput = {
            type: 'universe',
            title: 'Star Wars',
        };
        const node = await ensureNode(input);
        expect(node).toMatchObject({
            type: 'universe',
            title: 'Star Wars',
            parentId: null,
            metadata: {},
        });
        expect(typeof node.id).toBe('string');
        expect(typeof node.createdAt).toBe('string');
        expect(typeof node.updatedAt).toBe('string');
    });

    it('creates a node with parentId and metadata', async () => {
        const input: NodeInput = {
            type: 'book',
            title: 'Book 1',
            parentId: 'parent-123',
            metadata: { universeId: 'u1', genre: 'sci-fi' },
        };
        const node = await ensureNode(input);
        expect(node.parentId).toBe('parent-123');
        expect(node.metadata).toEqual({ universeId: 'u1', genre: 'sci-fi' });
    });

    it('generates unique ids for each node', async () => {
        const node1 = await ensureNode({ type: 'chapter', title: 'Ch 1' });
        const node2 = await ensureNode({ type: 'chapter', title: 'Ch 2' });
        expect(node1.id).not.toBe(node2.id);
    });

    it('sets createdAt and updatedAt to ISO strings', async () => {
        const node = await ensureNode({ type: 'note', title: 'T' });
        expect(() => new Date(node.createdAt)).not.toThrow();
        expect(() => new Date(node.updatedAt)).not.toThrow();
    });
});
