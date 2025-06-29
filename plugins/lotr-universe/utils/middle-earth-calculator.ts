/**
 * Lord of the Rings Travel Calculator
 * Implements Middle-earth geography and Age-based timeline system
 */

export interface MiddleEarthJourney {
    distance: number; // in leagues
    travelMethod: 'walking' | 'riding' | 'sailing' | 'eagle';
    terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous';
    travelTime: {
        days: number;
        weeks: number;
        months: number;
    };
    provisions: number; // in lembas bread equivalents
    hazards: string[];
    fellowshipSize: number;
}

export interface MiddleEarthRoute {
    origin: string;
    destination: string;
    distance: number; // in leagues
    terrainType: 'plains' | 'forest' | 'mountain' | 'river' | 'wasteland';
    knownHazards: string[];
    recommendedMethod: 'walking' | 'riding' | 'sailing';
    age: 'First' | 'Second' | 'Third' | 'Fourth';
    historicalSignificance: string;
}

export interface MiddleEarthAge {
    age: 'First' | 'Second' | 'Third' | 'Fourth';
    yearInAge: number;
    totalYears: number;
    majorEvents: string[];
    dominantPowers: string[];
    safeRoutes: string[];
}

/**
 * Middle-earth Travel and Timeline Calculator
 * Handles Age-based dating and overland journey calculations
 */
export class MiddleEarthCalculator {
    private readonly LEAGUE_IN_MILES = 3; // 1 league ≈ 3 miles
    private readonly WALKING_SPEED_LEAGUES_PER_DAY = 8; // Standard walking pace
    private readonly RIDING_SPEED_LEAGUES_PER_DAY = 20; // Horse riding pace
    private readonly SAILING_SPEED_LEAGUES_PER_DAY = 30; // River/sea travel
    private readonly EAGLE_SPEED_LEAGUES_PER_DAY = 200; // Great Eagles

    /**
     * Calculate Middle-earth journey time and requirements
     */
    calculateJourney(
        distance: number,
        travelMethod: 'walking' | 'riding' | 'sailing' | 'eagle',
        terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous',
        fellowshipSize: number = 1,
        age?: MiddleEarthAge
    ): MiddleEarthJourney {
        const baseSpeed = this.getBaseSpeed(travelMethod);
        const terrainModifier = this.getTerrainModifier(terrain);
        const fellowshipModifier = this.getFellowshipModifier(fellowshipSize);

        const effectiveSpeed = baseSpeed * terrainModifier * fellowshipModifier;
        const travelDays = Math.ceil(distance / effectiveSpeed);

        const provisions = this.calculateProvisions(fellowshipSize, travelDays, terrain);
        const hazards = this.getHazards(terrain, travelMethod, age);

        return {
            distance,
            travelMethod,
            terrain,
            travelTime: this.convertTravelTime(travelDays),
            provisions,
            hazards,
            fellowshipSize,
        };
    }

    /**
     * Get base travel speed for different methods
     */
    private getBaseSpeed(method: 'walking' | 'riding' | 'sailing' | 'eagle'): number {
        switch (method) {
            case 'walking': return this.WALKING_SPEED_LEAGUES_PER_DAY;
            case 'riding': return this.RIDING_SPEED_LEAGUES_PER_DAY;
            case 'sailing': return this.SAILING_SPEED_LEAGUES_PER_DAY;
            case 'eagle': return this.EAGLE_SPEED_LEAGUES_PER_DAY;
            default: return this.WALKING_SPEED_LEAGUES_PER_DAY;
        }
    }

    /**
     * Get terrain difficulty modifier
     */
    private getTerrainModifier(terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous'): number {
        switch (terrain) {
            case 'easy': return 1.0;      // Roads, plains
            case 'moderate': return 0.7;  // Forests, hills
            case 'difficult': return 0.5; // Mountains, swamps
            case 'treacherous': return 0.3; // Mordor, Moria
            default: return 0.7;
        }
    }

    /**
     * Get fellowship size modifier (larger groups move slower)
     */
    private getFellowshipModifier(size: number): number {
        if (size <= 1) return 1.0;
        if (size <= 4) return 0.9;    // Small group
        if (size <= 9) return 0.8;    // Fellowship of the Ring
        if (size <= 20) return 0.7;   // Small company
        return 0.6;                   // Large group/army
    }

    /**
     * Convert travel days to readable format
     */
    private convertTravelTime(days: number) {
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);

        return {
            days: Math.round(days),
            weeks: Math.round(weeks * 10) / 10,
            months: Math.round(months * 10) / 10,
        };
    }

    /**
     * Calculate provisions needed (in lembas bread equivalents)
     */
    private calculateProvisions(fellowshipSize: number, days: number, terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous'): number {
        const baseRationPerDay = 2; // lembas pieces per person per day
        let terrainMultiplier = 1;

        // Harder terrain requires more food
        switch (terrain) {
            case 'difficult': terrainMultiplier = 1.5; break;
            case 'treacherous': terrainMultiplier = 2.0; break;
        }

        return Math.ceil(fellowshipSize * days * baseRationPerDay * terrainMultiplier);
    }

    /**
     * Get hazards based on terrain and method
     */
    private getHazards(
        terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous',
        method: 'walking' | 'riding' | 'sailing' | 'eagle',
        age?: MiddleEarthAge
    ): string[] {
        const hazards: string[] = [];

        // Terrain-based hazards
        switch (terrain) {
            case 'moderate':
                hazards.push('Wild animals', 'Getting lost', 'Weather');
                break;
            case 'difficult':
                hazards.push('Mountain passes', 'River crossings', 'Bandits', 'Severe weather');
                break;
            case 'treacherous':
                hazards.push('Orcs', 'Nazgûl', 'Hostile terrain', 'Dark magic', 'Despair');
                break;
        }

        // Method-specific hazards
        if (method === 'sailing') {
            hazards.push('Storms', 'River rapids', 'Sea monsters');
        }
        if (method === 'eagle') {
            hazards.push('Arrow fire', 'Other flying creatures', 'High altitude');
        }

        // Age-specific hazards
        if (age) {
            switch (age.age) {
                case 'First':
                    hazards.push('Balrogs', 'Dragons', 'Morgoth\'s forces');
                    break;
                case 'Second':
                    hazards.push('Sauron\'s corruption', 'Nazgûl rising');
                    break;
                case 'Third':
                    hazards.push('Sauron\'s return', 'Saruman\'s Uruk-hai', 'The Ring\'s influence');
                    break;
            }
        }

        return hazards;
    }

    /**
     * Famous Middle-earth routes
     */
    getMiddleEarthRoutes(): MiddleEarthRoute[] {
        return [
            {
                origin: 'Hobbiton',
                destination: 'Rivendell',
                distance: 400,
                terrainType: 'forest',
                knownHazards: ['Old Forest', 'Barrow-wights', 'Black Riders'],
                recommendedMethod: 'walking',
                age: 'Third',
                historicalSignificance: 'Frodo\'s journey to the Council of Elrond',
            },
            {
                origin: 'Rivendell',
                destination: 'Moria',
                distance: 300,
                terrainType: 'mountain',
                knownHazards: ['Caradhras', 'Wargs', 'Orcs'],
                recommendedMethod: 'walking',
                age: 'Third',
                historicalSignificance: 'Fellowship\'s attempt to cross the Misty Mountains',
            },
            {
                origin: 'Moria',
                destination: 'Lothlórien',
                distance: 100,
                terrainType: 'forest',
                knownHazards: ['Orc pursuit', 'Grief and loss'],
                recommendedMethod: 'walking',
                age: 'Third',
                historicalSignificance: 'Fellowship seeks refuge after Gandalf\'s fall',
            },
            {
                origin: 'Edoras',
                destination: 'Helm\'s Deep',
                distance: 50,
                terrainType: 'plains',
                knownHazards: ['Saruman\'s forces', 'Warg riders'],
                recommendedMethod: 'riding',
                age: 'Third',
                historicalSignificance: 'Rohirrim retreat to the fortress',
            },
            {
                origin: 'Isengard',
                destination: 'Minas Tirith',
                distance: 400,
                terrainType: 'plains',
                knownHazards: ['Orc armies', 'Nazgûl', 'Siege warfare'],
                recommendedMethod: 'riding',
                age: 'Third',
                historicalSignificance: 'The path of war in the War of the Ring',
            },
            {
                origin: 'Minas Tirith',
                destination: 'Mount Doom',
                distance: 200,
                terrainType: 'wasteland',
                knownHazards: ['Mordor orcs', 'The Eye of Sauron', 'Volcanic activity', 'Ring\'s weight'],
                recommendedMethod: 'walking',
                age: 'Third',
                historicalSignificance: 'Frodo and Sam\'s final approach to destroy the Ring',
            },
            {
                origin: 'Grey Havens',
                destination: 'Valinor',
                distance: 1000,
                terrainType: 'river',
                knownHazards: ['Straight Road', 'Leaving Middle-earth forever'],
                recommendedMethod: 'sailing',
                age: 'Third',
                historicalSignificance: 'The Last Ship - Frodo\'s departure from Middle-earth',
            },
        ];
    }

    /**
     * Convert between Ages of Middle-earth
     */
    convertMiddleEarthAge(
        years: number,
        age: 'First' | 'Second' | 'Third' | 'Fourth',
        targetAge?: 'First' | 'Second' | 'Third' | 'Fourth'
    ): MiddleEarthAge {
        const majorEvents = this.getMajorEventsForAge(years, age);
        const dominantPowers = this.getDominantPowers(age);
        const safeRoutes = this.getSafeRoutes(age);

        return {
            age,
            yearInAge: years,
            totalYears: this.calculateTotalYears(years, age),
            majorEvents,
            dominantPowers,
            safeRoutes,
        };
    }

    /**
     * Get major events for a specific age and year
     */
    private getMajorEventsForAge(years: number, age: 'First' | 'Second' | 'Third' | 'Fourth'): string[] {
        const events: Record<string, string[]> = {
            'First_early': ['Awakening of the Elves', 'The Great Journey', 'Morgoth\'s return'],
            'First_late': ['Fall of Gondolin', 'Fall of Doriath', 'War of Wrath'],
            'Second_early': ['Founding of Númenor', 'Forging of the Rings of Power'],
            'Second_late': ['Downfall of Númenor', 'Last Alliance of Elves and Men'],
            'Third_early': ['Isildur\'s Bane', 'Founding of Rohan', 'Balrog in Moria'],
            'Third_late': ['The Hobbit', 'War of the Ring', 'Destruction of the Ring'],
            'Fourth_early': ['Age of Men begins', 'Elves depart', 'Shire restored'],
        };

        const period = years < 1000 ? 'early' : 'late';
        const key = `${age}_${period}`;
        return events[key] || [];
    }

    /**
     * Get dominant powers for each age
     */
    private getDominantPowers(age: 'First' | 'Second' | 'Third' | 'Fourth'): string[] {
        switch (age) {
            case 'First':
                return ['Morgoth', 'Elven Kingdoms', 'Dwarven Halls'];
            case 'Second':
                return ['Númenor', 'Gil-galad', 'Sauron'];
            case 'Third':
                return ['Gondor', 'Rohan', 'Sauron', 'Saruman'];
            case 'Fourth':
                return ['Reunited Kingdom', 'Rohan', 'Shire'];
            default:
                return [];
        }
    }

    /**
     * Get safe travel routes for each age
     */
    private getSafeRoutes(age: 'First' | 'Second' | 'Third' | 'Fourth'): string[] {
        switch (age) {
            case 'First':
                return ['Hidden paths', 'Elven roads', 'Dwarven tunnels'];
            case 'Second':
                return ['Númenórean roads', 'Elven paths', 'Great East Road'];
            case 'Third':
                return ['Great East Road', 'Old Forest Road', 'Anduin River'];
            case 'Fourth':
                return ['King\'s Road', 'Restored paths', 'All major routes'];
            default:
                return [];
        }
    }

    /**
     * Calculate total years from the beginning of time
     */
    private calculateTotalYears(yearInAge: number, age: 'First' | 'Second' | 'Third' | 'Fourth'): number {
        const ageDurations = {
            First: 0,      // Base
            Second: 3441,  // First Age duration
            Third: 6462,   // First + Second Age duration
            Fourth: 9462,  // First + Second + Third Age duration
        };

        return ageDurations[age] + yearInAge;
    }

    /**
     * Calculate the One Ring's influence on journey
     */
    calculateRingInfluence(hasRing: boolean, daysTraveling: number): {
        corruptionLevel: number;
        mentalFatigue: number;
        physicalBurden: number;
        recommendations: string[];
    } {
        if (!hasRing) {
            return {
                corruptionLevel: 0,
                mentalFatigue: 0,
                physicalBurden: 0,
                recommendations: ['Travel safely, the Ring does not burden you'],
            };
        }

        const corruptionLevel = Math.min(100, daysTraveling * 0.5);
        const mentalFatigue = Math.min(100, daysTraveling * 0.8);
        const physicalBurden = Math.min(100, daysTraveling * 0.3);

        const recommendations = [];
        if (corruptionLevel > 50) recommendations.push('Beware the Ring\'s growing influence');
        if (mentalFatigue > 70) recommendations.push('Rest is crucial for mental stability');
        if (physicalBurden > 60) recommendations.push('The Ring grows heavier with each step');
        if (daysTraveling > 100) recommendations.push('Speed is essential - the Ring must not linger');

        return {
            corruptionLevel,
            mentalFatigue,
            physicalBurden,
            recommendations,
        };
    }
}

export default MiddleEarthCalculator;
