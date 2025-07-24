import React from 'react';

/**
 * Props for ContextScopeIndicator component.
 * @property scope - The current context scope (e.g., universe name, book title, etc.)
 * @property onClear - Optional handler to clear the scope (e.g., broaden search)
 */
export interface ContextScopeIndicatorProps {
    scope: string;
    onClear?: () => void;
}

/**
 * ContextScopeIndicator displays the current context scope for the AI helper/chat UI.
 * Shows a pill with the scope and an optional clear/broaden button.
 */
const ContextScopeIndicator: React.FC<ContextScopeIndicatorProps> = ({ scope, onClear }) => {
    if (!scope) return null;
    return (
        <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                Context: {scope}
            </span>
            {onClear && (
                <button
                    className="text-xs text-blue-600 underline hover:text-blue-800 focus:outline-none"
                    onClick={onClear}
                    aria-label="Clear context scope"
                >
                    Broaden Search
                </button>
            )}
        </div>
    );
};

export default ContextScopeIndicator;
