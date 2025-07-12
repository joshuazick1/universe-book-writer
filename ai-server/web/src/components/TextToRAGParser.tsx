import React, { useState, useEffect, useRef } from 'react';
import TextToRagNode from '../features/rag-dashboard/components/TextToRagNode';

interface PipelineTask {
  id: string;
  task: string;
  friendlyName: string;
  status: 'not_queued' | 'pending' | 'running' | 'success' | 'error';
  startedAt?: string;
  finishedAt?: string;
  modelName?: string;
}

interface ParsedEntity {
  type: string;
  name: string;
  description: string;
  confidence: number;
  [key: string]: any;
}

interface RAGNode {
  id: string;
  type: string;
  content: any;
  metadata: any;
}

interface TextToRAGParserProps {
  className?: string;
}

/** Stepper visualization for pipeline tasks */
const PipelineStepper: React.FC<{ tasks: PipelineTask[] }> = ({ tasks }) => (
  <ol className="relative border-l border-gray-300 ml-4 my-6">
    {tasks.map((task, idx) => {
      let icon, color;
      switch (task.status) {
        case 'success':
          icon = (
            <span className="inline-block w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          );
          color = 'text-green-700';
          break;
        case 'running':
          icon = (
            <span className="inline-block w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
          );
          color = 'text-blue-700';
          break;
        case 'error':
          icon = (
            <span className="inline-block w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          );
          color = 'text-red-700';
          break;
        case 'pending':
          icon = (
            <span className="inline-block w-4 h-4 bg-yellow-400 rounded-full border-2 border-white" />
          );
          color = 'text-yellow-700';
          break;
        default:
          icon = (
            <span className="inline-block w-4 h-4 bg-gray-300 rounded-full border-2 border-white" />
          );
          color = 'text-gray-600';
      }
      return (
        <li key={task.id || idx} className="mb-6 ml-2 flex items-center">
          <span className="absolute -left-6">{icon}</span>
          <div>
            <span className={`font-medium ${color}`}>{task.friendlyName || task.task}</span>
            {task.modelName && (
              <span className="ml-2 text-xs text-gray-500">(Model: {task.modelName})</span>
            )}
            <div className="text-xs text-gray-400">
              {task.status === 'success' && task.finishedAt && `Finished: ${new Date(task.finishedAt).toLocaleTimeString()}`}
              {task.status === 'running' && 'Running...'}
              {task.status === 'pending' && 'Queued'}
              {task.status === 'not_queued' && 'Waiting'}
              {task.status === 'error' && 'Failed'}
            </div>
          </div>
        </li>
      );
    })}
  </ol>
);

export const TextToRAGParser: React.FC<TextToRAGParserProps> = ({ className }) => {
  const [inputText, setInputText] = useState('');
  const [universeId, setUniverseId] = useState('text-parser-universe');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [overrideModel, setOverrideModel] = useState<string | null>(null);
  const [pipelineTasks, setPipelineTasks] = useState<PipelineTask[]>([]);
  const [entities, setEntities] = useState<ParsedEntity[]>([]);
  const [ragNodes, setRagNodes] = useState<RAGNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Handle SSE pipeline events
  useEffect(() => {
    if (!isProcessing) return;
    const es = new window.EventSource('/api/text-to-rag/events');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pipeline_overview' && Array.isArray(data.tasks)) {
        setPipelineTasks(data.tasks);
      }
      if (data.type === 'task_status' && data.task) {
        setPipelineTasks(prev =>
          prev.map(t => t.id === data.task.id ? { ...t, ...data.task } : t)
        );
      }
      if (data.type === 'pipeline_complete') {
        setEntities(data.entities || []);
        setRagNodes(data.ragNodes || []);
        setIsProcessing(false);
        es.close();
      }
      if (data.type === 'pipeline_error') {
        setError(data.error || 'Pipeline failed');
        setIsProcessing(false);
        es.close();
      }
    };
    es.onerror = () => {
      setError('Connection lost');
      setIsProcessing(false);
      es.close();
    };
    return () => es.close();
  }, [isProcessing]);

  // Submit text for ingestion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setEntities([]);
    setRagNodes([]);
    setPipelineTasks([]);
    await fetch('/api/text-to-rag/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: inputText,
        model: overrideModel || selectedModel,
        universeId
      }),
    });
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="mb-6">
        <TextToRagNode onModelSelect={setSelectedModel} />
        <div className="mt-4">
          <label className="block font-medium mb-1">Text to Ingest</label>
          <textarea
            className="w-full h-32 p-2 border rounded mb-2"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste or type your text here..."
            required
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="font-medium">Override Model:</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={overrideModel || ''}
            onChange={e => setOverrideModel(e.target.value || null)}
            placeholder="(Optional) Model name to override orchestrator"
          />
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isProcessing || !(selectedModel || overrideModel)}
        >
          {isProcessing ? 'Ingesting...' : 'Ingest'}
        </button>
      </form>
      {pipelineTasks.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Pipeline Progress</h3>
          <PipelineStepper tasks={pipelineTasks} />
        </div>
      )}
      {entities.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Parsed Entities</h3>
          <ul className="space-y-1">
            {entities.map((entity, idx) => (
              <li key={idx} className="border rounded p-2 bg-gray-50">
                <span className="font-bold">{entity.type}:</span> {entity.name} <span className="text-xs text-gray-500">({entity.confidence})</span>
                <div className="text-gray-700 text-sm">{entity.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ragNodes.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Created RAG Nodes</h3>
          <ul className="space-y-1">
            {ragNodes.map((node, idx) => (
              <li key={node.id || idx} className="border rounded p-2 bg-gray-50">
                <span className="font-bold">{node.type}:</span> {node.content?.name || node.id}
                <div className="text-gray-700 text-sm">{node.content?.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <div className="text-red-600 mt-4">{error}</div>}
    </div>
  );
};

export default TextToRAGParser;
