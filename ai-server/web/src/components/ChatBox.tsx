import React, { useState } from 'react';

/**
 * Props for ChatBox component.
 * @property messages - Array of chat messages ({ role, content })
 * @property onSend - Function to send a new message
 * @property loading - Whether a message is being sent
 * @property contextScope - Optional string to show current context (e.g., selected universe)
 */
export interface ChatBoxProps {
    messages: { role: string; content: string }[];
    onSend: (input: string) => void;
    loading?: boolean;
    contextScope?: string;
}

/**
 * ChatBox component for AI helper chat UI.
 * Pure, accessible, and styled with Tailwind.
 */
const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSend, loading, contextScope }) => {
    const [input, setInput] = useState('');

    return (
        <div className="flex flex-col h-full">
            {contextScope && (
                <div className="text-xs text-gray-500 mb-1">Context: {contextScope}</div>
            )}
            <div className="border rounded bg-white p-2 flex-1 overflow-y-auto mb-2 min-h-[6rem] max-h-64">
                {messages.length === 0 && (
                    <div className="text-gray-400 text-sm">Start a conversation with the AI...</div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`mb-2 text-sm ${msg.role === 'user' ? 'text-blue-700' : 'text-purple-700'}`}
                    >
                        <span className="font-bold mr-1">{msg.role === 'user' ? 'You:' : 'AI:'}</span>
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div className="text-purple-700 text-sm italic">AI is typing...</div>
                )}
            </div>
            <form
                className="flex gap-2"
                onSubmit={e => {
                    e.preventDefault();
                    if (input.trim()) {
                        onSend(input);
                        setInput('');
                    }
                }}
                aria-label="Send message to AI"
            >
                <input
                    type="text"
                    className="border px-2 py-1 rounded w-full"
                    placeholder="Type your question..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                    aria-label="Chat input"
                />
                <button
                    className="bg-purple-600 text-white px-3 py-1 rounded"
                    type="submit"
                    disabled={loading || !input.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
