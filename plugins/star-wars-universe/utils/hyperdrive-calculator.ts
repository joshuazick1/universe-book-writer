/**
 * Star Wars Hyperdrive Calculator
 * Implements hyperdrive class system and galactic travel calculations
 */

export interface HyperdriveCalculation {
    hyperdriveClass: number;
    speedMultiplier: number;
    baseSpeed: number;
    actualSpeed: number;
    travelTime: {
        seconds: number;
        minutes: number;
        hours: number;
        days: number;
        standardDays: number;
    };
    fuelConsumption: number;
    safetyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Dangerous';
}

export interface HyperRoute {
    origin: string;
    destination: string;
    distance: number; // in light years
    hyperspaceLanes: string[];
    hazards: string[];
    recommendedClass: number;
    yavinBattleContext: 'BBY' | 'ABY';
    yavinYears: number;
}

export interface YavinDateSystem {
    years: number;
    period: 'BBY' | 'ABY';
    galacticStandardYear: number;
    majorEvents: string[];
}

/**
 * Star Wars Hyperdrive Speed Calculator
 * Handles hyperdrive class system and Battle of Yavin dating
 */
export class HyperdriveCalculator {
    private readonly SPEED_OF_LIGHT = 299792458; // meters per second
    private readonly LIGHT_YEAR_IN_METERS = 9.461e15;
    private readonly GALACTIC_STANDARD_DAY = 86400; // 24 hours
    private readonly GALACTIC_STANDARD_YEAR = 365 * this.GALACTIC_STANDARD_DAY;

    // Base hyperdrive speed (Class 1 = 100,000 times light speed)
    private readonly BASE_HYPERDRIVE_SPEED = 100000;

    /**
     * Calculate hyperdrive travel time and details
     */
    calculateHyperdriveTravel(
        hyperdriveClass: number,
        distance: number,
        yavinDate?: YavinDateSystem
    ): HyperdriveCalculation {
        const speedMultiplier = this.getSpeedMultiplier(hyperdriveClass);
        const actualSpeed = (this.BASE_HYPERDRIVE_SPEED / hyperdriveClass) * this.SPEED_OF_LIGHT;
        const travelTimeSeconds = (distance * this.LIGHT_YEAR_IN_METERS) / actualSpeed;
        const fuelConsumption = this.calculateFuelConsumption(hyperdriveClass, distance);
        const safetyRating = this.getSafetyRating(hyperdriveClass);

        return {
            hyperdriveClass,
            speedMultiplier,
            baseSpeed: this.BASE_HYPERDRIVE_SPEED,
            actualSpeed,
            travelTime: this.convertTravelTime(travelTimeSeconds),
            fuelConsumption,
            safetyRating,
        };
    }

    /**
     * Get speed multiplier based on hyperdrive class
     */
    private getSpeedMultiplier(hyperdriveClass: number): number {
        // Lower class = faster speed
        // Class 1 = 100,000x light speed
        // Class 2 = 50,000x light speed
        // Class 3 = 33,333x light speed, etc.
        return this.BASE_HYPERDRIVE_SPEED / hyperdriveClass;
    }

    /**
     * Convert travel time from seconds to readable format
     */
    private convertTravelTime(seconds: number) {
        const standardDays = seconds / this.GALACTIC_STANDARD_DAY;
        const days = Math.floor(standardDays);
        const hours = Math.floor((seconds % this.GALACTIC_STANDARD_DAY) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return {
            seconds: Math.round(seconds),
            minutes: Math.round(seconds / 60),
            hours: Math.round(seconds / 3600),
            days: Math.round(standardDays),
            standardDays: Math.round(standardDays * 100) / 100,
        };
    }

    /**
     * Calculate fuel consumption (coaxium/hypermatter)
     */
    private calculateFuelConsumption(hyperdriveClass: number, distance: number): number {
        // Better hyperdrive classes are more fuel efficient
        // Class 1 = most efficient, higher classes consume more fuel
        const baseFuelRate = 10; // units per light year
        const classMultiplier = Math.pow(hyperdriveClass, 1.5);
        return Math.round(baseFuelRate * classMultiplier * distance);
    }

    /**
     * Get safety rating based on hyperdrive class
     */
    private getSafetyRating(hyperdriveClass: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Dangerous' {
        if (hyperdriveClass <= 1) return 'Excellent';
        if (hyperdriveClass <= 2) return 'Good';
        if (hyperdriveClass <= 3) return 'Fair';
        if (hyperdriveClass <= 5) return 'Poor';
        return 'Dangerous';
    }

    /**
     * Get recommended hyperdrive class for urgency level
     */
    getRecommendedHyperdriveClass(
        distance: number,
        urgency: 'routine' | 'urgent' | 'emergency',
        budget: 'unlimited' | 'high' | 'moderate' | 'low'
    ): number {
        let baseClass = 2; // Standard recommendation

        // Adjust for urgency
        if (urgency === 'emergency') {
            baseClass = 1;
        } else if (urgency === 'urgent') {
            baseClass = 1.5;
        }

        // Adjust for budget
        if (budget === 'low') {
            baseClass += 2;
        } else if (budget === 'moderate') {
            baseClass += 1;
        }

        // Adjust for distance
        if (distance > 10000) {
            baseClass -= 0.5; // Long distances benefit from better hyperdrives
        }

        return Math.max(1, Math.min(6, Math.round(baseClass * 2) / 2));
    }

    /**
     * Famous Star Wars hyperlanes and routes
     */
    getStarWarsRoutes(): HyperRoute[] {
        return [
            {
                origin: 'Coruscant',
                destination: 'Tatooine',
                distance: 43000,
                hyperspaceLanes: ['Corellian Trade Spine', 'Triellus Trade Route'],
                hazards: ['Imperial patrols', 'Hutt space'],
                recommendedClass: 2,
                yavinBattleContext: 'ABY',
                yavinYears: 4,
            },
            {
                origin: 'Yavin 4',
                destination: 'Hoth',
                distance: 50000,
                hyperspaceLanes: ['Sanctuary Pipeline'],
                hazards: ['Imperial pursuit', 'Asteroid fields'],
                recommendedClass: 1,
                yavinBattleContext: 'ABY',
                yavinYears: 3,
            },
            {
                origin: 'Naboo',
                destination: 'Geonosis',
                distance: 25000,
                hyperspaceLanes: ['Rimma Trade Route'],
                hazards: ['Separatist forces', 'Droid factories'],
                recommendedClass: 1.5,
                yavinBattleContext: 'BBY',
                yavinYears: 22,
            },
            {
                origin: 'Coruscant',
                destination: 'Kamino',
                distance: 60000,
                hyperspaceLanes: ['Kamino-Coruscant route'],
                hazards: ['Storms', 'Hidden location'],
                recommendedClass: 1,
                yavinBattleContext: 'BBY',
                yavinYears: 22,
            },
            {
                origin: 'Kessel',
                destination: 'Tatooine',
                distance: 18000,
                hyperspaceLanes: ['Kessel Run'],
                hazards: ['The Maw', 'Imperial entanglements', 'Space slugs'],
                recommendedClass: 0.5, // Millennium Falcon's modified Class 0.5
                yavinBattleContext: 'BBY',
                yavinYears: 0,
            },
            {
                origin: 'Alderaan',
                destination: 'Death Star',
                distance: 2000,
                hyperspaceLanes: ['Alderaan-Coruscant route'],
                hazards: ['Planetary destruction', 'Tractor beams'],
                recommendedClass: 1,
                yavinBattleContext: 'BBY',
                yavinYears: 0,
            },
        ];
    }

    /**
     * Convert Yavin Battle Dating system
     */
    convertYavinDate(
        years: number,
        period: 'BBY' | 'ABY',
        targetPeriod?: 'BBY' | 'ABY'
    ): YavinDateSystem {
        const majorEvents = this.getMajorEventsForYear(years, period);

        if (targetPeriod && targetPeriod !== period) {
            // Convert between BBY and ABY
            if (period === 'BBY' && targetPeriod === 'ABY') {
                return {
                    years: years + 0, // BBY 0 = ABY 0 (Battle of Yavin)
                    period: 'ABY',
                    galacticStandardYear: this.getGalacticStandardYear(0, 'ABY'),
                    majorEvents: this.getMajorEventsForYear(0, 'ABY'),
                };
            } else {
                return {
                    years: years + 0, // ABY 0 = BBY 0 (Battle of Yavin)
                    period: 'BBY',
                    galacticStandardYear: this.getGalacticStandardYear(0, 'BBY'),
                    majorEvents: this.getMajorEventsForYear(0, 'BBY'),
                };
            }
        }

        return {
            years,
            period,
            galacticStandardYear: this.getGalacticStandardYear(years, period),
            majorEvents,
        };
    }

    /**
     * Get major events for a specific year
     */
    private getMajorEventsForYear(years: number, period: 'BBY' | 'ABY'): string[] {
        const events: Record<string, string[]> = {
            'BBY_32': ['Phantom Menace events', 'Naboo Crisis'],
            'BBY_22': ['Attack of the Clones', 'Clone Wars begin'],
            'BBY_19': ['Revenge of the Sith', 'Empire established'],
            'BBY_0': ['A New Hope', 'Battle of Yavin', 'Death Star destroyed'],
            'ABY_3': ['Empire Strikes Back', 'Battle of Hoth'],
            'ABY_4': ['Return of the Jedi', 'Battle of Endor'],
            'ABY_30': ['The Force Awakens era', 'First Order rises'],
        };

        const key = `${period}_${years}`;
        return events[key] || [];
    }

    /**
     * Get galactic standard year equivalent
     */
    private getGalacticStandardYear(years: number, period: 'BBY' | 'ABY'): number {
        // Galactic Standard Year 0 = Battle of Yavin
        const baseYear = 0;

        if (period === 'BBY') {
            return baseYear - years;
        } else {
            return baseYear + years;
        }
    }

    /**
     * Calculate the famous "Kessel Run" time
     */
    calculateKesselRun(hyperdriveClass: number): {
        distance: number;
        time: string;
        parsecs: number;
        speedClaim: string;
    } {
        // The Millennium Falcon did it in "less than 12 parsecs"
        const standardDistance = 18000; // light years
        const calculation = this.calculateHyperdriveTravel(hyperdriveClass, standardDistance);
        const parsecs = standardDistance * 0.306; // Convert light years to parsecs

        let speedClaim = '';
        if (parsecs < 12) {
            speedClaim = `Made it in ${parsecs.toFixed(1)} parsecs!`;
        } else {
            speedClaim = `Standard route: ${parsecs.toFixed(1)} parsecs`;
        }

        return {
            distance: standardDistance,
            time: `${calculation.travelTime.hours} hours, ${calculation.travelTime.minutes % 60} minutes`,
            parsecs: Math.round(parsecs * 10) / 10,
            speedClaim,
        };
    }
}

export default HyperdriveCalculator;
