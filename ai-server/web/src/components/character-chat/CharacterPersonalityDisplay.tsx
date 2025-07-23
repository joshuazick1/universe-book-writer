/**
 * Character Personality Display - Shows character personality traits and info
 * 
 * Features:
 * - Character avatar and basic info
 * - Personality traits visualization
 * - Current emotional state
 * - Character background summary
 */

import React from 'react';
import {
    UserIcon,
    HeartIcon,
    StarIcon,
    BookOpenIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { CharacterInfo } from '../../types/character-chat';

interface CharacterPersonalityDisplayProps {
    character: CharacterInfo;
    compact?: boolean;
    showBackground?: boolean;
    onEdit?: () => void;
}

export const CharacterPersonalityDisplay: React.FC<CharacterPersonalityDisplayProps> = ({
    character,
    compact = false,
    showBackground = true,
    onEdit
}) => {
    if (compact) {
        return (
            <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0">
                    {character.avatar ? (
                        <img
                            src={character.avatar.url}
                            alt={character.name}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {character.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {character.universeId} • Character
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                        {character.avatar ? (
                            <img
                                src={character.avatar.url}
                                alt={character.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-lg"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-600 shadow-lg">
                                <UserIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {character.name}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    Character • {character.universeId}
                                </p>
                            </div>
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {/* Status/Mood */}
                        <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                ● Active
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Description */}
                {character.description && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <BookOpenIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Description
                            </h3>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {character.description}
                        </p>
                    </div>
                )}

                {/* Personality Traits */}
                {character.personality?.traits && character.personality.traits.length > 0 && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <StarIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Personality Traits
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {character.personality.traits.map((trait: { name: string; value: number; description: string }, index: number) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    title={trait.description}
                                >
                                    {trait.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Personality Archetype */}
                {character.personality?.archetype && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <StarIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Archetype
                            </h3>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {character.personality.archetype}
                        </span>
                    </div>
                )}

                {/* Motivations */}
                {character.personality?.motivations && character.personality.motivations.length > 0 && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <HeartIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Motivations
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {character.personality.motivations.map((motivation: string, index: number) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                >
                                    {motivation}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Universe Context */}
                {character.universeId && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <GlobeAltIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Universe
                            </h3>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {character.universeId}
                        </p>
                    </div>
                )}

                {/* Background/Description */}
                {showBackground && character.description && (
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <HeartIcon className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Background
                            </h3>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {character.description}
                        </p>
                    </div>
                )}

                {/* Stats/Metrics */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Conversations</span>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {character.conversationCount || 0}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Memories</span>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {character.memoryStats?.totalMemories || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterPersonalityDisplay;
