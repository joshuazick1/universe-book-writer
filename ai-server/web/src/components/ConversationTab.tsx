import React, { useState, useEffect } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

interface Message {
    id: string;
    user: string;
    text: string;
    model: string;
    server: string;
    serverLog: string[];
    timestamp: string;
    expanded?: boolean;
    type?: string; // <-- PATCH: allow 'thinking' and other message types
}

const ConversationTab: React.FC = () => {
    const [models, setModels] = useState<string[]>([]);
    const [model, setModel] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [thinking, setThinking] = useState<string>("");
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        const fetchModels = async () => {
            setLoadingModels(true);
            setModelsError(null);
            try {
                // Update to fetch from the AI server directly
                const res = await fetch("http://localhost:5100/api/tags");
                if (!res.ok) throw new Error("Failed to fetch models");
                const data = await res.json();
                // Ensure models is always an array of strings
                const modelNames = Array.isArray(data.models)
                    ? data.models.map((m: any) => typeof m === "string" ? m : m.name)
                    : [];
                modelNames.sort((a: string, b: string) => a.localeCompare(b)); // Sort alphabetically
                setModels(modelNames);
                setModel((prev) => (modelNames.length > 0 ? modelNames[0] : ""));
            } catch (e: any) {
                setModelsError(e.message || "Unknown error");
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, []);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userMsg: Message = {
            id: Date.now().toString(),
            user: "user",
            text: input,
            model,
            server: "ai-server:5100",
            serverLog: [
                `POST http://localhost:5100/api/generate`,
                `model: ${model}`
            ],
            timestamp: new Date().toISOString(),
            expanded: false,
        };
        setMessages((msgs) => [...msgs, userMsg]);
        setInput("");
        setIsStreaming(true);
        try {
            // Prepare conversation context (all previous messages EXCEPT <think> messages)
            const chatMessages = [...messages, userMsg].filter((msg) => msg.type !== 'thinking');
            // Format as chat transcript: User: ...\nAI: ...\nUser: ...
            const prompt = chatMessages.map((msg) => `${msg.user === 'user' ? 'User' : 'AI'}: ${msg.text}`).join('\n');
            console.debug("[sendMessage] Sending request (stream)", {
                url: "http://localhost:5100/api/generate",
                model,
                prompt,
                stream: true
            });
            const res = await fetch("http://localhost:5100/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model, prompt, stream: true }),
            });
            if (!res.body) throw new Error("No response body (stream)");
            const reader = res.body.getReader();
            let aiText = "";
            let thinkBuffer = "";
            let inThink = false;
            let thinkMsgId = "";
            let decoder = new TextDecoder();
            let done = false;
            let aiMsgId = "";
            let aiMsgTimestamp = "";
            while (!done) {
                const { value, done: streamDone } = await reader.read();
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    for (const line of chunk.split("\n")) {
                        if (!line.trim()) continue;
                        try {
                            const obj = JSON.parse(line);
                            if (typeof obj.response === "string") {
                                const resp = obj.response;
                                if (resp === "<think>") {
                                    inThink = true;
                                    thinkBuffer = "";
                                    thinkMsgId = `think-${Date.now()}`;
                                    setMessages((msgs) => [
                                        ...msgs,
                                        {
                                            id: thinkMsgId,
                                            user: "ai",
                                            text: "", // will be updated as thoughts stream in
                                            model,
                                            server: "ai-server:5100",
                                            serverLog: [
                                                `POST http://localhost:5100/api/generate (stream)`
                                            ],
                                            timestamp: new Date().toISOString(),
                                            expanded: false,
                                            type: 'thinking',
                                        },
                                    ]);
                                } else if (resp === "</think>") {
                                    inThink = false;
                                    // Always update the <think> message with the final buffer
                                    setMessages((msgs) =>
                                        msgs.map((m) =>
                                            m.id === thinkMsgId
                                                ? { ...m, text: thinkBuffer }
                                                : m
                                        )
                                    );
                                    // Also update the serverLog to include the final thoughts for debugging
                                    setMessages((msgs) =>
                                        msgs.map((m) =>
                                            m.id === thinkMsgId
                                                ? { ...m, serverLog: [...m.serverLog, `Final thoughts: ${thinkBuffer}`] }
                                                : m
                                        )
                                    );
                                } else if (inThink) {
                                    thinkBuffer += resp;
                                    setMessages((msgs) =>
                                        msgs.map((m) =>
                                            m.id === thinkMsgId
                                                ? { ...m, text: thinkBuffer }
                                                : m
                                        )
                                    );
                                } else {
                                    // Streaming main AI response
                                    if (!aiMsgId) {
                                        aiMsgId = `ai-${Date.now()}`;
                                        aiMsgTimestamp = new Date().toISOString();
                                        setMessages((msgs) => [
                                            ...msgs,
                                            {
                                                id: aiMsgId,
                                                user: "ai",
                                                text: "",
                                                model,
                                                server: "ai-server:5100",
                                                serverLog: [
                                                    `POST http://localhost:5100/api/generate (stream)`
                                                ],
                                                timestamp: aiMsgTimestamp,
                                                expanded: false,
                                            },
                                        ]);
                                    }
                                    aiText += resp;
                                    setMessages((msgs) =>
                                        msgs.map((m) =>
                                            m.id === aiMsgId
                                                ? { ...m, text: aiText }
                                                : m
                                        )
                                    );
                                }
                            }
                        } catch (e) {
                            console.error("[sendMessage] Error parsing stream response", e);
                        }
                    }
                }
                done = streamDone;
            }
            reader.releaseLock();
        } catch (e: any) {
            console.error("[sendMessage] Error in streaming response", e);
            setMessages((msgs) =>
                msgs.map((m) =>
                    m.id === userMsg.id ? { ...m, text: m.text + " (error)" } : m
                )
            );
        } finally {
            setIsStreaming(false);
        }
    };

    const toggleExpand = (id: string) => {
        setMessages((msgs) =>
            msgs.map((m) => (m.id === id ? { ...m, expanded: !m.expanded } : m))
        );
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex items-center gap-2">
                <label className="font-semibold">Model:</label>
                {loadingModels ? (
                    <span className="text-gray-500 text-sm">Loading models...</span>
                ) : modelsError ? (
                    <span className="text-red-500 text-sm">{modelsError}</span>
                ) : (
                    <select
                        className="border rounded px-2 py-1"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={models.length === 0}
                    >
                        {models.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="bg-white rounded shadow p-4 mb-4 h-96 overflow-y-auto flex flex-col-reverse">
                {messages.length === 0 && <div className="text-gray-400">No messages yet.</div>}
                {messages.slice().reverse().map((msg) => (
                    <div
                        key={msg.id}
                        className={`mb-2 ${msg.user === "user" ? "text-right" : "text-left"}`}
                    >
                        <div className="inline-block max-w-[80%] bg-blue-50 rounded p-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-blue-700">
                                    {msg.user === "user" ? "You" : msg.model}
                                </span>
                                <span className="text-xs text-gray-500">@{msg.server}</span>
                                {msg.type === 'thinking' && (
                                    <button
                                        className="ml-1 text-gray-400 hover:text-blue-600"
                                        onClick={() => toggleExpand(msg.id)}
                                        aria-label="Show thinking details"
                                    >
                                        {msg.expanded ? (
                                            <ChevronDownIcon className="w-4 h-4 inline" />
                                        ) : (
                                            <ChevronRightIcon className="w-4 h-4 inline" />
                                        )}
                                    </button>
                                )}
                            </div>
                            <div className="mt-1 text-sm">
                                {msg.type === 'thinking' ? (
                                    msg.expanded ? (
                                        <span className="font-mono text-yellow-800 bg-yellow-100 px-2 py-1 rounded">🤔 {msg.text}</span>
                                    ) : (
                                        <span className="font-mono text-yellow-800 bg-yellow-100 px-2 py-1 rounded">🤔 <span className="italic">(thinking...)</span></span>
                                    )
                                ) : (
                                    msg.text
                                )}
                            </div>
                            {msg.expanded && msg.type === 'thinking' && (
                                <div className="mt-2 bg-gray-100 rounded p-2 text-xs text-left">
                                    <div className="font-semibold mb-1">Thinking Log:</div>
                                    <ul className="list-disc ml-4">
                                        {msg.serverLog.map((line, i) => (
                                            <li key={i}>{line}</li>
                                        ))}
                                    </ul>
                                    <div className="mt-1 text-gray-400">{msg.timestamp}</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button
                    className="px-4 py-1 bg-blue-600 text-white rounded"
                    type="submit"
                    disabled={!model || loadingModels || !!modelsError}
                >
                    Send
                </button>
            </form>
            {/* Debugging Output Section */}
            <details className="mt-4 bg-gray-100 rounded p-2 text-xs">
                <summary className="cursor-pointer font-semibold text-blue-700">Debug Info</summary>
                <div className="mt-2">
                    <div><span className="font-bold">model:</span> {JSON.stringify(model)}</div>
                    <div><span className="font-bold">input:</span> {JSON.stringify(input)}</div>
                    <div><span className="font-bold">models:</span> {JSON.stringify(models)}</div>
                    <div><span className="font-bold">loadingModels:</span> {JSON.stringify(loadingModels)}</div>
                    <div><span className="font-bold">modelsError:</span> {JSON.stringify(modelsError)}</div>
                    <div><span className="font-bold">messages:</span>
                        <pre className="whitespace-pre-wrap bg-white border rounded p-1 max-h-40 overflow-y-auto">{JSON.stringify(messages, null, 2)}</pre>
                    </div>
                </div>
            </details>
        </div>
    );
};

export default ConversationTab;
