
/**
 * LoreNode type for useLore hook.
 */
export interface LoreNode {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly tag: string;
    readonly related?: string[];
}

/**
 * Demo/sample data for lore nodes. Replace with API data in production.
 */
const sampleLoreNodes: LoreNode[] = [
    {
        id: 'l1',
        title: 'The Lost City of Veyra',
        summary: 'A legendary city said to hold the secrets of the ancients.',
        tag: 'Location',
        related: ['2201-03-15', 'Battle of Alpha'],
    },
    {
        id: 'l2',
        title: 'Order of the Silver Star',
        summary: 'A secretive order influencing galactic politics for centuries.',
        tag: 'Faction',
        related: ['Treaty Signed'],
    },
    {
        id: 'l3',
        title: 'The Portal Prophecy',
        summary: 'A prophecy foretelling the discovery of a portal and its consequences.',
        tag: 'Lore',
        related: ['Discovery of the Portal'],
    },
];


import { useEffect, useState } from 'react';
import { ragService, RAGNode } from '../../../services/ragService';

/**
 * useLore hook fetches lore nodes from the backend.
 * Returns nodes of type 'lore', 'myth', 'legend', 'prophecy', etc.
 */
export function useLore(universeId?: string) {
    const [loreNodes, setLoreNodes] = useState<LoreNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ragService.getAllNodes(100)
            .then((nodes: RAGNode[]) => {
                // Filter for lore-related nodes, optionally by universe
                const loreTypes = ['lore', 'myth', 'legend', 'prophecy', 'age', 'cycle'];
                const filtered = nodes.filter(n =>
                    (loreTypes.includes(n.type || '') || loreTypes.includes(n.nodeType || '')) &&
                    (!universeId || n.universeId === universeId || n.metadata?.universeId === universeId)
                );
                // Map to LoreNode
                const mapped: LoreNode[] = filtered.map(n => {
                    let related: string[] = [];
                    if (typeof n.content === 'object' && Array.isArray((n.content as any).related)) {
                        related = (n.content as any).related;
                    } else if (Array.isArray((n as any).related)) {
                        related = (n as any).related;
                    }
                    return {
                        id: n.id,
                        title: n.title || n.properties?.name || 'Untitled',
                        summary: typeof n.content === 'object' && n.content?.description ? n.content.description : (typeof n.content === 'string' ? n.content : ''),
                        tag: n.type || n.nodeType || 'lore',
                        related,
                    };
                });
                if (isMounted) setLoreNodes(mapped);
            })
            .catch(e => {
                if (isMounted) setError(e.message || 'Failed to load lore nodes');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [universeId]);

    return { loreNodes, loading, error };
}
