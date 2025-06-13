/**
 * User Settings Page Component
 * Application preferences and configuration settings
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../../base/Card';

// AI Settings Interfaces
interface OllamaServerSettings {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  priority: number;
  models: string[];
}

interface AISettings {
  ollamaServers: OllamaServerSettings[];
  defaultModel: string;
  requestTimeout: number;
  contextWindow: number;
  enableAIAssistance: boolean;
}

// Editor & Writing Settings
interface EditorSettings {
  theme: 'light' | 'dark' | 'auto' | 'universe-specific';
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  grammarCheck: boolean;
  writingMode: 'distraction-free' | 'normal' | 'split-view';
}

// Plugin Settings
interface PluginSettings {
  enabledPlugins: string[];
  autoUpdatePlugins: boolean;
  allowBetaPlugins: boolean;
  pluginSecurityLevel: 'strict' | 'moderate' | 'permissive';
}

// Collaboration Settings
interface CollaborationSettings {
  enableRealTimeEditing: boolean;
  showOtherCursors: boolean;
  enableComments: boolean;
  enableSuggestions: boolean;
  defaultPermissionLevel: 'read' | 'comment' | 'edit';
  notifyOnChanges: boolean;
  conflictResolution: 'manual' | 'auto-merge' | 'latest-wins';
}

// Application Settings
interface ApplicationSettings {
  defaultUniverseType: string;
  maxRecentProjects: number;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

// Data & Backup Settings
interface DataSettings {
  autoBackup: boolean;
  backupInterval: 'daily' | 'weekly' | 'monthly';
  maxBackupFiles: number;
  exportFormat: 'json' | 'markdown' | 'docx' | 'pdf';
  enableCloudSync: boolean;
  compressionLevel: 'none' | 'low' | 'high';
}

export const UserSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'application' | 'editor' | 'ai' | 'plugins' | 'collaboration' | 'data'
  >('application');

  // Settings state
  const [aiSettings, setAISettings] = useState<AISettings>({
    ollamaServers: [
      {
        id: 'local-1',
        name: 'Local Ollama Server',
        url: 'http://localhost:11434',
        enabled: true,
        priority: 1,
        models: ['llama2', 'codellama', 'mistral'],
      },
    ],
    defaultModel: 'llama2',
    requestTimeout: 30000,
    contextWindow: 4000,
    enableAIAssistance: true,
  });

  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    theme: 'auto',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    lineNumbers: true,
    wordWrap: true,
    autoSave: true,
    autoSaveInterval: 60,
    spellCheck: true,
    grammarCheck: true,
    writingMode: 'normal',
  });

  const [pluginSettings, setPluginSettings] = useState<PluginSettings>({
    enabledPlugins: ['star-trek-universe', 'core-sci-fi'],
    autoUpdatePlugins: true,
    allowBetaPlugins: false,
    pluginSecurityLevel: 'moderate',
  });

  const [collaborationSettings, setCollaborationSettings] = useState<CollaborationSettings>({
    enableRealTimeEditing: true,
    showOtherCursors: true,
    enableComments: true,
    enableSuggestions: true,
    defaultPermissionLevel: 'comment',
    notifyOnChanges: true,
    conflictResolution: 'manual',
  });

  const [applicationSettings, setApplicationSettings] = useState<ApplicationSettings>({
    defaultUniverseType: 'custom',
    maxRecentProjects: 10,
    enableAnalytics: false,
    enableCrashReporting: true,
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
  });

  const [dataSettings, setDataSettings] = useState<DataSettings>({
    autoBackup: true,
    backupInterval: 'daily',
    maxBackupFiles: 30,
    exportFormat: 'json',
    enableCloudSync: false,
    compressionLevel: 'low',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API calls to save settings
      console.log('Saving settings...', {
        ai: aiSettings,
        editor: editorSettings,
        plugins: pluginSettings,
        collaboration: collaborationSettings,
        application: applicationSettings,
        data: dataSettings,
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'application' as const, label: 'Application', icon: '⚙️' },
    { id: 'editor' as const, label: 'Editor', icon: '📝' },
    { id: 'ai' as const, label: 'AI Assistant', icon: '🤖' },
    { id: 'plugins' as const, label: 'Plugins', icon: '�' },
    { id: 'collaboration' as const, label: 'Collaboration', icon: '�' },
    { id: 'data' as const, label: 'Data & Backup', icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">
              Configure your application preferences and system settings
            </p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Application Settings Tab */}
              {activeTab === 'application' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">General Preferences</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Configure general application settings and preferences
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Default Universe Type
                            </label>
                            <select
                              value={applicationSettings.defaultUniverseType}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  defaultUniverseType: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="custom">Custom Universe</option>
                              <option value="star-trek">Star Trek</option>
                              <option value="star-wars">Star Wars</option>
                              <option value="sci-fi-generic">Generic Sci-Fi</option>
                              <option value="fantasy">Fantasy</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Language
                            </label>
                            <select
                              value={applicationSettings.language}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  language: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="en">English</option>
                              <option value="es">Spanish</option>
                              <option value="fr">French</option>
                              <option value="de">German</option>
                              <option value="ja">Japanese</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Max Recent Projects
                            </label>
                            <input
                              type="number"
                              min="5"
                              max="50"
                              value={applicationSettings.maxRecentProjects}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  maxRecentProjects: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Timezone
                            </label>
                            <select
                              value={applicationSettings.timezone}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  timezone: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="America/New_York">Eastern Time</option>
                              <option value="America/Chicago">Central Time</option>
                              <option value="America/Denver">Mountain Time</option>
                              <option value="America/Los_Angeles">Pacific Time</option>
                              <option value="UTC">UTC</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={applicationSettings.enableAnalytics}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  enableAnalytics: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Enable analytics to help improve the application
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={applicationSettings.enableCrashReporting}
                              onChange={e =>
                                setApplicationSettings(prev => ({
                                  ...prev,
                                  enableCrashReporting: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Send crash reports to help fix issues
                            </label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Editor Settings Tab */}
              {activeTab === 'editor' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Editor Preferences</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Customize your writing environment and tools
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Theme
                            </label>
                            <select
                              value={editorSettings.theme}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  theme: e.target.value as EditorSettings['theme'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="light">Light</option>
                              <option value="dark">Dark</option>
                              <option value="auto">Auto (System)</option>
                              <option value="universe-specific">Universe Theme</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Font Size
                            </label>
                            <select
                              value={editorSettings.fontSize}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  fontSize: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="12">Small (12px)</option>
                              <option value="14">Medium (14px)</option>
                              <option value="16">Large (16px)</option>
                              <option value="18">Extra Large (18px)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Font Family
                          </label>
                          <select
                            value={editorSettings.fontFamily}
                            onChange={e =>
                              setEditorSettings(prev => ({
                                ...prev,
                                fontFamily: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
                            <option value="Georgia, serif">Georgia (Serif)</option>
                            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                            <option value="'Times New Roman', serif">Times New Roman</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Auto-save Interval (seconds)
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="300"
                              value={editorSettings.autoSaveInterval}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  autoSaveInterval: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Writing Mode
                            </label>
                            <select
                              value={editorSettings.writingMode}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  writingMode: e.target.value as EditorSettings['writingMode'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="normal">Normal</option>
                              <option value="distraction-free">Distraction-free</option>
                              <option value="split-view">Split View</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editorSettings.lineNumbers}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  lineNumbers: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Show line numbers</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editorSettings.wordWrap}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  wordWrap: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable word wrap</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editorSettings.autoSave}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  autoSave: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable auto-save</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editorSettings.spellCheck}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  spellCheck: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable spell check</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editorSettings.grammarCheck}
                              onChange={e =>
                                setEditorSettings(prev => ({
                                  ...prev,
                                  grammarCheck: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable grammar check</label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Settings Tab */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">AI Assistant Configuration</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Configure AI models and servers for writing assistance
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={aiSettings.enableAIAssistance}
                            onChange={e =>
                              setAISettings(prev => ({
                                ...prev,
                                enableAIAssistance: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Enable AI writing assistance</label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Default Model
                            </label>
                            <select
                              value={aiSettings.defaultModel}
                              onChange={e =>
                                setAISettings(prev => ({
                                  ...prev,
                                  defaultModel: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="llama2">Llama 2</option>
                              <option value="codellama">Code Llama</option>
                              <option value="mistral">Mistral</option>
                              <option value="gemma">Gemma</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Request Timeout (seconds)
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="120"
                              value={aiSettings.requestTimeout / 1000}
                              onChange={e =>
                                setAISettings(prev => ({
                                  ...prev,
                                  requestTimeout: parseInt(e.target.value) * 1000,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Context Window (tokens)
                          </label>
                          <input
                            type="number"
                            min="1000"
                            max="8000"
                            value={aiSettings.contextWindow}
                            onChange={e =>
                              setAISettings(prev => ({
                                ...prev,
                                contextWindow: parseInt(e.target.value),
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Ollama Servers</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Manage your Ollama server connections
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {aiSettings.ollamaServers.map(server => (
                          <div
                            key={server.id}
                            className="p-4 border border-gray-200 rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <h4 className="font-medium">{server.name}</h4>
                              <p className="text-sm text-gray-600">{server.url}</p>
                              <p className="text-xs text-gray-500">
                                Models: {server.models.join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  server.enabled ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              />
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                        <button className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
                          + Add Server
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Plugin Settings Tab */}
              {activeTab === 'plugins' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Plugin Management</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Manage installed plugins and universe extensions
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pluginSettings.autoUpdatePlugins}
                              onChange={e =>
                                setPluginSettings(prev => ({
                                  ...prev,
                                  autoUpdatePlugins: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Automatically update plugins
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pluginSettings.allowBetaPlugins}
                              onChange={e =>
                                setPluginSettings(prev => ({
                                  ...prev,
                                  allowBetaPlugins: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Allow beta plugins (experimental)
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Security Level
                          </label>
                          <select
                            value={pluginSettings.pluginSecurityLevel}
                            onChange={e =>
                              setPluginSettings(prev => ({
                                ...prev,
                                pluginSecurityLevel: e.target.value as PluginSettings['pluginSecurityLevel'],
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="strict">Strict - Only verified plugins</option>
                            <option value="moderate">Moderate - Trusted sources</option>
                            <option value="permissive">Permissive - All plugins allowed</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Installed Plugins</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Universe plugins and extensions currently installed
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Star Trek Universe</h4>
                            <p className="text-sm text-gray-600">
                              Official Star Trek universe plugin with LCARS theme
                            </p>
                            <p className="text-xs text-gray-500">Version 1.2.0</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Configure</button>
                          </div>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Core Sci-Fi Tools</h4>
                            <p className="text-sm text-gray-600">
                              Generic science fiction writing tools and templates
                            </p>
                            <p className="text-xs text-gray-500">Version 2.1.5</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Configure</button>
                          </div>
                        </div>
                        <button className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
                          + Browse Plugin Store
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Collaboration Settings Tab */}
              {activeTab === 'collaboration' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Real-time Collaboration</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Configure how you collaborate with other writers
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={collaborationSettings.enableRealTimeEditing}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  enableRealTimeEditing: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Enable real-time collaborative editing
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={collaborationSettings.showOtherCursors}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  showOtherCursors: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Show other users' cursors and selections
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={collaborationSettings.enableComments}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  enableComments: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable comments and annotations</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={collaborationSettings.enableSuggestions}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  enableSuggestions: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable suggestion mode</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={collaborationSettings.notifyOnChanges}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  notifyOnChanges: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Notify when others make changes
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Default Permission Level
                            </label>
                            <select
                              value={collaborationSettings.defaultPermissionLevel}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  defaultPermissionLevel: e.target.value as CollaborationSettings['defaultPermissionLevel'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="read">Read Only</option>
                              <option value="comment">Comment</option>
                              <option value="edit">Edit</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Conflict Resolution
                            </label>
                            <select
                              value={collaborationSettings.conflictResolution}
                              onChange={e =>
                                setCollaborationSettings(prev => ({
                                  ...prev,
                                  conflictResolution: e.target.value as CollaborationSettings['conflictResolution'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="manual">Manual Resolution</option>
                              <option value="auto-merge">Auto-merge</option>
                              <option value="latest-wins">Latest Writer Wins</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Data & Backup Settings Tab */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Backup & Export</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Configure data backup and export preferences
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={dataSettings.autoBackup}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  autoBackup: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">Enable automatic backups</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={dataSettings.enableCloudSync}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  enableCloudSync: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Enable cloud synchronization (Future feature)
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backup Interval
                            </label>
                            <select
                              value={dataSettings.backupInterval}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  backupInterval: e.target.value as DataSettings['backupInterval'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Max Backup Files
                            </label>
                            <input
                              type="number"
                              min="5"
                              max="100"
                              value={dataSettings.maxBackupFiles}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  maxBackupFiles: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Default Export Format
                            </label>
                            <select
                              value={dataSettings.exportFormat}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  exportFormat: e.target.value as DataSettings['exportFormat'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="json">JSON</option>
                              <option value="markdown">Markdown</option>
                              <option value="docx">Word Document</option>
                              <option value="pdf">PDF</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Compression Level
                            </label>
                            <select
                              value={dataSettings.compressionLevel}
                              onChange={e =>
                                setDataSettings(prev => ({
                                  ...prev,
                                  compressionLevel: e.target.value as DataSettings['compressionLevel'],
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="none">None</option>
                              <option value="low">Low</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-semibold">Data Management</h2>
                      <p className="text-gray-600 text-sm mt-1">
                        Manage your stored data and backups
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <button className="w-full px-4 py-3 text-left bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          Create Manual Backup
                        </button>
                        <button className="w-full px-4 py-3 text-left bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                          Export All Data
                        </button>
                        <button className="w-full px-4 py-3 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          View Backup History
                        </button>
                        <button className="w-full px-4 py-3 text-left bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                          Import Data
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Save Settings Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving Settings...' : 'Save All Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
