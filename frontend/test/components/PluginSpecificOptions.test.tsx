/**
 * @fileoverview Test suite for PluginSpecificOptions component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PluginSpecificOptions } from '../../src/components/universe/PluginSpecificOptions.js';

describe('PluginSpecificOptions', () => {
    const mockOnChange = jest.fn();
    const defaultProps = {
        pluginId: 'star-trek-universe',
        options: {},
        onChange: mockOnChange
    };

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('should render universe-level configuration info', () => {
        render(<PluginSpecificOptions {...defaultProps} />);

        expect(screen.getByText('Universe-Level Configuration')).toBeInTheDocument();
        expect(screen.getByText(/These settings define the fundamental rules/)).toBeInTheDocument();
    });

    it('should render Star Trek options', () => {
        render(<PluginSpecificOptions {...defaultProps} />);

        expect(screen.getByText('🖖 Star Trek Configuration')).toBeInTheDocument();
        expect(screen.getByText('Primary Era')).toBeInTheDocument();
        expect(screen.getByText('Canon Compliance')).toBeInTheDocument();
        expect(screen.getByText('Technology Level')).toBeInTheDocument();
    });

    it('should render Star Wars options', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="star-wars-universe"
            />
        );

        expect(screen.getByText('⭐ Star Wars Universe Configuration')).toBeInTheDocument();
        expect(screen.getByText('Canon Level')).toBeInTheDocument();
        expect(screen.getByText('Primary Era Focus')).toBeInTheDocument();
        expect(screen.getByText('Galaxy Scope')).toBeInTheDocument();
        expect(screen.getByText('Force Prevalence in Universe')).toBeInTheDocument();
        expect(screen.getByText('Political Climate')).toBeInTheDocument();
    });

    it('should render LOTR options', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="lotr-universe"
            />
        );

        expect(screen.getByText('💍 Middle-earth Universe Configuration')).toBeInTheDocument();
        expect(screen.getByText('Canon Level')).toBeInTheDocument();
        expect(screen.getByText('Age of Middle-earth')).toBeInTheDocument();
        expect(screen.getByText('Geographic Scope')).toBeInTheDocument();
    });

    it('should render Harry Potter options', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="harry-potter-universe"
            />
        );

        expect(screen.getByText('⚡ Wizarding World Universe Configuration')).toBeInTheDocument();
        expect(screen.getByText('Canon Level')).toBeInTheDocument();
        expect(screen.getByText('Primary Era Focus')).toBeInTheDocument();
        expect(screen.getByText('Geographic Scope')).toBeInTheDocument();
        expect(screen.getByText('Magic System Complexity')).toBeInTheDocument();
        expect(screen.getByText('Dark Arts Threat Level')).toBeInTheDocument();
    });

    it('should not render anything for unknown plugin', () => {
        const { container } = render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="unknown-plugin"
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should handle Star Trek era selection change', () => {
        render(<PluginSpecificOptions {...defaultProps} />);

        const eraSelect = screen.getByDisplayValue('The Next Generation (2360s)');
        fireEvent.change(eraSelect, { target: { value: 'tos' } });

        expect(mockOnChange).toHaveBeenCalledWith({ era: 'tos' });
    });

    it('should handle Star Trek canon compliance change', () => {
        render(<PluginSpecificOptions {...defaultProps} />);

        const canonSelect = screen.getByDisplayValue('Flexible Canon - Allow minor deviations');
        fireEvent.change(canonSelect, { target: { value: 'strict' } });

        expect(mockOnChange).toHaveBeenCalledWith({ canonLevel: 'strict' });
    });

    it('should handle Star Wars canon level change', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="star-wars-universe"
            />
        );

        const canonSelect = screen.getByDisplayValue('Disney Canon Only');
        fireEvent.change(canonSelect, { target: { value: 'legends' } });

        expect(mockOnChange).toHaveBeenCalledWith({ canonLevel: 'legends' });
    });

    it('should show Kelvin timeline option for Star Trek Kelvin sub-universe', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                subUniverseId="kelvin"
            />
        );

        expect(screen.getByText('Kelvin Timeline (2250s-2260s)')).toBeInTheDocument();
    });

    it('should show sequel era option for Star Wars canon sub-universe', () => {
        render(
            <PluginSpecificOptions
                {...defaultProps}
                pluginId="star-wars-universe"
                subUniverseId="canon"
            />
        );

        expect(screen.getByText('Sequel Era (28 ABY+)')).toBeInTheDocument();
    });

    it('should preserve existing options when changing one option', () => {
        const existingOptions = { era: 'tos', canonLevel: 'strict' };

        render(
            <PluginSpecificOptions
                {...defaultProps}
                options={existingOptions}
            />
        );

        const techSelect = screen.getByDisplayValue('Standard Starfleet Technology');
        fireEvent.change(techSelect, { target: { value: 'advanced' } });

        expect(mockOnChange).toHaveBeenCalledWith({
            era: 'tos',
            canonLevel: 'strict',
            technologyLevel: 'advanced'
        });
    });

    it('should use default values when no options provided', () => {
        render(<PluginSpecificOptions {...defaultProps} />);

        // Check default selections are shown
        expect(screen.getByDisplayValue('The Next Generation (2360s)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Flexible Canon - Allow minor deviations')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Standard Starfleet Technology')).toBeInTheDocument();
    });

    it('should use provided option values', () => {
        const options = {
            era: 'tos',
            canonLevel: 'strict',
            technologyLevel: 'advanced'
        };

        render(
            <PluginSpecificOptions
                {...defaultProps}
                options={options}
            />
        );

        expect(screen.getByDisplayValue('The Original Series (2260s)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Strict Canon - Follow established timeline')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Advanced/Experimental Technology')).toBeInTheDocument();
    });
});
