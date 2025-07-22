import React, { useState } from "react";

import ConversationTab from "./components/ConversationTab";
import ServersTab from "./components/ServersTab";
import ModelsTab from "./components/ModelsTab";
import BenchmarksTab from "./components/BenchmarksTab";
import RAGTab from "./components/RAGTab";
import CharacterChatInterface from "./pages/character-chat/CharacterChatInterface";
import CharacterChatSetup from "./pages/character-chat/CharacterChatSetup";
import Dashboard from "./components/Dashboard.js";

const TABS = [
    { key: "dashboard", label: "Universe Dashboard" },
    { key: "character-chat", label: "Character Chat" },
    { key: "conversation", label: "Basic Conversation" },
    { key: "rag", label: "RAG System" },
    { key: "servers", label: "Servers" },
    { key: "models", label: "Models" },
    { key: "benchmarks", label: "Benchmarks" },
    { key: "logs", label: "Logs" },
];

const App: React.FC = () => {
    const [tab, setTab] = useState("character-chat");
    const [chatState, setChatState] = useState<{
        mode: 'setup' | 'chatting';
        universeId?: string;
        characterId?: string;
    }>({
        mode: 'setup'
    });

    const handleStartChat = (universeId: string, characterId: string) => {
        setChatState({
            mode: 'chatting',
            universeId,
            characterId
        });
    };

    const handleBackToSetup = () => {
        setChatState({ mode: 'setup' });
    };

    const handleCreateUniverse = () => {
        // TODO: Navigate to universe creation page or modal
        alert('Universe creation feature coming soon!');
    };

    const handleCreateCharacter = (universeId: string) => {
        // TODO: Navigate to character creation page or modal
        alert(`Character creation for universe ${universeId} coming soon!`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans">
            <h1 className="text-2xl font-bold mb-4">
                AI Server Development Showcase{" "}
                <span className="text-xs text-gray-400">(Character Chat & Memory System)</span>
            </h1>
            <nav className="mb-6 flex gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        className={`px-4 py-2 rounded ${tab === t.key
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border"
                            }`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>
            <section>
                {tab === "dashboard" && <Dashboard />}
                {tab === "character-chat" && (
                    <>
                        {chatState.mode === 'setup' ? (
                            <CharacterChatSetup
                                onStartChat={handleStartChat}
                                onCreateCharacter={handleCreateCharacter}
                                onCreateUniverse={handleCreateUniverse}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold">Character Chat</h2>
                                    <button
                                        onClick={handleBackToSetup}
                                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                    >
                                        ← Back to Setup
                                    </button>
                                </div>
                                <CharacterChatInterface
                                    initialCharacterId={chatState.characterId}
                                    universeId={chatState.universeId}
                                    showAdvancedFeatures={true}
                                    enableMultiCharacter={false}
                                />
                            </div>
                        )}
                    </>
                )}
                {tab === "conversation" && <ConversationTab />}
                {tab === "rag" && <RAGTab />}
                {tab === "servers" && <ServersTab />}
                {tab === "models" && <ModelsTab />}
                {tab === "benchmarks" && <BenchmarksTab />}
                {tab === "logs" && <div>TODO: Request/Response Logs</div>}
            </section>
            <div className="text-xs text-gray-400 mt-8">
                This UI is for development only. Do not use in production.
            </div>
        </div>
    );
};

export default App;
