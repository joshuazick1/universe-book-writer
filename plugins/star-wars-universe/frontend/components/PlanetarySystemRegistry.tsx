/**
 * Planetary System Registry Component
 * Location creation form with galactic politics focus
 */

import React, { useState } from 'react';

interface PlanetarySystemRegistryProps {
    onSubmit: (system: StarWarsSystem) => void;
    onCancel: () => void;
    initialData?: Partial<StarWarsSystem>;
}

interface StarWarsSystem {
    name: string;
    sector: string;
    region: string;
    coordinates: string;
    controllingFaction: string;
    population: number;
    classification: string;
    government: string;
    economy: string;
    strategicValue: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
    tradeRoutes: string[];
    resources: string[];
    defenses: string[];
    notablePlanets: StarWarsPlanet[];
    politicalStatus: 'stable' | 'contested' | 'occupied' | 'independent' | 'blockaded';
    history: string;
}

interface StarWarsPlanet {
    name: string;
    type: string;
    climate: string;
    terrain: string[];
    nativeSpecies: string[];
    majorCities: string[];
    notableLocations: string[];
}

export type { StarWarsSystem, StarWarsPlanet };

export const PlanetarySystemRegistry: React.FC<PlanetarySystemRegistryProps> = ({
    onSubmit,
    onCancel,
    initialData = {}
}) => {
    const [system, setSystem] = useState<StarWarsSystem>({
        name: '',
        sector: '',
        region: 'Mid Rim',
        coordinates: '',
        controllingFaction: 'neutral',
        population: 0,
        classification: 'inhabited',
        government: 'planetary',
        economy: 'mixed',
        strategicValue: 'moderate',
        tradeRoutes: [],
        resources: [],
        defenses: [],
        notablePlanets: [],
        politicalStatus: 'stable',
        history: '',
        ...initialData
    });

    const galacticRegions = [
        'Core Worlds',
        'Colonies',
        'Inner Rim',
        'Expansion Region',
        'Mid Rim',
        'Outer Rim',
        'Unknown Regions',
        'Wild Space'
    ];

    const factions = [
        'empire', 'rebel', 'republic', 'first-order', 'resistance',
        'hutt-cartel', 'mandalorian', 'neutral', 'independent', 'corporate'
    ];

    const strategicValues = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const politicalStatuses = ['stable', 'contested', 'occupied', 'independent', 'blockaded'];
    const classifications = ['inhabited', 'uninhabited', 'military', 'industrial', 'agricultural', 'mining'];
    const governments = ['planetary', 'imperial', 'republic', 'corporate', 'tribal', 'feudal', 'military'];
    const economies = ['industrial', 'agricultural', 'mining', 'trade', 'tourism', 'military', 'mixed'];

    const planetTypes = ['terrestrial', 'desert', 'ocean', 'forest', 'ice', 'volcanic', 'gas giant', 'asteroid'];
    const climates = ['temperate', 'arid', 'tropical', 'arctic', 'volcanic', 'toxic', 'artificial'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(system);
    };

    const handleArrayInput = (field: keyof Pick<StarWarsSystem, 'tradeRoutes' | 'resources' | 'defenses'>, value: string) => {
        const items = value.split(',').map(item => item.trim()).filter(item => item);
        setSystem(prev => ({ ...prev, [field]: items }));
    };

    const addPlanet = () => {
        const newPlanet: StarWarsPlanet = {
            name: '',
            type: 'terrestrial',
            climate: 'temperate',
            terrain: [],
            nativeSpecies: [],
            majorCities: [],
            notableLocations: []
        };
        setSystem(prev => ({
            ...prev,
            notablePlanets: [...prev.notablePlanets, newPlanet]
        }));
    };

    const updatePlanet = (index: number, updates: Partial<StarWarsPlanet>) => {
        setSystem(prev => ({
            ...prev,
            notablePlanets: prev.notablePlanets.map((planet, i) =>
                i === index ? { ...planet, ...updates } : planet
            )
        }));
    };

    const removePlanet = (index: number) => {
        setSystem(prev => ({
            ...prev,
            notablePlanets: prev.notablePlanets.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="planetary-system-registry">
            <div className="form-header">
                <h2>Planetary System Registry</h2>
                <p>Register a star system in the galactic database</p>
            </div>

            <form onSubmit={handleSubmit} className="system-form">
                {/* Basic System Information */}
                <div className="form-section">
                    <h3>System Information</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="name">System Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={system.name}
                                onChange={(e) => setSystem(prev => ({ ...prev, name: e.target.value }))}
                                required
                                placeholder="e.g., Tatooine System, Coruscant System"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="coordinates">Galactic Coordinates</label>
                            <input
                                type="text"
                                id="coordinates"
                                value={system.coordinates}
                                onChange={(e) => setSystem(prev => ({ ...prev, coordinates: e.target.value }))}
                                placeholder="e.g., M-7, R-16, O-12"
                                pattern="^[A-Z]-\d{1,2}$"
                            />
                            <small>Format: [Letter]-[Number] (e.g., M-7)</small>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="sector">Sector *</label>
                            <input
                                type="text"
                                id="sector"
                                value={system.sector}
                                onChange={(e) => setSystem(prev => ({ ...prev, sector: e.target.value }))}
                                required
                                placeholder="e.g., Arkanis Sector, Coruscant Sector"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="region">Galactic Region *</label>
                            <select
                                id="region"
                                value={system.region}
                                onChange={(e) => setSystem(prev => ({ ...prev, region: e.target.value }))}
                                required
                            >
                                {galacticRegions.map(region => (
                                    <option key={region} value={region}>{region}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Political and Control Information */}
                <div className="form-section">
                    <h3>Political Control</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="controllingFaction">Controlling Faction *</label>
                            <select
                                id="controllingFaction"
                                value={system.controllingFaction}
                                onChange={(e) => setSystem(prev => ({ ...prev, controllingFaction: e.target.value }))}
                                required
                            >
                                {factions.map(faction => (
                                    <option key={faction} value={faction}>
                                        {faction.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="politicalStatus">Political Status</label>
                            <select
                                id="politicalStatus"
                                value={system.politicalStatus}
                                onChange={(e) => setSystem(prev => ({
                                    ...prev,
                                    politicalStatus: e.target.value as StarWarsSystem['politicalStatus']
                                }))}
                            >
                                {politicalStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="government">Government Type</label>
                            <select
                                id="government"
                                value={system.government}
                                onChange={(e) => setSystem(prev => ({ ...prev, government: e.target.value }))}
                            >
                                {governments.map(gov => (
                                    <option key={gov} value={gov}>
                                        {gov.charAt(0).toUpperCase() + gov.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="strategicValue">Strategic Value</label>
                            <select
                                id="strategicValue"
                                value={system.strategicValue}
                                onChange={(e) => setSystem(prev => ({
                                    ...prev,
                                    strategicValue: e.target.value as StarWarsSystem['strategicValue']
                                }))}
                            >
                                {strategicValues.map(value => (
                                    <option key={value} value={value}>
                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Economic and Resource Information */}
                <div className="form-section">
                    <h3>Economic Information</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="population">Total Population</label>
                            <input
                                type="number"
                                id="population"
                                value={system.population}
                                onChange={(e) => setSystem(prev => ({ ...prev, population: parseInt(e.target.value) || 0 }))}
                                min="0"
                                placeholder="0"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="economy">Economy Type</label>
                            <select
                                id="economy"
                                value={system.economy}
                                onChange={(e) => setSystem(prev => ({ ...prev, economy: e.target.value }))}
                            >
                                {economies.map(econ => (
                                    <option key={econ} value={econ}>
                                        {econ.charAt(0).toUpperCase() + econ.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="resources">Natural Resources</label>
                        <input
                            type="text"
                            id="resources"
                            value={system.resources.join(', ')}
                            onChange={(e) => handleArrayInput('resources', e.target.value)}
                            placeholder="e.g., Tibanna Gas, Beskar, Spice, Hyperfuel"
                        />
                        <small>Separate multiple resources with commas</small>
                    </div>

                    <div className="form-field">
                        <label htmlFor="tradeRoutes">Trade Routes</label>
                        <input
                            type="text"
                            id="tradeRoutes"
                            value={system.tradeRoutes.join(', ')}
                            onChange={(e) => handleArrayInput('tradeRoutes', e.target.value)}
                            placeholder="e.g., Corellian Run, Hydian Way, Rimma Trade Route"
                        />
                        <small>Separate multiple routes with commas</small>
                    </div>
                </div>

                {/* Defense and Security */}
                <div className="form-section">
                    <h3>Defense Systems</h3>

                    <div className="form-field">
                        <label htmlFor="defenses">Defense Systems</label>
                        <input
                            type="text"
                            id="defenses"
                            value={system.defenses.join(', ')}
                            onChange={(e) => handleArrayInput('defenses', e.target.value)}
                            placeholder="e.g., Planetary Shield, Ion Cannon, Defense Fleet"
                        />
                        <small>Separate multiple defense systems with commas</small>
                    </div>
                </div>

                {/* Planetary Details */}
                <div className="form-section">
                    <h3>Notable Planets</h3>

                    {system.notablePlanets.map((planet, index) => (
                        <div key={index} className="planet-details">
                            <div className="planet-header">
                                <h4>Planet {index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removePlanet(index)}
                                    className="btn-danger-small"
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Planet Name</label>
                                    <input
                                        type="text"
                                        value={planet.name}
                                        onChange={(e) => updatePlanet(index, { name: e.target.value })}
                                        placeholder="e.g., Tatooine, Hoth, Naboo"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Planet Type</label>
                                    <select
                                        value={planet.type}
                                        onChange={(e) => updatePlanet(index, { type: e.target.value })}
                                    >
                                        {planetTypes.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Climate</label>
                                    <select
                                        value={planet.climate}
                                        onChange={(e) => updatePlanet(index, { climate: e.target.value })}
                                    >
                                        {climates.map(climate => (
                                            <option key={climate} value={climate}>
                                                {climate.charAt(0).toUpperCase() + climate.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button type="button" onClick={addPlanet} className="btn-secondary">
                        Add Planet
                    </button>
                </div>

                {/* Historical Information */}
                <div className="form-section">
                    <h3>Historical Information</h3>

                    <div className="form-field">
                        <label htmlFor="history">System History</label>
                        <textarea
                            id="history"
                            value={system.history}
                            onChange={(e) => setSystem(prev => ({ ...prev, history: e.target.value }))}
                            rows={4}
                            placeholder="Historical events, significant battles, political changes..."
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                        Register System
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlanetarySystemRegistry;
