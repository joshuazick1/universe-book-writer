
/**
 * Timeline event type for useTimeline hook.
 */
export interface TimelineEvent {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly type: 'explicit' | 'inferred';
    readonly source: string;
    readonly description: string;
    readonly traceability?: string;
}

/**
 * Demo/sample data for timeline events. Replace with API data in production.
 */
const sampleEvents: TimelineEvent[] = [
    {
        id: '1',
        title: 'Battle of Alpha',
        date: '2201-03-15',
        type: 'explicit',
        source: 'Book 1, Ch. 3',
        description: 'The first major battle between the two factions.',
        traceability: 'Extracted from explicit date in text.',
    },
    {
        id: '2',
        title: 'Treaty Signed',
        date: '2201-06-01',
        type: 'inferred',
        source: 'Book 1, Ch. 7',
        description: 'Peace treaty signed after months of negotiation.',
        traceability: 'Date inferred from context and dialogue.',
    },
    {
        id: '3',
        title: 'Discovery of the Portal',
        date: '2202-01-10',
        type: 'explicit',
        source: 'Book 2, Ch. 2',
        description: 'A mysterious portal is discovered in the ruins.',
        traceability: 'Directly referenced in timeline.',
    },
];


import { useEffect, useState } from 'react';
import { ragService, RAGNode } from '../../../services/ragService';

/**
 * useTimeline hook fetches timeline_marker nodes from the backend.
 * Returns events with explicit/inferred markers and traceability info.
 */
export function useTimeline(universeId?: string) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ragService.getAllNodes(100)
            .then((nodes: RAGNode[]) => {
                // Filter for timeline_marker nodes, optionally by universe
                const filtered = nodes.filter(n =>
                    (n.type === 'timeline_marker' || n.nodeType === 'timeline_marker') &&
                    (!universeId || n.universeId === universeId || n.metadata?.universeId === universeId)
                );
                // Map to TimelineEvent
                const mapped: TimelineEvent[] = filtered.map(n => {
                    // Try to extract timeline fields from content, properties, or temporal
                    let date = '';
                    let inferred = false;
                    let traceability = undefined;
                    if (typeof n.content === 'object') {
                        date = (n.content as any).date || (typeof n.temporal?.startDate === 'string' ? n.temporal.startDate : (n.temporal?.startDate ? new Date(n.temporal.startDate).toISOString() : ''));
                        inferred = Boolean((n.content as any).inferred);
                        traceability = (n.content as any).traceability;
                    } else if (n.temporal?.startDate) {
                        date = typeof n.temporal.startDate === 'string' ? n.temporal.startDate : (n.temporal.startDate ? new Date(n.temporal.startDate).toISOString() : '');
                    }
                    return {
                        id: n.id,
                        title: n.title || n.properties?.name || 'Untitled',
                        date,
                        type: inferred ? 'inferred' : 'explicit',
                        source: n.metadata?.sourcePlugin || n.metadata?.universeId || '',
                        description: typeof n.content === 'object' && n.content?.description ? n.content.description : '',
                        traceability,
                    };
                });
                if (isMounted) setEvents(mapped);
            })
            .catch(e => {
                if (isMounted) setError(e.message || 'Failed to load timeline events');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [universeId]);

    return { events, loading, error };
}
