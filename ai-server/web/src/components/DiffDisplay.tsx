import React from 'react';

/**
 * Props for DiffDisplay component.
 * @property before - The original text.
 * @property after - The suggested text.
 * @property onAccept - Handler for accepting the suggestion.
 * @property onRetry - Handler for retrying the suggestion.
 * @property onDisapprove - Handler for disapproving the suggestion.
 * @property reason - Optional reason/explanation for the suggestion.
 */
export interface DiffDisplayProps {
    before: string;
    after: string;
    onAccept: () => void;
    onRetry: () => void;
    onDisapprove: () => void;
    reason?: string;
}

/**
 * Simple inline diff display for text suggestions.
 * Highlights changes and provides accept/retry/disapprove controls.
 */
const DiffDisplay: React.FC<DiffDisplayProps> = ({ before, after, onAccept, onRetry, onDisapprove, reason }) => {
    // Simple diff: highlight added/removed lines (line-based)
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const maxLen = Math.max(beforeLines.length, afterLines.length);

    // Naive diff: show removed in red, added in green, unchanged normal
    const diffRows = [];
    for (let i = 0; i < maxLen; i++) {
        const b = beforeLines[i] ?? '';
        const a = afterLines[i] ?? '';
        if (b === a) {
            diffRows.push(
                <div key={i} className="text-gray-800">
                    {a}
                </div>
            );
        } else {
            if (b) {
                diffRows.push(
                    <div key={i + '-b'} className="bg-red-100 text-red-700 line-through">
                        {b}
                    </div>
                );
            }
            if (a) {
                diffRows.push(
                    <div key={i + '-a'} className="bg-green-100 text-green-700 font-semibold">
                        {a}
                    </div>
                );
            }
        }
    }

    return (
        <div className="border rounded p-2 bg-white mb-2">
            <div className="mb-2">
                <div className="font-bold text-xs text-gray-500 mb-1">AI Suggestion</div>
                {reason && <div className="text-xs text-gray-600 mb-1">Reason: {reason}</div>}
                <div className="text-xs text-gray-400 mb-1">Diff preview:</div>
                <div className="text-sm font-mono whitespace-pre-wrap">{diffRows}</div>
            </div>
            <div className="flex gap-2 mt-2">
                <button className="bg-green-600 text-white px-3 py-1 rounded text-xs" onClick={onAccept}>
                    Accept
                </button>
                <button className="bg-yellow-500 text-white px-3 py-1 rounded text-xs" onClick={onRetry}>
                    Retry
                </button>
                <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={onDisapprove}>
                    Disapprove
                </button>
            </div>
        </div>
    );
};

export default DiffDisplay;
