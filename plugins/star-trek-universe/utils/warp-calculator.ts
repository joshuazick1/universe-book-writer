/**
 * Star Trek Warp Speed Calculator
 * Implements both TOS and TNG warp scales with stardate context
 */

export interface WarpCalculation {
    warpFactor: number;
    velocityMultiple: number;
    lightSpeed: number;
    actualSpeed: number;
    travelTime: {
        seconds: number;
        minutes: number;
        hours: number;
        days: number;
        years: number;
    };
    scale: 'TOS' | 'TNG';
    stardate?: number;
}

export interface TravelRoute {
    origin: string;
    destination: string;
    distance: number; // in light years
    hazards: string[];
    recommendedWarpFactor: number;
}

/**
 * Star Trek Warp Speed Calculator
 * Handles both TOS (2260s) and TNG (2360s+) warp scales
 */
export class WarpSpeedCalculator {
    private readonly SPEED_OF_LIGHT = 299792458; // meters per second
    private readonly LIGHT_YEAR_IN_METERS = 9.461e15;
    private readonly SECONDS_PER_YEAR = 31557600;

    /**
     * Calculate warp speed based on era and stardate
     */
    calculateWarpSpeed(
        warpFactor: number,
        stardate: number,
        distance: number,
        era: 'TOS' | 'TNG' | 'auto' = 'auto'
    ): WarpCalculation {
        const scale = era === 'auto' ? this.determineScaleFromStardate(stardate) : era;
        const velocityMultiple = this.getVelocityMultiple(warpFactor, scale);
        const actualSpeed = velocityMultiple * this.SPEED_OF_LIGHT;
        const travelTimeSeconds = (distance * this.LIGHT_YEAR_IN_METERS) / actualSpeed;

        return {
            warpFactor,
            velocityMultiple,
            lightSpeed: this.SPEED_OF_LIGHT,
            actualSpeed,
            travelTime: this.convertTravelTime(travelTimeSeconds),
            scale,
            stardate,
        };
    }

    /**
     * Determine warp scale based on stardate
     */
    private determineScaleFromStardate(stardate: number): 'TOS' | 'TNG' {
        // TOS era: stardates 1000-5999
        // TNG era: stardates 40000+
        if (stardate >= 1000 && stardate < 6000) {
            return 'TOS';
        } else if (stardate >= 40000) {
            return 'TNG';
        } else {
            // Default to TNG for modern calculations
            return 'TNG';
        }
    }

    /**
     * Calculate velocity multiple based on warp factor and scale
     */
    private getVelocityMultiple(warpFactor: number, scale: 'TOS' | 'TNG'): number {
        if (scale === 'TOS') {
            // TOS Scale: v = w³ * c (cubic function)
            return Math.pow(warpFactor, 3);
        } else {
            // TNG Scale: Complex logarithmic function
            if (warpFactor < 1) {
                return warpFactor;
            } else if (warpFactor <= 9) {
                // Standard TNG formula: v = w^(10/3) * c
                return Math.pow(warpFactor, 10 / 3);
            } else if (warpFactor < 10) {
                // Asymptotic approach to infinite speed at Warp 10
                const denominator = 10 - warpFactor;
                return Math.pow(warpFactor, 10 / 3) * (1 + Math.pow(10, 6) / Math.pow(denominator, 3));
            } else {
                // Warp 10 = infinite speed (theoretical)
                return Infinity;
            }
        }
    }

    /**
     * Convert travel time from seconds to readable format
     */
    private convertTravelTime(seconds: number) {
        const years = seconds / this.SECONDS_PER_YEAR;
        const days = (seconds % this.SECONDS_PER_YEAR) / 86400;
        const hours = (seconds % 86400) / 3600;
        const minutes = (seconds % 3600) / 60;

        return {
            seconds: Math.round(seconds),
            minutes: Math.round(seconds / 60),
            hours: Math.round(seconds / 3600),
            days: Math.round(seconds / 86400),
            years: Math.round(years * 100) / 100,
        };
    }

    /**
     * Get recommended warp factor for a given route
     */
    getRecommendedWarpFactor(distance: number, urgency: 'routine' | 'priority' | 'emergency'): number {
        if (urgency === 'emergency') {
            return 9.5; // Maximum safe warp
        } else if (urgency === 'priority') {
            return 8.0; // High warp
        } else {
            return distance > 100 ? 6.0 : 4.0; // Cruising warp
        }
    }

    /**
     * Calculate fuel consumption (deuterium/antimatter)
     */
    calculateFuelConsumption(warpFactor: number, duration: number): {
        deuterium: number;
        antimatter: number;
        totalEnergy: number;
    } {
        // Fuel consumption increases exponentially with warp factor
        const baseConsumption = Math.pow(warpFactor, 4) * duration;

        return {
            deuterium: baseConsumption * 0.6, // kg
            antimatter: baseConsumption * 0.4, // kg
            totalEnergy: baseConsumption * 9e16, // joules (E=mc²)
        };
    }

    /**
     * Famous Star Trek routes with pre-calculated data
     */
    getStarTrekRoutes(): TravelRoute[] {
        return [
            {
                origin: 'Earth (Sol System)',
                destination: 'Vulcan (40 Eridani)',
                distance: 16.5,
                hazards: ['Solar radiation', 'Asteroid belt'],
                recommendedWarpFactor: 5.0,
            },
            {
                origin: 'Earth (Sol System)',
                destination: 'Qo\'noS (Klingon Homeworld)',
                distance: 90,
                hazards: ['Klingon patrols', 'Neutral Zone'],
                recommendedWarpFactor: 7.0,
            },
            {
                origin: 'Deep Space 9',
                destination: 'Bajor',
                distance: 0.16,
                hazards: ['Cardassian remnants', 'Wormhole interference'],
                recommendedWarpFactor: 2.0,
            },
            {
                origin: 'Earth (Sol System)',
                destination: 'Delta Quadrant (Voyager\'s position)',
                distance: 70000,
                hazards: ['Borg space', 'Unknown species', 'Resource depletion'],
                recommendedWarpFactor: 9.975,
            },
            {
                origin: 'Earth (Sol System)',
                destination: 'Risa',
                distance: 90,
                hazards: ['Weather control systems'],
                recommendedWarpFactor: 6.0,
            },
        ];
    }

    /**
     * Generate stardate from Earth date
     */
    generateStardate(earthDate: Date, era: 'TOS' | 'TNG'): number {
        if (era === 'TOS') {
            // TOS stardates are somewhat arbitrary but roughly 1000-5999
            const year = earthDate.getFullYear();
            if (year >= 2265 && year <= 2270) {
                return 1000 + ((year - 2265) * 1000) + (earthDate.getMonth() * 83) + (earthDate.getDate() * 2.7);
            }
        } else {
            // TNG stardates: 40000+ (roughly 1000 per year)
            const year = earthDate.getFullYear();
            if (year >= 2364) {
                return 40000 + ((year - 2364) * 1000) + (earthDate.getMonth() * 83) + (earthDate.getDate() * 2.7);
            }
        }

        // Default TNG stardate
        return 47000 + Math.random() * 1000;
    }
}

export default WarpSpeedCalculator;
