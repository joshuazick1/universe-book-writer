/**
 * Plugin Feature Testing Tool
 * Comprehensive testing environment for plugin developers
 */

import React, { useState, useEffect } from 'react';
import { pluginService, type PluginInfo } from '../../services/plugin.service';
import { AnimationShowcase } from '../animation/AnimationShowcase';
import { TransitionTester } from '../animation/TransitionTester';
import { PluginAnimationShowcase } from '../animation/PluginAnimationShowcase';
import { VisualComponentShowcase } from './VisualComponentShowcase';

interface PluginTestingToolProps {
    className?: string;
}

export const PluginTestingTool: React.FC<PluginTestingToolProps> = ({ className = '' }) => {
    const [activeTab, setActiveTab] = useState<'registry' | 'visual' | 'integration'>('registry');
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlugin, setSelectedPlugin] = useState<string>('');

    useEffect(() => {
        loadPlugins();
    }, []);
    const loadPlugins = async () => {
        try {
            setLoading(true);
            const response = await pluginService.getPlugins({ includeInactive: true });
            if (response.success && response.data.length > 0) {
                setPlugins(response.data);
                setSelectedPlugin(response.data[0].name);
            } else {
                // No plugins available
                setPlugins([]);
                setSelectedPlugin('');
            }
        } catch (error) {
            console.error('Failed to load plugins:', error);
            setPlugins([]);
            setSelectedPlugin('');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'registry' as const, label: '📋 Plugin Registry', icon: '🔌' },
        { id: 'visual' as const, label: '🎨 Visual Components', icon: '🎭' },
        { id: 'integration' as const, label: '🔧 Integration Testing', icon: '⚙️' },
    ];

    return (
        <div className={`bg-white rounded-lg border ${className}`}>
            <div className="border-b">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2">🧪 Plugin Feature Testing Tool</h2>
                    <p className="text-gray-600 text-sm">
                        Comprehensive testing environment for plugin developers to validate features,
                        visual components, and integrations.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-t bg-gray-50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 bg-white'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {activeTab === 'registry' && (
                    <PluginRegistryTab
                        plugins={plugins}
                        loading={loading}
                        selectedPlugin={selectedPlugin}
                        onPluginSelect={setSelectedPlugin}
                        onRefresh={loadPlugins}
                    />
                )}

                {activeTab === 'visual' && (
                    <VisualComponentsTab
                        selectedPlugin={selectedPlugin}
                        plugins={plugins}
                    />
                )}

                {activeTab === 'integration' && (
                    <IntegrationTestingTab
                        selectedPlugin={selectedPlugin}
                        plugins={plugins}
                    />
                )}
            </div>
        </div>
    );
};

/* === PLUGIN REGISTRY TAB === */

interface PluginRegistryTabProps {
    plugins: PluginInfo[];
    loading: boolean;
    selectedPlugin: string;
    onPluginSelect: (plugin: string) => void;
    onRefresh: () => void;
}

const PluginRegistryTab: React.FC<PluginRegistryTabProps> = ({
    plugins,
    loading,
    selectedPlugin,
    onPluginSelect,
    onRefresh,
}) => {
    const [subUniverses, setSubUniverses] = useState<any[]>([]);
    const [loadingSubUniverses, setLoadingSubUniverses] = useState(false);
    useEffect(() => {
        if (selectedPlugin && plugins.length > 0) {
            loadSubUniverses();
        } else {
            setSubUniverses([]);
        }
    }, [selectedPlugin, plugins]);

    const loadSubUniverses = async () => {
        if (!selectedPlugin || plugins.length === 0) {
            setSubUniverses([]);
            return;
        }

        try {
            setLoadingSubUniverses(true);
            const response = await pluginService.getPluginSubUniverses(selectedPlugin);
            if (response.success) {
                setSubUniverses(response.data.subUniverses || []);
            } else {
                setSubUniverses([]);
            }
        } catch (error) {
            // Silently handle the error for non-existent plugins or those without sub-universes
            setSubUniverses([]);
        } finally {
            setLoadingSubUniverses(false);
        }
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading plugins...</span>
            </div>
        );
    }

    if (plugins.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🔌</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Plugins Available</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    No plugins are currently loaded in the backend system. This could be because:
                </p>
                <div className="text-left bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-6">
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Backend plugin system hasn't been initialized</li>
                        <li>• No plugins have been activated yet</li>
                        <li>• Plugin files exist but aren't loaded</li>
                        <li>• Backend server connection issues</li>
                    </ul>
                </div>
                <button
                    onClick={onRefresh}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🔄 Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Plugin Selection */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Test Plugin:</label>
                    <select
                        value={selectedPlugin}
                        onChange={(e) => onPluginSelect(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select a plugin...</option>
                        {plugins.map((plugin) => (
                            <option key={plugin.name} value={plugin.name}>
                                {plugin.name} v{plugin.version} ({plugin.state})
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={onRefresh}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {selectedPlugin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Plugin Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Plugin Information</h3>
                        {(() => {
                            const plugin = plugins.find(p => p.name === selectedPlugin);
                            if (!plugin) return <p className="text-gray-500">Plugin not found</p>;

                            return (
                                <div className="space-y-2 text-sm">
                                    <div><strong>Name:</strong> {plugin.name}</div>
                                    <div><strong>Version:</strong> {plugin.version}</div>
                                    <div><strong>Type:</strong> {plugin.type}</div>
                                    <div><strong>State:</strong>
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${plugin.state === 'loaded' ? 'bg-green-100 text-green-800' :
                                            plugin.state === 'unloaded' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {plugin.state}
                                        </span>
                                    </div>
                                    <div><strong>Description:</strong> {plugin.description}</div>
                                    <div><strong>Author:</strong> {plugin.author}</div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Sub-Universes */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Sub-Universes</h3>
                        {loadingSubUniverses ? (
                            <div className="text-sm text-gray-500">Loading sub-universes...</div>
                        ) : subUniverses.length > 0 ? (
                            <div className="space-y-3">
                                {subUniverses.map((subUniverse, index) => (
                                    <div key={index} className="bg-white rounded p-3 border">
                                        <div className="font-medium text-sm">{subUniverse.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">{subUniverse.description}</div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {subUniverse.canonLevel}
                                            </span>
                                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                {subUniverse.defaultEra}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">No sub-universes defined</div>
                        )}
                    </div>
                </div>
            )}

            {/* Registry Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-800">Registry Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{plugins.length}</div>
                        <div className="text-blue-700">Total Plugins</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {plugins.filter(p => p.state === 'loaded').length}
                        </div>
                        <div className="text-green-700">Active</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {plugins.filter(p => p.type === 'universe').length}
                        </div>
                        <div className="text-purple-700">Universe Plugins</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {subUniverses.length}
                        </div>
                        <div className="text-orange-700">Sub-Universes</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* === VISUAL COMPONENTS TAB === */

interface VisualComponentsTabProps {
    selectedPlugin: string;
    plugins: PluginInfo[];
}

const VisualComponentsTab: React.FC<VisualComponentsTabProps> = ({
    selectedPlugin,
    plugins,
}) => {
    const [activeDemo, setActiveDemo] = useState<'animations' | 'modals' | 'themes' | 'plugin-specific'>('animations');

    const demos = [
        { id: 'animations' as const, label: '🎬 Animations', description: 'Core animation framework' },
        { id: 'modals' as const, label: '🪟 Modals & Dialogs', description: 'Modal components and overlays' },
        { id: 'themes' as const, label: '🎨 Themes & Styling', description: 'Theme system and visual styles' },
        { id: 'plugin-specific' as const, label: '🔌 Plugin Components', description: 'Universe-specific visual elements' },
    ];

    return (
        <div className="space-y-6">
            {/* Demo Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {demos.map((demo) => (
                    <button
                        key={demo.id}
                        onClick={() => setActiveDemo(demo.id)}
                        className={`p-4 rounded-lg border transition-colors text-left ${activeDemo === demo.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <div className="font-medium text-sm">{demo.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{demo.description}</div>
                    </button>
                ))}
            </div>

            {/* Demo Content */}
            <div className="border rounded-lg p-6 bg-gray-50">
                {activeDemo === 'animations' && (
                    <div className="space-y-8">
                        <TransitionTester />
                        <PluginAnimationShowcase />
                    </div>
                )}

                {activeDemo === 'modals' && (
                    <ModalTestingDemo />
                )}                {activeDemo === 'themes' && (
                    <VisualComponentShowcase />
                )}

                {activeDemo === 'plugin-specific' && (
                    <PluginSpecificDemo selectedPlugin={selectedPlugin} />
                )}
            </div>
        </div>
    );
};

/* === INTEGRATION TESTING TAB === */

interface IntegrationTestingTabProps {
    selectedPlugin: string;
    plugins: PluginInfo[];
}

const IntegrationTestingTab: React.FC<IntegrationTestingTabProps> = ({
    selectedPlugin,
    plugins,
}) => {
    return (
        <div className="space-y-6">
            <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🚧</div>
                <h3 className="text-lg font-medium mb-2">Integration Testing</h3>
                <p className="text-sm">
                    API testing, performance benchmarking, and cross-plugin compatibility tests will be implemented here.
                </p>
            </div>
        </div>
    );
};

/* === DEMO COMPONENTS === */

const ModalTestingDemo: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [showToast, setShowToast] = useState(false);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Modal & Dialog Testing</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => setShowModal(true)}
                    className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🪟 Test Modal Dialog
                </button>

                <button
                    onClick={() => setShowToast(true)}
                    className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    🍞 Test Toast Notification
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h4 className="text-lg font-semibold mb-4">Test Modal</h4>
                        <p className="text-gray-600 mb-4">This is a test modal dialog for plugin developers.</p>
                        <button
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showToast && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    Toast notification test!
                    <button
                        onClick={() => setShowToast(false)}
                        className="ml-4 text-green-200 hover:text-white"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

const PluginSpecificDemo: React.FC<{ selectedPlugin: string }> = ({ selectedPlugin }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Plugin-Specific Components</h3>
            <div className="text-gray-600">
                Testing components specific to: <strong>{selectedPlugin || 'None selected'}</strong>
            </div>

            {selectedPlugin ? (
                <div className="p-8 bg-gray-100 rounded-lg text-center">
                    <div className="text-4xl mb-4">🔌</div>
                    <p className="text-gray-600">Plugin-specific component demos will appear here when implemented.</p>
                </div>
            ) : (
                <div className="p-8 bg-yellow-50 rounded-lg text-center border border-yellow-200">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-yellow-800">Please select a plugin to test its specific components.</p>
                </div>
            )}
        </div>
    );
};
