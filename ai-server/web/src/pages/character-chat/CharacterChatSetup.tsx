/**
 * Character Chat Setup - Initial setup interface for character chat
 * 
 * Features:
 * - Universe selection
 * - Character selection within universe
 * - Character creation option
 * - Direct integration with CharacterSwitcher
 * - Proper workflow: universe → character → chat
 */

import React, { useState, useEffect } from 'react';
import { CharacterSwitcher } from '../../components/character-chat';
import { CharacterInfo } from '../../types/character-chat';
import {
    GlobeAltIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    PlusIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

interface Universe {
    id: string;
    name: string;
    description: string;
    genre: string;
    characterCount: number;
    createdAt: Date;
    status: string;
}

interface CharacterChatSetupProps {
    onStartChat: (universeId: string, characterId: string) => void;
    onCreateCharacter?: (universeId: string) => void;
    onCreateUniverse?: () => void;
}

export const CharacterChatSetup: React.FC<CharacterChatSetupProps> = ({
    onStartChat,
    onCreateCharacter,
    onCreateUniverse
}) => {
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [selectedUniverseId, setSelectedUniverseId] = useState<string>('');
    const [characters, setCharacters] = useState<CharacterInfo[]>([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [isLoadingUniverses, setIsLoadingUniverses] = useState(true);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
    const [error, setError] = useState<string>('');
    const [isPopulatingSampleData, setIsPopulatingSampleData] = useState(false);

    // Load universes on component mount
    useEffect(() => {
        loadUniverses();
    }, []);

    // Load characters when universe is selected
    useEffect(() => {
        if (selectedUniverseId) {
            loadCharacters(selectedUniverseId);
        } else {
            setCharacters([]);
            setSelectedCharacterId('');
        }
    }, [selectedUniverseId]);

    const loadUniverses = async () => {
        try {
            setIsLoadingUniverses(true);
            setError('');

            const response = await fetch('/api/chat/universes');
            const data = await response.json();

            if (data.success) {
                setUniverses(data.universes);
            } else {
                setError('Failed to load universes');
            }
        } catch (err) {
            console.error('Error loading universes:', err);
            setError('Failed to connect to server');
        } finally {
            setIsLoadingUniverses(false);
        }
    };

    const loadCharacters = async (universeId: string) => {
        try {
            setIsLoadingCharacters(true);
            setError('');

            const response = await fetch(`/api/chat/universes/${universeId}/characters`);
            const data = await response.json();

            if (data.success) {
                setCharacters(data.characters);
            } else {
                setError('Failed to load characters');
            }
        } catch (err) {
            console.error('Error loading characters:', err);
            setError('Failed to load characters');
        } finally {
            setIsLoadingCharacters(false);
        }
    };

    const populateSampleData = async () => {
        try {
            setIsPopulatingSampleData(true);
            setError('');

            const response = await fetch('/api/chat/populate-sample-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                // Reload universes after populating sample data
                await loadUniverses();
            } else {
                setError('Failed to populate sample data');
            }
        } catch (err) {
            console.error('Error populating sample data:', err);
            setError('Failed to populate sample data');
        } finally {
            setIsPopulatingSampleData(false);
        }
    };

    const handleUniverseSelect = (universeId: string) => {
        setSelectedUniverseId(universeId);
        setSelectedCharacterId(''); // Reset character selection
    };

    const handleCharacterSelect = (characterId: string) => {
        setSelectedCharacterId(characterId);
    };

    const handleStartChat = () => {
        if (selectedUniverseId && selectedCharacterId) {
            onStartChat(selectedUniverseId, selectedCharacterId);
        }
    };

    const selectedUniverse = universes.find(u => u.id === selectedUniverseId);
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Character Chat Setup
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Choose a universe and character to start your conversation
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Steps */}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className={`flex items-center space-x-2 ${selectedUniverseId ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                    <GlobeAltIcon className="w-5 h-5" />
                    <span>1. Select Universe</span>
                </div>
                <ArrowRightIcon className="w-4 h-4" />
                <div className={`flex items-center space-x-2 ${selectedCharacterId ? 'text-green-600 dark:text-green-400' : selectedUniverseId ? 'text-gray-900 dark:text-white' : ''}`}>
                    <UserIcon className="w-5 h-5" />
                    <span>2. Select Character</span>
                </div>
                <ArrowRightIcon className="w-4 h-4" />
                <div className={`flex items-center space-x-2 ${selectedUniverseId && selectedCharacterId ? 'text-gray-900 dark:text-white' : ''}`}>
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    <span>3. Start Chat</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Universe Selection */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Choose Universe
                        </h2>
                        {onCreateUniverse && (
                            <button
                                onClick={onCreateUniverse}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Create Universe</span>
                            </button>
                        )}
                    </div>

                    {isLoadingUniverses ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading universes...</p>
                        </div>
                    ) : universes.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No universes found in RAG database</p>
                            <div className="space-y-3">
                                <button
                                    onClick={populateSampleData}
                                    disabled={isPopulatingSampleData}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isPopulatingSampleData ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Populating Sample Data...</span>
                                        </div>
                                    ) : (
                                        'Populate Sample Data'
                                    )}
                                </button>
                                {onCreateUniverse && (
                                    <button
                                        onClick={onCreateUniverse}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        Create New Universe
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {universes.map((universe) => (
                                <button
                                    key={universe.id}
                                    onClick={() => handleUniverseSelect(universe.id)}
                                    className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedUniverseId === universe.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {universe.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {universe.description}
                                            </p>
                                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                    {universe.genre}
                                                </span>
                                                <span>{universe.characterCount} characters</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Character Selection */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Choose Character
                    </h2>

                    {!selectedUniverseId ? (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-8 text-center">
                            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                                Select a universe first
                            </p>
                        </div>
                    ) : isLoadingCharacters ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading characters...</p>
                        </div>
                    ) : (
                        <CharacterSwitcher
                            characters={characters}
                            activeCharacterId={selectedCharacterId}
                            onCharacterSelect={handleCharacterSelect}
                            onCreateCharacter={onCreateCharacter ? () => onCreateCharacter(selectedUniverseId) : undefined}
                            compact={false}
                        />
                    )}
                </div>
            </div>

            {/* Selection Summary and Start Button */}
            {selectedUniverse && selectedCharacter && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 mb-2">
                                Ready to Start Chat
                            </h3>
                            <div className="text-sm text-indigo-700 dark:text-indigo-300">
                                <p><strong>Universe:</strong> {selectedUniverse.name}</p>
                                <p><strong>Character:</strong> {selectedCharacter.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartChat}
                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                            <span>Start Chat</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterChatSetup;
