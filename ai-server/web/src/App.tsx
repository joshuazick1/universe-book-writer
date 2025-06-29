import React, { useState } from "react";
import ConversationTab from "./components/ConversationTab";
import ServersTab from "./components/ServersTab";
import ModelsTab from "./components/ModelsTab";
import BenchmarksTab from "./components/BenchmarksTab";

const TABS = [
    { key: "conversation", label: "Conversation" },
    { key: "servers", label: "Servers" },
    { key: "models", label: "Models" },
    { key: "benchmarks", label: "Benchmarks" },
    { key: "logs", label: "Logs" },
];

const App: React.FC = () => {
    const [tab, setTab] = useState("conversation");

    return (
        <div className="min-h-screen bg-gray-50 p-4 font-sans">
            <h1 className="text-2xl font-bold mb-4">
                AI Server Dashboard{" "}
                <span className="text-xs text-gray-400">(Development Only)</span>
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
                {tab === "conversation" && <ConversationTab />}
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
