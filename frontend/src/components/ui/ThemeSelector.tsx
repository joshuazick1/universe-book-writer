/**
 * Theme Selector Component - VerseForge
 * Provides UI for users to select and switch between available themes
 */

import React, { useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';

// Simple SVG icon components to replace Heroicons
const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

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

/* === TYPES === */

interface ThemeSelectorProps {
    className?: string;
    showLabels?: boolean;
    compact?: boolean;
}

/* === COMPONENT === */

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    className = '',
    showLabels = true,
    compact = false,
}) => {
    const { currentTheme, availableThemes, setTheme, themeConfig, isPluginTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    /* === THEME CATEGORIZATION === */

    const categorizeThemes = () => {
        const systemThemes = availableThemes.filter(theme => !isPluginTheme(theme));
        const pluginThemes = availableThemes.filter(theme => isPluginTheme(theme));

        return {
            system: systemThemes,
            plugin: pluginThemes,
        };
    };

    const { system: systemThemes, plugin: pluginThemes } = categorizeThemes();

    /* === THEME PREVIEW === */

    const getThemePreview = (themeName: string) => {
        // For current theme, use themeConfig
        if (themeName === currentTheme && themeConfig) {
            return themeConfig.colors.primary;
        }

        // For other themes, we'll need to get their configs
        // This is a simplified version - you might want to store all theme configs
        const themeColors: Record<string, string> = {
            default: '#0ea5e9',
            dark: '#0ea5e9',
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

    /* === THEME DISPLAY NAMES === */

    const getThemeDisplayName = (themeName: string) => {
        const displayNames: Record<string, string> = {
            default: 'Default',
            dark: 'Dark',
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

    /* === EVENT HANDLERS === */

    const handleThemeSelect = (themeName: string) => {
        setTheme(themeName);
        setIsOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent, themeName: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleThemeSelect(themeName);
        }
    };

    /* === RENDER === */    if (compact) {
        return (
            <div className={`relative ${className}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 px-3 py-2 border rounded-md shadow-sm hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                    style={{
                        backgroundColor: 'var(--color-universe-surface)',
                        borderColor: 'var(--color-universe-primary)',
                        color: 'var(--color-universe-text)'
                    }}
                    aria-label="Select theme"
                >
                    <div
                        className="w-4 h-4 rounded-full border"
                        style={{
                            backgroundColor: getThemePreview(currentTheme),
                            borderColor: 'var(--color-universe-primary)'
                        }}
                    />
                    <ChevronDownIcon className="w-4 h-4 opacity-60" />
                </button>

                {isOpen && (
                    <div
                        className="absolute top-full left-0 mt-1 w-48 border rounded-md shadow-lg z-50"
                        style={{
                            backgroundColor: 'var(--color-universe-surface)',
                            borderColor: 'var(--color-universe-primary)'
                        }}
                    >
                        {systemThemes.length > 0 && (
                            <div className="p-2">
                                <div
                                    className="text-xs font-medium mb-2 opacity-60"
                                    style={{ color: 'var(--color-universe-text)' }}
                                >
                                    System Themes
                                </div>                                {systemThemes.map(theme => (
                                    <button
                                        key={theme}
                                        onClick={() => handleThemeSelect(theme)}
                                        className={`flex items-center space-x-3 w-full px-2 py-2 text-sm rounded transition-all ${currentTheme === theme ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                                            }`}
                                        style={{
                                            backgroundColor: currentTheme === theme ? 'var(--color-universe-accent)' : 'transparent',
                                            color: currentTheme === theme ? 'var(--color-universe-background)' : 'var(--color-universe-text)'
                                        }}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full border"
                                            style={{
                                                backgroundColor: getThemePreview(theme),
                                                borderColor: 'var(--color-universe-primary)'
                                            }}
                                        />
                                        <span>{getThemeDisplayName(theme)}</span>
                                    </button>
                                ))}
                            </div>
                        )}                        {pluginThemes.length > 0 && (
                            <div
                                className="p-2 border-t"
                                style={{ borderColor: 'var(--color-universe-primary)' }}
                            >
                                <div
                                    className="text-xs font-medium mb-2 opacity-60"
                                    style={{ color: 'var(--color-universe-text)' }}
                                >
                                    Plugin Themes
                                </div>                                {pluginThemes.map(theme => (
                                    <button
                                        key={theme}
                                        onClick={() => handleThemeSelect(theme)}
                                        className={`flex items-center space-x-3 w-full px-2 py-2 text-sm rounded transition-all ${currentTheme === theme ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                                            }`}
                                        style={{
                                            backgroundColor: currentTheme === theme ? 'var(--color-universe-accent)' : 'transparent',
                                            color: currentTheme === theme ? 'var(--color-universe-background)' : 'var(--color-universe-text)'
                                        }}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full border"
                                            style={{
                                                backgroundColor: getThemePreview(theme),
                                                borderColor: 'var(--color-universe-primary)'
                                            }}
                                        />
                                        <span>{getThemeDisplayName(theme)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>            {showLabels && (
            <div className="flex items-center space-x-2">
                <SwatchIcon className="w-5 h-5 opacity-60" />
                <h3
                    className="text-lg font-medium"
                    style={{ color: 'var(--color-universe-text)' }}
                >
                    Theme Selection
                </h3>
            </div>
        )}

            {/* System Themes */}
            {systemThemes.length > 0 && (
                <div>
                    <div
                        className="text-sm font-medium mb-3 opacity-75"
                        style={{ color: 'var(--color-universe-text)' }}
                    >
                        System Themes
                    </div>                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {systemThemes.map(theme => (
                            <button
                                key={theme}
                                onClick={() => handleThemeSelect(theme)}
                                onKeyDown={(e) => handleKeyDown(e, theme)}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${currentTheme === theme ? 'ring-2' : 'hover:opacity-80'
                                    }`}
                                style={{
                                    borderColor: currentTheme === theme ? 'var(--color-universe-primary)' : 'var(--color-universe-primary)',
                                    backgroundColor: currentTheme === theme ? 'var(--color-universe-accent)' : 'var(--color-universe-surface)',
                                    color: 'var(--color-universe-text)'
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full border-2 shadow-sm"
                                    style={{
                                        backgroundColor: getThemePreview(theme),
                                        borderColor: 'var(--color-universe-background)'
                                    }}
                                />
                                <div className="text-left">
                                    <div className="font-medium">
                                        {getThemeDisplayName(theme)}
                                    </div>
                                    {currentTheme === theme && (
                                        <div
                                            className="text-xs opacity-75"
                                            style={{ color: 'var(--color-universe-text)' }}
                                        >
                                            Current theme
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}            {/* Plugin Themes */}
            {pluginThemes.length > 0 && (
                <div>
                    <div
                        className="text-sm font-medium mb-3 opacity-75"
                        style={{ color: 'var(--color-universe-text)' }}
                    >
                        Plugin Themes
                    </div>                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pluginThemes.map(theme => (
                            <button
                                key={theme}
                                onClick={() => handleThemeSelect(theme)}
                                onKeyDown={(e) => handleKeyDown(e, theme)}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${currentTheme === theme ? 'ring-2' : 'hover:opacity-80'
                                    }`}
                                style={{
                                    borderColor: currentTheme === theme ? 'var(--color-universe-primary)' : 'var(--color-universe-primary)',
                                    backgroundColor: currentTheme === theme ? 'var(--color-universe-accent)' : 'var(--color-universe-surface)',
                                    color: 'var(--color-universe-text)'
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full border-2 shadow-sm"
                                    style={{
                                        backgroundColor: getThemePreview(theme),
                                        borderColor: 'var(--color-universe-background)'
                                    }}
                                />
                                <div className="text-left">
                                    <div className="font-medium">
                                        {getThemeDisplayName(theme)}
                                    </div>                                    <div
                                        className="text-xs opacity-60"
                                        style={{ color: 'var(--color-universe-text)' }}
                                    >
                                        Plugin theme
                                    </div>
                                    {currentTheme === theme && (
                                        <div
                                            className="text-xs opacity-75"
                                            style={{ color: 'var(--color-universe-text)' }}
                                        >
                                            Current theme
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}            {availableThemes.length === 0 && (
                <div
                    className="text-center py-8 opacity-60"
                    style={{ color: 'var(--color-universe-text)' }}
                >
                    No themes available
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;
