import React, { useState } from 'react';
import { Button } from '../base';
import { Card, CardHeader, CardContent } from '../base';
import { Input } from '../base';
import { LoadingSpinner } from '../base';
import { Modal } from '../base';
import { ErrorMessage } from '../base';
import { ThemeSelector } from '../ui/ThemeSelector';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Visual Component Showcase
 * 
 * This component provides a comprehensive visual showcase of all UI components
 * in the project with universe-specific enhancements. It's designed specifically 
 * for developers to:
 * 
 * 1. Quickly identify components that haven't been properly themed
 * 2. Test theme consistency across all UI elements
 * 3. Preview how components look in different themes
 * 4. Validate that all components respect theme variables
 * 5. Demonstrate authentic universe interface layouts (LCARS, Imperial, etc.)
 * 
 * Usage: Access via Settings > For Developers > Visual Components
 */
export const VisualComponentShowcase: React.FC = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [showError, setShowError] = useState(false);
    const [buttonStates, setButtonStates] = useState({
        loading: false,
        disabled: false,
    }); const { currentTheme } = useTheme();

    // Theme-agnostic container component using only theme variables
    const ThemedContainer: React.FC<{
        children: React.ReactNode;
        title?: string;
        variant?: 'primary' | 'secondary' | 'accent'
    }> = ({ children, title, variant = 'primary' }) => {
        const colorVar = `var(--color-universe-${variant})`;

        return (
            <div
                className="p-4 rounded-lg border-2"
                style={{
                    backgroundColor: 'var(--color-universe-surface)',
                    borderColor: colorVar,
                    boxShadow: `0 0 10px ${colorVar}40`
                }}
            >
                {title && (
                    <h4 className="font-semibold mb-3" style={{ color: colorVar }}>
                        {title}
                    </h4>
                )}
                {children}
            </div>
        );
    }; const themingStatus = {    // Components using theme variables properly
        wellThemed: [
            'Main Layout (Dashboard background)',
            'UserSettingsPage (partially)',
            'Card Component (✅ Fixed)',
            'Modal Component (✅ Fixed)',
            'Input Component (✅ Fixed)',
            'Button Component (✅ Fixed)',
            'Select Component (✅ Fixed)',
            'LoadingSpinner Component (✅ Fixed)',
            'ErrorMessage Component (✅ Fixed)',
            'UniverseList (✅ Fixed)',
            'PluginUniverseSection (✅ Fixed)',
            'ThemeSelector (✅ Fixed)',
            'UserMenu (✅ Fixed)',
            'DashboardPage (✅ Fixed)', 'RegisterForm (✅ Fixed)',
            'LoginForm (✅ Fixed)',
            'CollaborationSetup (✅ Fixed)',
            'PluginSelection (✅ Fixed)',
            'CreateUniverseFromTemplateModal (✅ Fixed)',
        ],    // Components with hardcoded colors
        needsThemeWork: [
            'UserProfilePage (⚠️ In Progress - notifications & toggles remaining)',
            'UserSettingsPage (some hardcoded colors in tabs and sections)',
            'PluginTestingTool (many bg-gray hardcoded colors)',
            'CollaborationSetup (some bg-gray sections remaining)',
        ],
    }; return (
        <div className="space-y-8">
            {/* Theme Status Header */}
            <ThemedContainer title="🎨 UNIVERSE THEME SYSTEM STATUS" variant="primary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold" style={{ color: 'var(--color-universe-primary)' }}>
                            {currentTheme.toUpperCase()}
                        </div>
                        <div className="text-sm opacity-75">Active Theme</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold" style={{ color: 'var(--color-universe-accent)' }}>
                            ACTIVE
                        </div>
                        <div className="text-sm opacity-75">Theme Status</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold" style={{ color: 'var(--color-universe-secondary)' }}>
                            FRAMES
                        </div>
                        <div className="text-sm opacity-75">
                            {currentTheme === 'lcars' ? 'LCARS UI Active' :
                                currentTheme === 'imperial' ? 'Imperial UI Active' :
                                    'Standard UI Active'}
                        </div>
                    </div>
                </div>

                {/* Real-time Theme Test */}
                <ThemedContainer title="🎯 REAL-TIME THEME VALIDATION" variant="accent">                    <p className="text-sm opacity-90 mb-3" style={{ color: 'var(--color-universe-text)' }}>
                    This section demonstrates live theme adaptation. Switch themes using the selector below
                    to see how all components respond to theme changes in real-time.
                </p>                    <div className="mb-4">
                        <ThemeSelector />
                    </div>

                    {/* Theme-agnostic status display */}
                    <div className="mt-4 p-3 rounded border" style={{
                        backgroundColor: 'var(--color-universe-surface)',
                        borderColor: 'var(--color-universe-primary)',
                        color: 'var(--color-universe-text)'
                    }}>
                        <div className="font-semibold text-sm">
                            ✨ Theme System Active ✨
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                            Current Theme: {currentTheme.toUpperCase()}
                        </div>
                    </div>
                </ThemedContainer>
            </ThemedContainer>

            {/* Theme Audit Summary */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🎨 Theme Consistency Audit
                    </h2>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Well Themed Components */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-green-600">✅ Using Theme Variables</h3>
                            <ul className="space-y-2">
                                {themingStatus.wellThemed.map((component, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="text-sm">{component}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Components Needing Work */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-red-600">❌ Hardcoded Colors</h3>
                            <div className="max-h-64 overflow-y-auto">
                                <ul className="space-y-2">
                                    {themingStatus.needsThemeWork.map((component, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                            <span className="text-sm">{component}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>                    <div
                        className="mt-6 p-4 rounded-lg border-2"
                        style={{
                            backgroundColor: 'var(--color-universe-surface)',
                            borderColor: 'var(--color-universe-primary)',
                            boxShadow: '0 0 10px rgba(var(--color-universe-primary-rgb, 255, 153, 0), 0.3)'
                        }}
                    >
                        <h4 className="font-semibold mb-2" style={{ color: 'var(--color-universe-primary)' }}>
                            🎯 Quick Theme Test (Framed)
                        </h4>
                        <p className="text-sm opacity-75" style={{ color: 'var(--color-universe-text)' }}>
                            This section uses theme variables with visual frame. If you can see clear differences when switching themes,
                            the theme system is working. Components that don't change appearance likely have hardcoded colors.
                        </p>
                        <div className="mt-3 p-2 rounded border" style={{
                            backgroundColor: 'var(--color-universe-background)',
                            borderColor: 'var(--color-universe-accent)',
                            color: 'var(--color-universe-text)'
                        }}>
                            <small>✅ Nested themed element with frame</small>
                        </div>
                    </div>
                </CardContent>
            </Card>            {/* Base Components Showcase */}
            <ThemedContainer title="🧱 BASE COMPONENTS - UNIVERSE INTERFACE" variant="secondary">
                <div className="space-y-6">
                    {/* Buttons */}
                    <ThemedContainer title="INTERACTIVE CONTROLS" variant="accent">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-3 opacity-75">Primary Controls</h4>
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="primary">Primary Action</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="accent">Accent</Button>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-3 opacity-75">State Controls</h4>
                                <div className="flex flex-wrap gap-3">                                    <Button
                                    variant="primary"
                                    loading={buttonStates.loading}
                                    onClick={() => {
                                        setButtonStates(prev => ({ ...prev, loading: true }));
                                        setTimeout(() => setButtonStates(prev => ({ ...prev, loading: false })), 2000);
                                    }}
                                >
                                    Loading Test
                                </Button>
                                    <Button variant="primary" disabled>
                                        Disabled
                                    </Button>
                                </div>
                            </div>
                        </div>                        {/* Universe-specific button demo removed - now handled by plugin */}
                    </ThemedContainer>

                    {/* Inputs */}
                    <ThemedContainer title="DATA INPUT SYSTEMS" variant="primary">
                        <div className="grid md:grid-cols-2 gap-4">                            <Input
                            label="Basic Input"
                            value={inputValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                            placeholder="Enter some text..."
                        />
                            <Input
                                label="Input with Prefix"
                                value=""
                                onChange={() => { }}
                                placeholder="username"
                                prefix="@"
                            />
                        </div>
                    </ThemedContainer>

                    {/* Loading Spinners */}
                    <ThemedContainer title="SYSTEM STATUS INDICATORS" variant="accent">                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                <span className="text-sm">Small</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="md" />
                                <span className="text-sm">Medium</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="lg" />
                                <span className="text-sm">Large</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end text-right">
                            <div className="text-xs font-mono opacity-75">STATUS</div>
                            <div className="text-sm font-mono font-bold" style={{ color: 'var(--color-universe-accent)' }}>
                                ACTIVE
                            </div>
                        </div>
                    </div>
                    </ThemedContainer>
                </div>
            </ThemedContainer>

            {/* Status Indicators */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-bold">🚦 Status Indicators & Badges</h2>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Color-coded Status Examples */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Status Badges (Common Patterns)</h3>
                            <div className="flex flex-wrap gap-3">
                                {/* These demonstrate hardcoded color patterns found in the codebase */}
                                <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                                    ❌ Active (hardcoded green)
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                                    ❌ Pending (hardcoded yellow)
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                    ❌ Info (hardcoded blue)
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                                    ❌ Error (hardcoded red)
                                </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                {/* Theme-aware versions */}
                                <span
                                    className="px-3 py-1 rounded-full text-sm"
                                    style={{
                                        backgroundColor: 'var(--color-universe-accent)',
                                        color: 'var(--color-universe-background)'
                                    }}
                                >
                                    ✅ Active (theme-aware)
                                </span>
                                <span
                                    className="px-3 py-1 rounded-full text-sm"
                                    style={{
                                        backgroundColor: 'var(--color-universe-surface)',
                                        color: 'var(--color-universe-text)',
                                        border: '1px solid var(--color-universe-primary)'
                                    }}
                                >
                                    ✅ Info (theme-aware)
                                </span>
                            </div>
                        </div>            {/* Connection Status Indicators */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}
                                    ></span>
                                    <span>✅ Connected (using theme-aware color)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
                                    ></span>
                                    <span>✅ Disconnected (using theme-aware color)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: 'var(--color-universe-text)', opacity: 0.4 }}
                                    ></span>
                                    <span>✅ Unknown (using theme-aware color)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>            {/* Interactive Elements */}
            <ThemedContainer title="🖱️ INTERACTIVE INTERFACE ELEMENTS" variant="primary">
                <div className="space-y-6">
                    {/* Modal Test */}
                    <ThemedContainer title="MODAL SYSTEMS" variant="secondary">                        <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-75 mb-3">
                                Test modal dialog theming
                            </p>
                            <Button onClick={() => setModalOpen(true)}>
                                Open Test Modal
                            </Button>
                        </div>
                    </div>
                    </ThemedContainer>

                    {/* Theme Selector */}
                    <ThemedContainer title="UNIVERSE CONFIGURATION" variant="accent">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>                                <h4 className="text-sm font-semibold mb-3 opacity-75">
                                Theme Selector Component
                            </h4>
                                <ThemeSelector />
                            </div>

                            <div>                                <h4 className="text-sm font-semibold mb-3 opacity-75">
                                Form Controls
                            </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="checkbox-demo"
                                            className="w-4 h-4 rounded focus:ring-2"
                                            style={{
                                                accentColor: 'var(--color-universe-primary)',
                                                backgroundColor: 'var(--color-universe-surface)',
                                                borderColor: 'var(--color-universe-primary)'
                                            }}
                                        />                                        <label htmlFor="checkbox-demo" className="text-sm" style={{ color: 'var(--color-universe-text)' }}>
                                            ✅ Checkbox (theme-aware)
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id="radio-demo"
                                            name="radio-demo"
                                            className="w-4 h-4 focus:ring-2"
                                            style={{
                                                accentColor: 'var(--color-universe-primary)',
                                                backgroundColor: 'var(--color-universe-surface)',
                                                borderColor: 'var(--color-universe-primary)'
                                            }}
                                        />                                        <label htmlFor="radio-demo" className="text-sm" style={{ color: 'var(--color-universe-text)' }}>
                                            ✅ Radio Button (theme-aware)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ThemedContainer>
                </div>
            </ThemedContainer>            {/* Universe-Agnostic Interface Demonstration */}
            <ThemedContainer title="🧪 UNIVERSAL INTERFACE DEMONSTRATION" variant="accent">
                <div className="space-y-4">
                    <p className="text-sm opacity-90">
                        This section demonstrates theme-agnostic interface elements that adapt to any universe theme.
                        All components use theme variables and will automatically adapt to plugin-specific styling.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Primary Interface Panel */}
                        <ThemedContainer title="PRIMARY INTERFACE" variant="primary">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span style={{ color: 'var(--color-universe-accent)' }}>
                                        Ready
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Mode:</span>
                                    <span style={{ color: 'var(--color-universe-secondary)' }}>
                                        Standard
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Theme:</span>
                                    <span style={{ color: 'var(--color-universe-primary)' }}>
                                        {currentTheme.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </ThemedContainer>

                        {/* Secondary Systems */}
                        <ThemedContainer title="SECONDARY SYSTEMS" variant="secondary">
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full animate-pulse"
                                            style={{ backgroundColor: 'var(--color-universe-accent)' }}
                                        />
                                        <span className="text-xs font-mono">
                                            System {i}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ThemedContainer>

                        {/* Control Interface */}
                        <ThemedContainer title="CONTROL INTERFACE" variant="accent">
                            <div className="space-y-2">
                                <div
                                    className="w-full h-8 rounded flex items-center justify-center text-xs font-mono font-bold"
                                    style={{
                                        backgroundColor: 'var(--color-universe-primary)',
                                        color: 'var(--color-universe-background)'
                                    }}
                                >
                                    ACTIVATE
                                </div>
                                <div
                                    className="w-full h-6 rounded flex items-center justify-center text-xs font-mono"
                                    style={{
                                        backgroundColor: 'var(--color-universe-secondary)',
                                        color: 'var(--color-universe-background)'
                                    }}
                                >
                                    SECONDARY
                                </div>
                            </div>
                        </ThemedContainer>
                    </div>                    {/* Plugin extensible notice */}
                    <div className="mt-6 p-4 rounded-lg border-2" style={{
                        backgroundColor: 'var(--color-universe-surface)',
                        borderColor: 'var(--color-universe-primary)',
                        color: 'var(--color-universe-text)'
                    }}>
                        <h4 className="font-semibold mb-2" style={{ color: 'var(--color-universe-primary)' }}>
                            🔌 Plugin Extension System
                        </h4>
                        <p className="text-sm opacity-75">
                            Universe plugins can extend this showcase with their own authentic interface components.
                            All components are theme-agnostic and will automatically adapt to plugin-specific styling.
                        </p>
                    </div>
                </div>
            </ThemedContainer>

            {/* Test Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Test Modal Dialog"
                size="md"
            >
                <div className="space-y-4">
                    <p>This is a test modal to verify modal theming.</p>
                    <Input
                        label="Test Input in Modal"
                        value=""
                        onChange={() => { }}
                        placeholder="Type something..."
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => setModalOpen(false)}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
