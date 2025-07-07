/**
 * Typing Indicator - Shows when the AI is generating a response
 * 
 * Features:
 * - Animated typing dots
 * - Context gathering status
 * - Memory processing indicators
 * - Estimated response time
 * - Character-specific styling
 */

import React, { useState, useEffect } from 'react';
import { 
    CpuChipIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

interface TypingIndicatorProps {
    characterName?: string;
    showContextGathering?: boolean;
    selectedMemories?: number;
    estimatedTime?: number;
    stage?: 'thinking' | 'gathering' | 'generating' | 'finalizing';
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
    characterName = 'Character',
    showContextGathering = false,
    selectedMemories = 0,
    estimatedTime,
    stage = 'thinking'
}) => {
    const [dots, setDots] = useState('');
    const [elapsedTime, setElapsedTime] = useState(0);

    // Animate typing dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return '';
                return prev + '.';
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Track elapsed time
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Get stage icon and message
    const getStageInfo = () => {
        switch (stage) {
            case 'gathering':
                return {
                    icon: <MagnifyingGlassIcon className="w-4 h-4" />,
                    message: `Gathering context from ${selectedMemories} memories`,
                    color: 'text-blue-600 dark:text-blue-400'
                };
            case 'generating':
                return {
                    icon: <SparklesIcon className="w-4 h-4" />,
                    message: 'Generating response',
                    color: 'text-purple-600 dark:text-purple-400'
                };
            case 'finalizing':
                return {
                    icon: <CpuChipIcon className="w-4 h-4" />,
                    message: 'Finalizing response',
                    color: 'text-green-600 dark:text-green-400'
                };
            default:
                return {
                    icon: <CpuChipIcon className="w-4 h-4" />,
                    message: 'Thinking',
                    color: 'text-gray-600 dark:text-gray-400'
                };
        }
    };

    const stageInfo = getStageInfo();

    return (
        <div className="typing-indicator">
            {/* Main typing indicator */}
            <div className="flex items-center space-x-3 mb-2">
                {/* Character avatar placeholder */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {characterName.charAt(0)}
                </div>
                
                {/* Typing animation */}
                <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {characterName} is typing{dots}
                    </span>
                </div>
            </div>

            {/* Stage-specific information */}
            <div className="ml-11 space-y-2">
                {/* Current stage */}
                <div className={`flex items-center space-x-2 text-sm ${stageInfo.color}`}>
                    {stageInfo.icon}
                    <span>{stageInfo.message}</span>
                </div>

                {/* Context gathering details */}
                {showContextGathering && selectedMemories > 0 && (
                    <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing {selectedMemories} relevant memories</span>
                    </div>
                )}

                {/* Progress indicators */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    {/* Elapsed time */}
                    <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{elapsedTime}s</span>
                    </div>

                    {/* Estimated time remaining */}
                    {estimatedTime && estimatedTime > elapsedTime && (
                        <div className="flex items-center space-x-1">
                            <span>~{estimatedTime - elapsedTime}s remaining</span>
                        </div>
                    )}

                    {/* Stage progress */}
                    <div className="flex space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                            ['thinking', 'gathering', 'generating', 'finalizing'].indexOf(stage) >= 0 
                                ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full ${
                            ['gathering', 'generating', 'finalizing'].indexOf(stage) >= 0 
                                ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full ${
                            ['generating', 'finalizing'].indexOf(stage) >= 0 
                                ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div className={`w-2 h-2 rounded-full ${
                            stage === 'finalizing' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                    </div>
                </div>

                {/* Processing animation for context gathering */}
                {stage === 'gathering' && (
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ 
                            width: selectedMemories > 0 ? `${Math.min(100, (selectedMemories / 10) * 100)}%` : '30%' 
                        }}></div>
                    </div>
                )}

                {/* Generation animation */}
                {stage === 'generating' && (
                    <div className="flex items-center space-x-2 text-xs text-purple-600 dark:text-purple-400">
                        <div className="flex space-x-1">
                            <div className="w-1 h-4 bg-purple-500 animate-pulse"></div>
                            <div className="w-1 h-4 bg-purple-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-4 bg-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1 h-4 bg-purple-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                        <span>Crafting response...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TypingIndicator;
