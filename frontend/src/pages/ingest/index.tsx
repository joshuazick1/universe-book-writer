// frontend/src/pages/ingest/index.tsx
/**
 * IngestPage
 * Handles text ingestion, SSE event handling, and model selection UI.
 * Integrates with PipelineStatus and model recommendations.
 *
 * @module IngestPage
 */
import React, { useState } from 'react';
import { PipelineStatus } from 'shared/components';

// import { useModelRecommendations } from 'shared/hooks';
import { usePipelineSSE } from './usePipelineSSE';

const SSE_URL = '/api/rag/pipeline-events';

const IngestPage: React.FC = () => {
    const [input, setInput] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // const { recommendations, loading: recLoading } = useModelRecommendations();
    const tasks = usePipelineSSE(SSE_URL, submitted);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/rag/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input }),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to ingest text');
            }
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Ingest Text</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    className="w-full border rounded p-2 min-h-[120px]"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Paste or type your text here..."
                    required
                    disabled={loading}
                />
                {/* Model selection UI (optional, can use recommendations) */}
                {/* <div>
          <label className="block font-medium mb-1">Model Selection</label>
          {recLoading ? (
            <span>Loading recommendations...</span>
          ) : (
            <select className="border rounded p-1">
              {recommendations.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          )}
        </div> */}
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? 'Ingesting...' : 'Ingest'}
                </button>
                {error && <div className="text-red-600 text-sm">{error}</div>}
            </form>
            {submitted && (
                <div>
                    <h2 className="text-lg font-semibold mb-2">Pipeline Progress</h2>
                    <PipelineStatus tasks={tasks} />
                </div>
            )}
        </div>
    );
};

export default IngestPage;
