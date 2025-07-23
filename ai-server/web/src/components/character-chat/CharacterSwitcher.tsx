/**
 * Character Switcher - Component for switching between different characters
 * 
 * Features:
 * - Character selection dropdown
 * - Character preview cards
 * - Quick character switching
 * - Character creation button
 */

import React, { useState } from 'react';
import {
    ChevronDownIcon,
    UserIcon,
    PlusIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { CharacterInfo } from '../../types/character-chat';

interface CharacterSwitcherProps {
    characters: CharacterInfo[];
    activeCharacterId: string | null;
    onCharacterSelect: (characterId: string) => void;
    onCreateCharacter?: () => void;
    compact?: boolean;
}

export const CharacterSwitcher: React.FC<CharacterSwitcherProps> = ({
    characters = [],
    activeCharacterId,
    onCharacterSelect,
    onCreateCharacter,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const activeCharacter = characters.find(c => c.id === activeCharacterId);

    const filteredCharacters = characters.filter(character =>
        character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        character.universeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    {activeCharacter ? (
                        <>
                            {activeCharacter.avatar ? (
                                <img
                                    src={activeCharacter.avatar.url}
                                    alt={activeCharacter.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-6 h-6 text-gray-400" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {activeCharacter.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <UserIcon className="w-6 h-6 text-gray-400" />
                            <span className="text-sm text-gray-500">Select Character</span>
                        </>
                    )}
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        <div className="p-2">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search characters..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {filteredCharacters.map((character) => (
                                <button
                                    key={character.id}
                                    onClick={() => {
                                        onCharacterSelect(character.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${character.id === activeCharacterId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                        }`}
                                >
                                    {character.avatar ? (
                                        <img
                                            src={character.avatar.url}
                                            alt={character.name}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                            <UserIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {character.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {character.universeId} • Character
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {onCreateCharacter && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                <button
                                    onClick={() => {
                                        onCreateCharacter();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="text-sm font-medium">Create New Character</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Click outside to close */}
                {isOpen && (
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Select Character
                </h3>
                {onCreateCharacter && (
                    <button
                        onClick={onCreateCharacter}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>New</span>
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
            </div>

            {/* Character Grid */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredCharacters.map((character) => (
                    <button
                        key={character.id}
                        onClick={() => onCharacterSelect(character.id)}
                        className={`w-full flex items-center space-x-3 p-3 text-left rounded-lg border transition-colors ${character.id === activeCharacterId
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {character.avatar ? (
                            <img
                                src={character.avatar.url}
                                alt={character.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-gray-400" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {character.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {character.universeId} • Character
                            </div>
                            {character.description && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                    {character.description}
                                </div>
                            )}
                        </div>
                    </button>
                ))}

                {filteredCharacters.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No characters found</p>
                        {searchTerm && (
                            <p className="text-xs mt-1">Try a different search term</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CharacterSwitcher;
