// Main orchestrator for the RAG System Dashboard
import React, { useState } from 'react';
import { RAGFilterProvider } from './RAGFilterBar';
import RAGFilterBar from './RAGFilterBar';
import TimelineView from './TimelineView';
import LoreBrowser from './LoreBrowser';
import DialogueExplorer from './DialogueExplorer';
import ThemeMoodChart from './ThemeMoodChart';
import NodeManager from './NodeManager';
import NodeSearch from './NodeSearch';
import TraceabilityPanel from './TraceabilityPanel';
import PipelineLog from './PipelineLog';
import KnowledgeGraphView from './KnowledgeGraphView';
import ObsidianGraphView from './ObsidianGraphView';
import UniversePluginPanel from './UniversePluginPanel';
import TextParserPanel from './TextParserPanel';
import { FileStoragePanel } from './FileStoragePanel';

import { useRAGFilter } from './RAGFilterBar';
import { runManualPostChunking } from '../../services/manualPostChunkingService';


const RAGDashboard: React.FC = () => {
    // For post-chunking UI feedback
    const [processing, setProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<any>(null);
    const [processError, setProcessError] = useState<string | null>(null);
    const { universe, book, chapter, character } = useRAGFilter();

    const handleManualPostChunking = async () => {
        setProcessing(true);
        setProcessError(null);
        setProcessResult(null);
        try {
            const result = await runManualPostChunking({
                universeId: universe || undefined,
                bookId: book || undefined,
                chapterId: chapter || undefined,
                characterId: character || undefined,
            });
            setProcessResult(result);
        } catch (e: any) {
            setProcessError(e.message || 'Failed to run post-chunking');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <RAGFilterProvider>
            <div className="flex flex-col h-full">
                <header className="p-4 bg-blue-900 text-white flex justify-between items-center">
                    <h1 className="text-2xl font-bold">RAG System Dashboard</h1>
                    <UniversePluginPanel />
                </header>
                <RAGFilterBar />
                {/* Manual Post-Chunking Button */}
                <div className="flex items-center gap-4 px-4 py-2 bg-blue-100 border-b border-blue-200">
                    <button
                        className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                        onClick={handleManualPostChunking}
                        disabled={processing || (!universe && !book)}
                        title="Run post-chunking steps for selected entities"
                    >
                        {processing ? 'Processing...' : 'Run Post-Chunking Steps'}
                    </button>
                    {processError && <span className="text-red-600 text-sm">{processError}</span>}
                    {processResult && (
                        <span className="text-green-700 text-sm">{typeof processResult === 'string' ? processResult : 'Done!'}</span>
                    )}
                </div>
                <main className="flex flex-1 overflow-hidden">
                    <aside className="w-80 bg-gray-50 p-4 overflow-y-auto">
                        <NodeSearch />
                        <NodeManager />
                        <PipelineLog />
                    </aside>
                    <section className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div>
                                <TimelineView />
                                <ThemeMoodChart />
                                <LoreBrowser />
                                <DialogueExplorer />
                                <KnowledgeGraphView />
                                <ObsidianGraphView />
                                <TraceabilityPanel />
                            </div>
                            <div>
                                {/* File upload/versioning and text-to-RAG pipeline */}
                                <FileStoragePanel />
                                <TextParserPanel />
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </RAGFilterProvider>
    );
};

export default RAGDashboard;
