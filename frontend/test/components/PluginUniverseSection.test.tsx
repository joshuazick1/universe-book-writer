/**
 * @fileoverview Test suite for PluginUniverseSection component
 */

// Mocks before imports
jest.mock('../../src/services/plugin.service', () => ({
    pluginService: {
        getPlugins: jest.fn(),
        getPluginSubUniverses: jest.fn(),
    },
}));
const mockPluginService = jest.mocked(require('../../src/services/plugin.service').pluginService);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Helper to mock usePluginTemplates hook
const mockUsePluginTemplates = (returnValue: any) => {
    jest.spyOn(require('../../src/hooks/plugin.hooks.js'), 'usePluginTemplates').mockReturnValue(returnValue);
};

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PluginUniverseSection } from '../../src/components/universe/PluginUniverseSection.js';

// Test wrapper with router
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>{children}</BrowserRouter>
);

describe('PluginUniverseSection', () => {
    const mockOnSelectTemplate = jest.fn();

    beforeEach(() => {
        mockNavigate.mockClear();
        mockPluginService.getPlugins.mockReset();
        mockPluginService.getPluginSubUniverses.mockReset();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should display loading state', () => {
        mockUsePluginTemplates({
            templates: [],
            loading: true,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        expect(screen.getByText('Loading universe plugins...')).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
    });

    it('should display error state', () => {
        const errorMessage = 'Failed to load plugins';
        mockUsePluginTemplates({
            templates: [],
            loading: false,
            error: errorMessage,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        expect(screen.getByText(`Error loading plugins: ${errorMessage}`)).toBeInTheDocument();
    });

    it('should display no plugins message when empty', () => {
        mockUsePluginTemplates({
            templates: [],
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        expect(screen.getByText('No universe plugins found.')).toBeInTheDocument();
    });

    it('should render plugin templates with sub-universes', () => {
        const mockTemplates = [
            {
                id: 'star-trek-universe',
                name: 'Star Trek Universe',
                description: 'Science fiction universe with exploration themes',
                plugin_id: 'star-trek-universe',
                icon: '🖖',
                theme_color: '#0066cc',
                version: '1.0.0',
                author: 'Plugin Team',
                sub_universes: [
                    { id: 'prime', name: 'Prime Timeline', description: 'Original timeline' },
                    { id: 'kelvin', name: 'Kelvin Timeline', description: 'Alternate timeline' },
                    { id: 'custom', name: 'Custom Universe', description: 'User-defined' }
                ]
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        // Check template is rendered
        expect(screen.getByText('Star Trek Universe')).toBeInTheDocument();
        expect(screen.getByText('Science fiction universe with exploration themes')).toBeInTheDocument();

        // Check sub-universes are rendered
        expect(screen.getByText('Prime Timeline')).toBeInTheDocument();
        expect(screen.getByText('Kelvin Timeline')).toBeInTheDocument();
        expect(screen.getByText('Custom Universe')).toBeInTheDocument();
    });

    it('should handle custom sub-universe selection', () => {
        const mockTemplates = [
            {
                id: 'star-trek-universe',
                name: 'Star Trek Universe',
                description: 'Science fiction universe',
                plugin_id: 'star-trek-universe',
                icon: '🖖',
                theme_color: '#0066cc',
                version: '1.0.0',
                author: 'Plugin Team',
                sub_universes: [
                    { id: 'custom', name: 'Custom Universe', description: 'User-defined' }
                ]
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        // Click on custom sub-universe
        fireEvent.click(screen.getByText('Custom Universe'));

        expect(mockOnSelectTemplate).toHaveBeenCalledWith(
            mockTemplates[0],
            mockTemplates[0].sub_universes[0]
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle non-custom sub-universe navigation', () => {
        const mockTemplates = [
            {
                id: 'star-trek-universe',
                name: 'Star Trek Universe',
                description: 'Science fiction universe',
                plugin_id: 'star-trek-universe',
                icon: '🖖',
                theme_color: '#0066cc',
                version: '1.0.0',
                author: 'Plugin Team',
                sub_universes: [
                    { id: 'prime', name: 'Prime Timeline', description: 'Original timeline' }
                ]
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        // Click on non-custom sub-universe
        fireEvent.click(screen.getByText('Prime Timeline'));

        expect(mockNavigate).toHaveBeenCalledWith('/universes/star-trek-universe/prime');
        expect(mockOnSelectTemplate).not.toHaveBeenCalled();
    });

    it('should handle template without sub-universes', () => {
        const mockTemplates = [
            {
                id: 'generic-universe',
                name: 'Generic Universe',
                description: 'Generic universe template',
                plugin_id: 'generic-universe',
                icon: '🌌',
                theme_color: '#666666',
                version: '1.0.0',
                author: 'Plugin Team',
                sub_universes: []
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        // Check manage button is rendered
        expect(screen.getByText('Manage Generic Universe')).toBeInTheDocument();

        // Click manage button
        fireEvent.click(screen.getByText('Manage Generic Universe'));

        expect(mockNavigate).toHaveBeenCalledWith('/universes/generic-universe');
    });

    it('should display plugin system info', () => {
        const mockTemplates = [
            {
                id: 'test-universe',
                name: 'Test Universe',
                description: 'Test description',
                plugin_id: 'test-universe',
                icon: '🧪',
                theme_color: '#00ff00',
                version: '1.0.0',
                author: 'Test',
                sub_universes: []
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        expect(screen.getByText('🔌 Dynamic Plugin System')).toBeInTheDocument();
        expect(screen.getByText(/Universe templates are loaded dynamically/)).toBeInTheDocument();
        expect(screen.getByText('Loaded 1 plugin from the backend.')).toBeInTheDocument();
    });

    it('should display correct plugin count in info', () => {
        const mockTemplates = [
            {
                id: 'test1',
                name: 'Test 1',
                description: 'Test',
                plugin_id: 'test1',
                icon: '🧪',
                theme_color: '#00ff00',
                version: '1.0.0',
                author: 'Test',
                sub_universes: []
            },
            {
                id: 'test2',
                name: 'Test 2',
                description: 'Test',
                plugin_id: 'test2',
                icon: '🧪',
                theme_color: '#00ff00',
                version: '1.0.0',
                author: 'Test',
                sub_universes: []
            }
        ];
        mockUsePluginTemplates({
            templates: mockTemplates,
            loading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(
            <TestWrapper>
                <PluginUniverseSection onSelectTemplate={mockOnSelectTemplate} />
            </TestWrapper>
        );

        expect(screen.getByText('Loaded 2 plugins from the backend.')).toBeInTheDocument();
    });
});
