import React, { useEffect, useState } from 'react';
import useModelRecommendations from '../hooks/useModelRecommendations';
import { ModelRecommendation } from '../../../types/models';

/**
 * TextToRagNode Props
 * @param onModelSelect - Callback when a model is selected
 */
export interface TextToRagNodeProps {
    readonly onModelSelect?: (modelName: string) => void;
}

/**
 * TextToRagNode
 * UI for selecting a model for text-to-RAG-node conversion, with recommendations.
 * Fetches model recommendations and allows user selection.
 */
const TextToRagNode: React.FC<TextToRagNodeProps> = ({ onModelSelect }) => {
    const { recommendations, loading, error } = useModelRecommendations();
    const [selectedModel, setSelectedModel] = useState<string | null>(null);

    useEffect(() => {
        if (selectedModel && onModelSelect) {
            onModelSelect(selectedModel);
        }
    }, [selectedModel, onModelSelect]);

    return (
        <div className="p-4 bg-white rounded shadow max-w-lg mx-auto">
            <h3 className="text-lg font-semibold mb-2">Model Selection</h3>
            {loading && <div className="text-gray-500">Loading recommendations...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && recommendations.length > 0 && (
                <ul className="space-y-2 mb-4">
                    {recommendations.map((model: ModelRecommendation) => (
                        <li key={model.name}>
                            <button
                                className={`w-full text-left px-3 py-2 rounded border transition-colors ${selectedModel === model.name
                                    ? 'bg-blue-600 text-white border-blue-700'
                                    : 'bg-gray-50 hover:bg-blue-50 border-gray-200'
                                    }`}
                                onClick={() => setSelectedModel(model.name)}
                                aria-pressed={selectedModel === model.name}
                            >
                                <span className="font-medium">{model.friendlyName || model.name}</span>
                                {model.quality && (
                                    <span className="ml-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                        {model.quality}
                                    </span>
                                )}
                                {model.isRecommended && (
                                    <span className="ml-2 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                        Recommended
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {selectedModel && (
                <div className="text-sm text-gray-700">
                    Selected model: <span className="font-semibold">{selectedModel}</span>
                </div>
            )}
        </div>
    );
};

export default TextToRagNode;
