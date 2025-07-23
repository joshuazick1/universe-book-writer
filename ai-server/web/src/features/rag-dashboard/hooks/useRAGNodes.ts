
import { useEffect, useState } from 'react';
import { ragService, RAGNode } from '../../../services/ragService';

/**
 * useRAGNodes hook fetches all RAG nodes and provides CRUD helpers.
 */
export function useRAGNodes(universeId?: string) {
    const [nodes, setNodes] = useState<RAGNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all nodes on mount or universeId change
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ragService.getAllNodes(100)
            .then((all: RAGNode[]) => {
                const filtered = universeId
                    ? all.filter(n => n.universeId === universeId || n.metadata?.universeId === universeId)
                    : all;
                if (isMounted) setNodes(filtered);
            })
            .catch(e => { if (isMounted) setError(e.message || 'Failed to load nodes'); })
            .finally(() => { if (isMounted) setLoading(false); });
        return () => { isMounted = false; };
    }, [universeId]);

    // CRUD helpers
    const createNode = async (node: Omit<RAGNode, 'id' | 'timestamps'>) => {
        setLoading(true);
        try {
            const created = await ragService.createNode(node);
            setNodes(prev => [created, ...prev]);
            return created;
        } catch (e: any) {
            setError(e.message || 'Failed to create node');
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const updateNode = async (nodeId: string, updates: Partial<RAGNode>) => {
        setLoading(true);
        try {
            const updated = await ragService.updateNode(nodeId, updates);
            setNodes(prev => prev.map(n => n.id === nodeId ? updated : n));
            return updated;
        } catch (e: any) {
            setError(e.message || 'Failed to update node');
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const deleteNode = async (nodeId: string) => {
        setLoading(true);
        try {
            await ragService.deleteNode(nodeId);
            setNodes(prev => prev.filter(n => n.id !== nodeId));
        } catch (e: any) {
            setError(e.message || 'Failed to delete node');
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return { nodes, loading, error, createNode, updateNode, deleteNode };
}
