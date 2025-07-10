import React from "react";

/**
 * TimelineMarkers component for visualizing timeline_marker nodes.
 * @param nodes All nodes (filtered for dashboard)
 */
interface TimelineMarkersProps {
    nodes: any[];
}

/**
 * Returns a vertical timeline of timeline_marker nodes, distinguishing explicit and inferred dates.
 * Shows traceability for inferred markers.
 */
const TimelineMarkers: React.FC<TimelineMarkersProps> = ({ nodes }) => {
    // Filter for timeline_marker nodes
    const timelineMarkers = nodes.filter(
        (n) => (n.type || n.nodeType) === "timeline_marker"
    );
    if (timelineMarkers.length === 0) return null;

    // Sort by date if available, fallback to created timestamp
    const sorted = [...timelineMarkers].sort((a, b) => {
        const getDate = (n: any) => {
            if (typeof n.content === "object" && n.content?.date) return new Date(n.content.date).getTime();
            if (n.timestamps?.created) return new Date(n.timestamps.created).getTime();
            return 0;
        };
        return getDate(a) - getDate(b);
    });

    return (
        <div className="mb-8">
            <h4 className="font-semibold text-lg mb-2">Timeline</h4>
            <div className="relative border-l-2 border-blue-200 pl-6">
                {sorted.map((marker, idx) => {
                    const isInferred =
                        typeof marker.content === "object" && marker.content?.inferred === true;
                    const date =
                        typeof marker.content === "object" && marker.content?.date
                            ? marker.content.date
                            : marker.content?.label || marker.title || marker.id;
                    const label =
                        typeof marker.content === "object" && marker.content?.label
                            ? marker.content.label
                            : marker.title || "(No label)";
                    const trace =
                        typeof marker.content === "object" && marker.content?.trace;
                    return (
                        <div key={marker.id} className="mb-8 flex items-start group">
                            {/* Timeline dot */}
                            <span
                                className={`absolute -left-3 mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${isInferred ? "bg-yellow-100 border-yellow-400" : "bg-blue-100 border-blue-400"}
                `}
                                title={isInferred ? "Inferred date" : "Explicit date"}
                            >
                                {isInferred ? (
                                    <span className="text-yellow-500 text-lg" title="Inferred">★</span>
                                ) : (
                                    <span className="text-blue-500 text-lg" title="Explicit">●</span>
                                )}
                            </span>
                            <div className="ml-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-blue-800">{date}</span>
                                    {isInferred && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-1" title="Inferred date">Inferred</span>
                                    )}
                                    {!isInferred && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-1" title="Explicit date">Explicit</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-700 mt-1">{label}</div>
                                {isInferred && trace && (
                                    <div className="text-xs text-yellow-700 mt-1">
                                        Trace: {typeof trace === "string" ? trace : JSON.stringify(trace)}
                                    </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">ID: {marker.id}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-xs text-gray-500 mt-2">
                <span className="inline-block align-middle mr-2"><span className="text-blue-500">●</span> Explicit</span>
                <span className="inline-block align-middle"><span className="text-yellow-500">★</span> Inferred</span>
            </div>
        </div>
    );
};

export default TimelineMarkers;
