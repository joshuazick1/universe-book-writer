/**
 * User Settings Page Component
 * Application preferences and configuration settings
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../../base/Card';
import { AnimationShowcase } from '../../animation/AnimationShowcase';
import { TransitionTester } from '../../animation/TransitionTester';
import { PluginTestingTool } from '../../developer/PluginTestingTool';
import { useTheme } from '../../providers/ThemeProvider';

// Simple SVG icon component to replace Heroicons
const SwatchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 21h10a2 2 0 002-2v-4a2 2 0 00-2-2H7M7 21V9a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2 2z"
    />
  </svg>
);
import { logger } from '../../../utils/logger';

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
    'application' | 'editor' | 'ai' | 'plugins' | 'collaboration' | 'data' | 'developers'
  >('application');

  // Get theme context
  const { currentTheme, availableThemes, setTheme, isPluginTheme } = useTheme();

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
      logger.info('Saving settings...', {
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
      logger.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'application' as const, label: 'Application', icon: '⚙️' },
    { id: 'editor' as const, label: 'Editor', icon: '📝' },
    { id: 'ai' as const, label: 'AI Assistant', icon: '🤖' },
    { id: 'plugins' as const, label: 'Plugins', icon: '🔌' },
    { id: 'collaboration' as const, label: 'Collaboration', icon: '👥' },
    { id: 'data' as const, label: 'Data & Backup', icon: '💾' },
    { id: 'developers' as const, label: 'For Developers', icon: '🛠️' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-universe-background)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-universe-text)' }}>Settings</h1>
            <p className="mt-2" style={{ color: 'var(--color-universe-text)', opacity: 0.7 }}>
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
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === tab.id
                      ? 'border'
                      : 'hover:opacity-75'
                      }`}
                    style={{
                      backgroundColor: activeTab === tab.id
                        ? 'var(--color-universe-primary)'
                        : 'var(--color-universe-surface)',
                      color: activeTab === tab.id
                        ? 'white'
                        : 'var(--color-universe-text)',
                      borderColor: activeTab === tab.id
                        ? 'var(--color-universe-primary)'
                        : 'transparent'
                    }}
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

                        {/* Theme Selection */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <SwatchIcon className="w-5 h-5 text-gray-600" />
                            <h3 className="text-lg font-medium text-gray-900">Theme Selection</h3>
                          </div>
                          <p className="text-sm text-gray-600">
                            Choose your application theme. Plugin themes are available globally regardless of which universe you're working in.
                          </p>

                          <div className="space-y-4">
                            {/* System Themes */}
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-3">System Themes</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableThemes.filter(theme => !isPluginTheme(theme)).map(theme => (
                                  <button
                                    key={theme}
                                    onClick={() => setTheme(theme)}
                                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${currentTheme === theme
                                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20'
                                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                      style={{
                                        backgroundColor: theme === 'default' ? '#0ea5e9' :
                                          theme === 'dark' ? '#0ea5e9' : '#0ea5e9'
                                      }}
                                    />
                                    <div className="text-left">
                                      <div className="font-medium text-gray-900">
                                        {theme === 'default' ? 'Default' :
                                          theme === 'dark' ? 'Dark' :
                                            theme.charAt(0).toUpperCase() + theme.slice(1)}
                                      </div>
                                      {currentTheme === theme && (
                                        <div className="text-xs text-blue-600">Current theme</div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Plugin Themes */}
                            {availableThemes.filter(theme => isPluginTheme(theme)).length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 mb-3">Plugin Themes</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {availableThemes.filter(theme => isPluginTheme(theme)).map(theme => {
                                    const getThemeColor = (themeName: string) => {
                                      const themeColors: Record<string, string> = {
                                        lcars: '#ff9900',
                                        imperial: '#cc0000',
                                        rebel: '#ff6600',
                                        gryffindor: '#740001',
                                        hufflepuff: '#ffdb00',
                                        ravenclaw: '#0e1a40',
                                        slytherin: '#1a472a',
                                      };
                                      return themeColors[themeName] || '#0ea5e9';
                                    };

                                    const getThemeDisplayName = (themeName: string) => {
                                      const displayNames: Record<string, string> = {
                                        lcars: 'LCARS (Star Trek)',
                                        imperial: 'Imperial (Star Wars)',
                                        rebel: 'Rebel Alliance (Star Wars)',
                                        gryffindor: 'Gryffindor (Harry Potter)',
                                        hufflepuff: 'Hufflepuff (Harry Potter)',
                                        ravenclaw: 'Ravenclaw (Harry Potter)',
                                        slytherin: 'Slytherin (Harry Potter)',
                                      };
                                      return displayNames[themeName] || themeName.charAt(0).toUpperCase() + themeName.slice(1);
                                    };

                                    return (
                                      <button
                                        key={theme}
                                        onClick={() => setTheme(theme)}
                                        className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 ${currentTheme === theme
                                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20'
                                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                      >
                                        <div
                                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                          style={{ backgroundColor: getThemeColor(theme) }}
                                        />
                                        <div className="text-left">
                                          <div className="font-medium text-gray-900">
                                            {getThemeDisplayName(theme)}
                                          </div>
                                          <div className="text-xs text-gray-500">Plugin theme</div>
                                          {currentTheme === theme && (
                                            <div className="text-xs text-blue-600">Current theme</div>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
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
                            <label className="ml-2 text-sm text-gray-700">
                              Enable grammar check
                            </label>
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
                          <label className="ml-2 text-sm text-gray-700">
                            Enable AI writing assistance
                          </label>
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
                                className={`inline-block w-3 h-3 rounded-full ${server.enabled ? 'bg-green-500' : 'bg-gray-300'
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
                                pluginSecurityLevel: e.target
                                  .value as PluginSettings['pluginSecurityLevel'],
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
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              Configure
                            </button>
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
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              Configure
                            </button>
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
                            <label className="ml-2 text-sm text-gray-700">
                              Enable comments and annotations
                            </label>
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
                            <label className="ml-2 text-sm text-gray-700">
                              Enable suggestion mode
                            </label>
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
                                  defaultPermissionLevel: e.target
                                    .value as CollaborationSettings['defaultPermissionLevel'],
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
                                  conflictResolution: e.target
                                    .value as CollaborationSettings['conflictResolution'],
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
                            <label className="ml-2 text-sm text-gray-700">
                              Enable automatic backups
                            </label>
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
                                  compressionLevel: e.target
                                    .value as DataSettings['compressionLevel'],
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

              {/* For Developers Tab */}
              {activeTab === 'developers' && (
                <div className="space-y-6">
                  <PluginTestingTool />
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
