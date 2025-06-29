/**
 * Plugin-Specific Universe Options Component
 * 
 * Renders plugin-specific configuration options based on the selected template
 */

import React from 'react';

interface PluginSpecificOptionsProps {
    pluginId: string;
    subUniverseId?: string;
    options: Record<string, any>;
    onChange: (options: Record<string, any>) => void;
}

export function PluginSpecificOptions({
    pluginId,
    subUniverseId,
    options,
    onChange
}: PluginSpecificOptionsProps) {
    const handleOptionChange = (key: string, value: any) => {
        onChange({ ...options, [key]: value });
    };

    // Helper to render the universe-level settings info
    const renderUniverseInfo = () => (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 text-lg">🌌</span>
                <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Universe-Level Configuration
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                        These settings define the fundamental rules, scope, and constraints of your entire universe.
                        They affect world-building tools, content validation, and available features throughout your story series.
                    </p>
                </div>
            </div>
        </div>
    ); const renderStarTrekOptions = () => (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">🖖 Star Trek Configuration</h4>

            {/* Era Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Era
                </label>
                <select
                    value={options.era || 'tng'}
                    onChange={(e) => handleOptionChange('era', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="tos">The Original Series (2260s)</option>
                    <option value="tng">The Next Generation (2360s)</option>
                    <option value="ds9">Deep Space Nine (2370s)</option>
                    <option value="voy">Voyager (2370s)</option>
                    <option value="ent">Enterprise (2150s)</option>
                    <option value="dsc">Discovery (2250s)</option>
                    <option value="pic">Picard (2390s)</option>
                    {subUniverseId === 'kelvin' && <option value="kelvin">Kelvin Timeline (2250s-2260s)</option>}
                    <option value="custom">Custom Era</option>
                </select>
            </div>

            {/* Canon Compliance */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canon Compliance
                </label>
                <select
                    value={options.canonLevel || 'flexible'}
                    onChange={(e) => handleOptionChange('canonLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="strict">Strict Canon - Follow established timeline</option>
                    <option value="flexible">Flexible Canon - Allow minor deviations</option>
                    <option value="loose">Loose Canon - Major changes allowed</option>
                    <option value="custom">Custom Rules - Complete creative freedom</option>
                </select>
            </div>

            {/* Technology Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Technology Level
                </label>
                <select
                    value={options.technologyLevel || 'standard'}
                    onChange={(e) => handleOptionChange('technologyLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="standard">Standard Starfleet Technology</option>
                    <option value="advanced">Advanced/Experimental Technology</option>
                    <option value="primitive">Earlier/Limited Technology</option>
                    <option value="mixed">Mixed Technology Levels</option>
                </select>
            </div>
        </div>
    ); const renderStarWarsOptions = () => (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">⭐ Star Wars Universe Configuration</h4>

            {/* Canon Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canon Level
                </label>
                <select
                    value={options.canonLevel || 'disney'}
                    onChange={(e) => handleOptionChange('canonLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="disney">Disney Canon Only</option>
                    <option value="legends">Legends/EU Canon</option>
                    <option value="mixed">Mixed Canon (Disney + Select Legends)</option>
                    <option value="custom">Custom Canon Rules</option>
                </select>
            </div>

            {/* Era Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Era Focus
                </label>
                <select
                    value={options.era || 'empire'}
                    onChange={(e) => handleOptionChange('era', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    {subUniverseId === 'old-republic' && <option value="old-republic">Old Republic (25,000 BBY - 1000 BBY)</option>}
                    <option value="high-republic">High Republic (500 BBY - 100 BBY)</option>
                    <option value="republic">Republic Era (100 BBY - 19 BBY)</option>
                    <option value="empire">Imperial Era (19 BBY - 4 ABY)</option>
                    <option value="new-republic">New Republic (4 ABY - 28 ABY)</option>
                    {subUniverseId === 'canon' && <option value="sequel">Sequel Era (28 ABY+)</option>}
                    {subUniverseId === 'legends' && <option value="new-jedi-order">New Jedi Order (25 ABY+)</option>}
                    <option value="multi-era">Multi-Era Stories</option>
                    <option value="custom">Custom Era</option>
                </select>
            </div>

            {/* Galaxy Scope */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Galaxy Scope
                </label>
                <select
                    value={options.scope || 'galaxy-wide'}
                    onChange={(e) => handleOptionChange('scope', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="core-worlds">Core Worlds Focus</option>
                    <option value="inner-rim">Inner Rim Focus</option>
                    <option value="mid-rim">Mid Rim Focus</option>
                    <option value="outer-rim">Outer Rim Focus</option>
                    <option value="unknown-regions">Unknown Regions</option>
                    <option value="galaxy-wide">Galaxy-Wide Adventures</option>
                    <option value="single-system">Single Star System</option>
                    <option value="custom-region">Custom Region</option>
                </select>
            </div>

            {/* Force Prevalence */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Force Prevalence in Universe
                </label>
                <select
                    value={options.forcePrevalence || 'rare'}
                    onChange={(e) => handleOptionChange('forcePrevalence', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="extinct">Force Users Extinct</option>
                    <option value="rare">Rare Force Users</option>
                    <option value="uncommon">Uncommon Force Users</option>
                    <option value="common">Common Force Users</option>
                    <option value="prevalent">Force Users Prevalent</option>
                    <option value="custom">Custom Force Rules</option>
                </select>
            </div>

            {/* Political Climate */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Political Climate
                </label>
                <select
                    value={options.politics || 'conflict'}
                    onChange={(e) => handleOptionChange('politics', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="peaceful">Peaceful Galaxy</option>
                    <option value="tension">Rising Tensions</option>
                    <option value="conflict">Active Conflicts</option>
                    <option value="war">Galaxy at War</option>
                    <option value="post-war">Post-War Recovery</option>
                    <option value="chaos">Political Chaos</option>
                    <option value="custom">Custom Political State</option>
                </select>
            </div>
        </div>
    ); const renderLOTROptions = () => (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">💍 Middle-earth Universe Configuration</h4>

            {/* Canon Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canon Level
                </label>
                <select
                    value={options.canonLevel || 'tolkien'}
                    onChange={(e) => handleOptionChange('canonLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="tolkien">Tolkien Works Only</option>
                    <option value="expanded">Expanded Tolkien (includes letters, notes)</option>
                    <option value="adaptations">Include Film/Game Adaptations</option>
                    <option value="custom">Custom Canon Rules</option>
                </select>
            </div>

            {/* Age Setting */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Age of Middle-earth
                </label>
                <select
                    value={options.age || 'third'}
                    onChange={(e) => handleOptionChange('age', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="first">First Age (Elder Days)</option>
                    <option value="second">Second Age (Rise of Númenor)</option>
                    <option value="third">Third Age (War of the Ring Era)</option>
                    <option value="fourth">Fourth Age (Age of Men)</option>
                    <option value="multi-age">Multi-Age Stories</option>
                    <option value="custom">Custom Age</option>
                </select>
            </div>

            {/* Geographic Scope */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Geographic Scope
                </label>
                <select
                    value={options.scope || 'middle-earth'}
                    onChange={(e) => handleOptionChange('scope', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="shire">The Shire Focus</option>
                    <option value="gondor-rohan">Gondor & Rohan</option>
                    <option value="rivendell-lorien">Elven Realms</option>
                    <option value="middle-earth">All Middle-earth</option>
                    <option value="beleriand">Beleriand (First Age)</option>
                    <option value="numenor">Númenor & Seas</option>
                    <option value="custom-region">Custom Region</option>
                </select>
            </div>

            {/* Magic & Power Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Magic & Power Level
                </label>
                <select
                    value={options.magicLevel || 'diminished'}
                    onChange={(e) => handleOptionChange('magicLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="high">High Magic (Elder Days)</option>
                    <option value="moderate">Moderate Magic (Second Age)</option>
                    <option value="diminished">Diminished Magic (Third Age)</option>
                    <option value="minimal">Minimal Magic (Fourth Age)</option>
                    <option value="custom">Custom Magic Rules</option>
                </select>
            </div>

            {/* Darkness Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Shadow & Darkness Level
                </label>
                <select
                    value={options.darknessLevel || 'rising'}
                    onChange={(e) => handleOptionChange('darknessLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="peaceful">Peaceful Times</option>
                    <option value="stirring">Darkness Stirring</option>
                    <option value="rising">Shadow Rising</option>
                    <option value="war">War Against Darkness</option>
                    <option value="post-victory">Post-Victory Recovery</option>
                    <option value="custom">Custom Threat Level</option>
                </select>
            </div>
        </div>
    ); const renderHarryPotterOptions = () => (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">⚡ Wizarding World Universe Configuration</h4>

            {/* Canon Level */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canon Level
                </label>
                <select
                    value={options.canonLevel || 'books'}
                    onChange={(e) => handleOptionChange('canonLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="books">Books Only</option>
                    <option value="films">Books + Films</option>
                    <option value="expanded">Expanded Universe (Pottermore/Cursed Child)</option>
                    <option value="fantastic-beasts">Include Fantastic Beasts</option>
                    <option value="custom">Custom Canon Rules</option>
                </select>
            </div>

            {/* Time Period */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Era Focus
                </label>
                <select
                    value={options.era || 'harry-era'}
                    onChange={(e) => handleOptionChange('era', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="founders">Founders Era (990s-1000s)</option>
                    <option value="medieval">Medieval Wizarding (1200s-1600s)</option>
                    <option value="fantastic-beasts">Fantastic Beasts Era (1920s)</option>
                    <option value="marauders">Marauders Era (1970s)</option>
                    <option value="harry-era">Harry Potter Era (1990s)</option>
                    <option value="post-war">Post-War Era (2000s+)</option>
                    <option value="next-generation">Next Generation (2010s+)</option>
                    <option value="multi-era">Multi-Era Stories</option>
                    <option value="custom">Custom Era</option>
                </select>
            </div>

            {/* Geographic Scope */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Geographic Scope
                </label>
                <select
                    value={options.scope || 'britain'}
                    onChange={(e) => handleOptionChange('scope', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="hogwarts">Hogwarts Focused</option>
                    <option value="britain">Wizarding Britain</option>
                    <option value="europe">Wizarding Europe</option>
                    <option value="america">Wizarding America</option>
                    <option value="global">Global Wizarding World</option>
                    <option value="custom-region">Custom Wizarding Region</option>
                </select>
            </div>

            {/* Magic System Complexity */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Magic System Complexity
                </label>
                <select
                    value={options.magicComplexity || 'standard'}
                    onChange={(e) => handleOptionChange('magicComplexity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="simple">Simple Magic System</option>
                    <option value="standard">Standard HP Magic</option>
                    <option value="complex">Complex Magic Rules</option>
                    <option value="expanded">Expanded Magic System</option>
                    <option value="custom">Custom Magic Rules</option>
                </select>
            </div>

            {/* Dark Arts Prevalence */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dark Arts Threat Level
                </label>
                <select
                    value={options.darkArts || 'moderate'}
                    onChange={(e) => handleOptionChange('darkArts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="minimal">Minimal Dark Arts</option>
                    <option value="low">Low Threat Level</option>
                    <option value="moderate">Moderate Threat</option>
                    <option value="high">High Dark Arts Activity</option>
                    <option value="war">Wizarding War</option>
                    <option value="post-war">Post-War Recovery</option>
                    <option value="custom">Custom Threat Level</option>
                </select>
            </div>
        </div>
    );    // Render plugin-specific options based on plugin ID
    const renderPluginOptions = () => {
        switch (pluginId) {
            case 'star-trek-universe':
                return renderStarTrekOptions();
            case 'star-wars-universe':
                return renderStarWarsOptions();
            case 'lotr-universe':
                return renderLOTROptions();
            case 'harry-potter-universe':
                return renderHarryPotterOptions();
            default:
                return null;
        }
    };

    const pluginOptionsContent = renderPluginOptions();

    if (!pluginOptionsContent) {
        return null;
    }

    return (
        <div>
            {renderUniverseInfo()}
            {pluginOptionsContent}
        </div>
    );
}

export default PluginSpecificOptions;
