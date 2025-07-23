/**
 * Galactic Citizen Form Component
 * Character creation form with faction-based focus
 */

import React, { useState } from 'react';

interface GalacticCitizenFormProps {
    onSubmit: (character: StarWarsCharacter) => void;
    onCancel: () => void;
    initialData?: Partial<StarWarsCharacter>;
}

interface StarWarsCharacter {
    name: string;
    species: string;
    homeworld: string;
    faction: string;
    rank?: string;
    forceSensitive: boolean;
    forceAlignment?: 'light' | 'dark' | 'neutral' | 'untrained';
    forceAbilities?: string[];
    background: string;
    equipment: string[];
    affiliations: string[];
    politicalStance: 'imperial' | 'rebel' | 'neutral' | 'criminal' | 'independent';
}

export type { StarWarsCharacter };

export const GalacticCitizenForm: React.FC<GalacticCitizenFormProps> = ({
    onSubmit,
    onCancel,
    initialData = {}
}) => {
    const [character, setCharacter] = useState<StarWarsCharacter>({
        name: '',
        species: 'Human',
        homeworld: '',
        faction: 'neutral',
        forceSensitive: false,
        background: '',
        equipment: [],
        affiliations: [],
        politicalStance: 'neutral',
        ...initialData
    });

    const species = [
        'Human', 'Twi\'lek', 'Wookiee', 'Rodian', 'Mon Calamari',
        'Zabrak', 'Togruta', 'Nautolan', 'Miraluka', 'Chiss',
        'Bothan', 'Sullustan', 'Duros', 'Gamorrean', 'Ewok'
    ];

    const factions = [
        'empire', 'rebel', 'republic', 'first-order', 'resistance',
        'jedi-order', 'sith', 'mandalorian', 'hutt-cartel', 'neutral'
    ];

    const forceAlignments = ['light', 'dark', 'neutral', 'untrained'];

    const politicalStances = [
        'imperial', 'rebel', 'neutral', 'criminal', 'independent'
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(character);
    };

    const handleArrayInput = (field: 'equipment' | 'affiliations', value: string) => {
        const items = value.split(',').map(item => item.trim()).filter(item => item);
        setCharacter(prev => ({ ...prev, [field]: items }));
    };

    return (
        <div className="galactic-citizen-form">
            <div className="form-header">
                <h2>Galactic Citizen Registry</h2>
                <p>Register a citizen in the galactic database</p>
            </div>

            <form onSubmit={handleSubmit} className="citizen-form">
                {/* Basic Information */}
                <div className="form-section">
                    <h3>Basic Information</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={character.name}
                                onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                                required
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="species">Species *</label>
                            <select
                                id="species"
                                value={character.species}
                                onChange={(e) => setCharacter(prev => ({ ...prev, species: e.target.value }))}
                                required
                            >
                                {species.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="homeworld">Homeworld *</label>
                        <input
                            type="text"
                            id="homeworld"
                            value={character.homeworld}
                            onChange={(e) => setCharacter(prev => ({ ...prev, homeworld: e.target.value }))}
                            required
                            placeholder="e.g., Tatooine, Coruscant, Alderaan"
                        />
                    </div>
                </div>

                {/* Faction and Politics */}
                <div className="form-section">
                    <h3>Faction and Political Alignment</h3>

                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="faction">Primary Faction *</label>
                            <select
                                id="faction"
                                value={character.faction}
                                onChange={(e) => setCharacter(prev => ({ ...prev, faction: e.target.value }))}
                                required
                            >
                                {factions.map(f => (
                                    <option key={f} value={f}>
                                        {f.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="politicalStance">Political Stance</label>
                            <select
                                id="politicalStance"
                                value={character.politicalStance}
                                onChange={(e) => setCharacter(prev => ({
                                    ...prev,
                                    politicalStance: e.target.value as StarWarsCharacter['politicalStance']
                                }))}
                            >
                                {politicalStances.map(stance => (
                                    <option key={stance} value={stance}>
                                        {stance.charAt(0).toUpperCase() + stance.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="rank">Rank/Position</label>
                        <input
                            type="text"
                            id="rank"
                            value={character.rank || ''}
                            onChange={(e) => setCharacter(prev => ({ ...prev, rank: e.target.value }))}
                            placeholder="e.g., Commander, Admiral, General, Padawan"
                        />
                    </div>
                </div>

                {/* Force Sensitivity */}
                <div className="form-section">
                    <h3>Force Sensitivity</h3>

                    <div className="form-field">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={character.forceSensitive}
                                onChange={(e) => setCharacter(prev => ({
                                    ...prev,
                                    forceSensitive: e.target.checked,
                                    forceAlignment: e.target.checked ? 'untrained' : undefined,
                                    forceAbilities: e.target.checked ? [] : undefined
                                }))}
                            />
                            Force Sensitive
                        </label>
                    </div>

                    {character.forceSensitive && (
                        <>
                            <div className="form-field">
                                <label htmlFor="forceAlignment">Force Alignment</label>
                                <select
                                    id="forceAlignment"
                                    value={character.forceAlignment || 'untrained'}
                                    onChange={(e) => setCharacter(prev => ({
                                        ...prev,
                                        forceAlignment: e.target.value as StarWarsCharacter['forceAlignment']
                                    }))}
                                >
                                    {forceAlignments.map(alignment => (
                                        <option key={alignment} value={alignment}>
                                            {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label htmlFor="forceAbilities">Force Abilities</label>
                                <input
                                    type="text"
                                    id="forceAbilities"
                                    value={character.forceAbilities?.join(', ') || ''}
                                    onChange={(e) => {
                                        const abilities = e.target.value.split(',').map(a => a.trim()).filter(a => a);
                                        setCharacter(prev => ({ ...prev, forceAbilities: abilities }));
                                    }}
                                    placeholder="e.g., Telekinesis, Mind Trick, Force Lightning"
                                />
                                <small>Separate multiple abilities with commas</small>
                            </div>
                        </>
                    )}
                </div>

                {/* Background and Details */}
                <div className="form-section">
                    <h3>Background and Equipment</h3>

                    <div className="form-field">
                        <label htmlFor="background">Background Story</label>
                        <textarea
                            id="background"
                            value={character.background}
                            onChange={(e) => setCharacter(prev => ({ ...prev, background: e.target.value }))}
                            rows={4}
                            placeholder="Character's background, history, and motivations..."
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="equipment">Equipment</label>
                        <input
                            type="text"
                            id="equipment"
                            value={character.equipment.join(', ')}
                            onChange={(e) => handleArrayInput('equipment', e.target.value)}
                            placeholder="e.g., Blaster, Lightsaber, Comlink, Speeder"
                        />
                        <small>Separate multiple items with commas</small>
                    </div>

                    <div className="form-field">
                        <label htmlFor="affiliations">Affiliations</label>
                        <input
                            type="text"
                            id="affiliations"
                            value={character.affiliations.join(', ')}
                            onChange={(e) => handleArrayInput('affiliations', e.target.value)}
                            placeholder="e.g., Rogue Squadron, 501st Legion, Jedi Council"
                        />
                        <small>Separate multiple affiliations with commas</small>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                        Register Citizen
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GalacticCitizenForm;
