
import React, { useState } from 'react';
import { useTimeline } from './hooks/useTimeline';
import { useRAGFilter } from './RAGFilterBar';

/**
 * TimelineView displays a chronological view of events, chapters, or story beats.
 * Features:
 *  - Explicit/inferred markers (color/icon distinction)
 *  - Click-to-expand for event details
 *  - Traceability: show source, related nodes, and inference chain
 *
 * @example
 * <TimelineView />
 */
const TimelineView: React.FC = () => {
    const { universe, book, chapter, character } = useRAGFilter();
    // Pass universeId (and optionally book/chapter/character) to the hook
    const { events } = useTimeline(universe /*, book, chapter, character */);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!events || events.length === 0) {
        return (
            <section className="p-4 bg-white rounded shadow mb-4">
                <h2 className="text-xl font-semibold mb-2">Timeline</h2>
                <div className="text-gray-500">No events found.</div>
            </section>
        );
    }

    return (
        <section className="p-4 bg-white rounded shadow mb-4" aria-label="Timeline">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <ol className="relative border-l border-blue-300">
                {events.map(event => (
                    <li key={event.id} className="mb-8 ml-6">
                        <span
                            className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ${event.type === 'explicit' ? 'bg-blue-600 ring-blue-200' : 'bg-yellow-400 ring-yellow-100'
                                }`}
                            title={event.type === 'explicit' ? 'Explicit date' : 'Inferred date'}
                        >
                            {event.type === 'explicit' ? (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" /></svg>
                            ) : (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="3" /></svg>
                            )}
                        </span>
                        <div className="flex items-center justify-between">
                            <button
                                className="text-left focus:outline-none"
                                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                                aria-expanded={expandedId === event.id}
                                aria-controls={`event-details-${event.id}`}
                            >
                                <span className="font-medium text-blue-900">{event.title}</span>
                                <span className="ml-2 text-xs text-gray-500">{event.date}</span>
                                {event.type === 'inferred' && (
                                    <span className="ml-2 text-yellow-600 text-xs">(Inferred)</span>
                                )}
                            </button>
                            <span className="ml-4 text-xs text-gray-400">{event.source}</span>
                        </div>
                        {expandedId === event.id && (
                            <div
                                id={`event-details-${event.id}`}
                                className="mt-2 p-3 bg-blue-50 rounded border border-blue-100"
                            >
                                <div className="mb-1 text-sm text-gray-700">{event.description}</div>
                                {event.traceability && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        <strong>Traceability:</strong> {event.traceability}
                                    </div>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
};

export default TimelineView;
