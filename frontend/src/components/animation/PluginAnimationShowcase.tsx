/**
 * Plugin Animation Showcase
 * Demonstrates plugin-specific animations from different universes
 */

import React, { useState, useEffect } from 'react';
import { usePluginAnimations } from '../../services/plugin-animation-registry';
import './plugin-animations'; // Import to register examples

export const PluginAnimationShowcase: React.FC = () => {
    const [activeUniverse, setActiveUniverse] = useState<string>('star-trek');
    const [showAnimations, setShowAnimations] = useState(false);
    const { getUniverseAnimations, getAllAnimations } = usePluginAnimations();

    const allAnimations = getAllAnimations();
    const universeTypes = [...new Set(allAnimations.map(a => a.universeType).filter(Boolean))];
    const currentUniverseAnimations = getUniverseAnimations(activeUniverse);

    // Demo data for each animation
    const getDemoProps = (animationName: string, universeType: string) => {
        const demoData: Record<string, Record<string, any>> = {
            'star-trek': {
                'LCARSBar': {
                    show: showAnimations,
                    duration: 800,
                    barColor: 'bg-orange-500',
                    glowEffect: true,
                    className: 'h-16'
                }
            },
            'star-wars': {
                'ImperialPanel': {
                    show: showAnimations,
                    duration: 600,
                    panelType: 'command',
                    className: 'h-20 p-4'
                }
            },
            'cyberpunk': {
                'GlitchText': {
                    show: showAnimations,
                    duration: 500,
                    intensity: 'medium',
                    className: 'text-green-400'
                }
            }
        };

        return demoData[universeType]?.[animationName] || { show: showAnimations };
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">🌌 Plugin Animation System</h2>
                <p className="text-gray-600 max-w-3xl mx-auto">
                    Animations are dynamically loaded by universe plugins. Each plugin provides
                    its own specialized components that match the aesthetic of that universe.
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <div className="flex gap-2">
                    <label className="text-sm font-medium">Universe:</label>
                    <select
                        value={activeUniverse}
                        onChange={(e) => setActiveUniverse(e.target.value)}
                        className="px-3 py-1 border rounded-lg text-sm"
                    >
                        {universeTypes.map(type => (
                            <option key={type} value={type}>
                                {type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => setShowAnimations(!showAnimations)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {showAnimations ? 'Reset' : 'Activate'} {activeUniverse.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Animations
                </button>
            </div>

            {/* Plugin Animation Demos */}
            <div className="grid gap-6">
                {currentUniverseAnimations.map((animation) => {
                    const AnimationComponent = animation.component;
                    const demoProps = getDemoProps(animation.name, animation.universeType!);

                    return (
                        <div key={`${animation.universeType}.${animation.name}`} className="p-6 bg-white rounded-lg border">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <span className="text-2xl">
                                        {animation.universeType === 'star-trek' ? '🖥️' :
                                            animation.universeType === 'star-wars' ? '⭐' :
                                                animation.universeType === 'cyberpunk' ? '🔮' : '🎨'}
                                    </span>
                                    {animation.name}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({animation.category})
                                    </span>
                                </h3>
                                {animation.description && (
                                    <p className="text-sm text-gray-600 mt-1">{animation.description}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Demo Content */}
                                <div className={`min-h-[80px] ${animation.universeType === 'star-trek' ? 'bg-black' :
                                        animation.universeType === 'star-wars' ? 'bg-gray-900' :
                                            animation.universeType === 'cyberpunk' ? 'bg-gray-900' : 'bg-gray-50'
                                    } rounded-lg p-4 flex items-center justify-center`}>
                                    <AnimationComponent {...demoProps}>
                                        <div className={`text-center font-mono ${animation.universeType === 'star-trek' ? 'text-orange-400' :
                                                animation.universeType === 'star-wars' ? 'text-red-400' :
                                                    animation.universeType === 'cyberpunk' ? 'text-green-400' : 'text-gray-700'
                                            }`}>
                                            {animation.universeType === 'star-trek' && 'SYSTEMS ONLINE'}
                                            {animation.universeType === 'star-wars' && 'IMPERIAL COMMAND'}
                                            {animation.universeType === 'cyberpunk' && 'NEURAL LINK ACTIVE'}
                                        </div>
                                    </AnimationComponent>
                                </div>

                                {/* Examples */}
                                {animation.examples && animation.examples.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                        <strong>Available variations:</strong> {animation.examples.map(ex => ex.name).join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {currentUniverseAnimations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No animations registered for universe: {activeUniverse}
                    </div>
                )}
            </div>

            {/* Architecture Info */}
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">🏗️ Plugin Architecture</h3>
                <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Core Framework:</strong> Provides basic transitions (fade, scale, slide) that work universally</p>
                    <p><strong>Plugin Animations:</strong> Each universe plugin registers its own specialized components</p>
                    <p><strong>Dynamic Loading:</strong> Animations are only loaded when their corresponding plugin is active</p>
                    <p><strong>Theme Integration:</strong> Plugin animations automatically inherit universe-specific styling</p>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-600">
                    <strong>Registry Stats:</strong> {allAnimations.length} total animations • {universeTypes.length} universe types • {currentUniverseAnimations.length} active
                </div>
            </div>
        </div>
    );
};
