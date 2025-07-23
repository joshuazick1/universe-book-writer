/**
 * Harry Potter Magical Calculator
 * Implements magical transport, school year systems, and house point calculations
 */

export interface MagicalTransportCalculation {
    method: 'floo' | 'apparition' | 'portkey' | 'knight_bus' | 'flying' | 'hogwarts_express';
    distance: number; // in miles
    travelTime: {
        minutes: number;
        hours: number;
        description: string;
    };
    magicalEnergy: number; // energy required (1-100 scale)
    safetyRating: 'Very Safe' | 'Safe' | 'Moderate' | 'Dangerous' | 'Extremely Dangerous';
    restrictions: string[];
    cost?: number; // in galleons
}

export interface HogwartsSchoolYear {
    startYear: number;
    endYear: number;
    term: 'autumn' | 'spring' | 'summer';
    week: number;
    description: string;
    majorEvents: string[];
    examPeriods: string[];
}

export interface HousePointsCalculation {
    house: 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin';
    currentPoints: number;
    pointsAwarded: number;
    pointsDeducted: number;
    reason: string;
    awardedBy: string;
    newTotal: number;
    houseCupStanding: number;
}

export interface MagicalRoute {
    origin: string;
    destination: string;
    distance: number; // in miles
    methods: string[];
    restrictions: string[];
    recommendedMethod: string;
    schoolYear?: number;
    term?: string;
    description: string;
}

/**
 * Harry Potter Magical Transport and School Calculator
 */
export class MagicalCalculator {
    private readonly FLOO_SPEED = 200; // miles per minute
    private readonly APPARITION_RANGE = 500; // max safe distance in miles
    private readonly KNIGHT_BUS_SPEED = 50; // miles per hour (accounting for stops)
    private readonly FLYING_SPEED = 60; // miles per hour (broomstick average)

    // Hogwarts school year dates
    private readonly TERM_DATES = {
        autumn: { start: 'September 1', end: 'December 20' },
        spring: { start: 'January 7', end: 'June 30' },
        summer: { start: 'July 1', end: 'August 31' }
    };

    /**
     * Calculate magical transport time and requirements
     */
    calculateMagicalTransport(
        method: 'floo' | 'apparition' | 'portkey' | 'knight_bus' | 'flying' | 'hogwarts_express',
        distance: number,
        passengerAge: number = 17,
        hasPermits: boolean = true
    ): MagicalTransportCalculation {
        let travelTime;
        let magicalEnergy;
        let safetyRating: 'Very Safe' | 'Safe' | 'Moderate' | 'Dangerous' | 'Extremely Dangerous';
        let restrictions: string[] = [];
        let cost: number | undefined;

        switch (method) {
            case 'floo':
                travelTime = {
                    minutes: Math.ceil(distance / this.FLOO_SPEED),
                    hours: 0,
                    description: 'Instantaneous via Floo Network'
                };
                travelTime.hours = Math.floor(travelTime.minutes / 60);
                travelTime.minutes = travelTime.minutes % 60;
                magicalEnergy = 10;
                safetyRating = 'Safe';
                restrictions = ['Must have Floo powder', 'Connected fireplaces only', 'Clear pronunciation required'];
                cost = 0.02; // 2 Knuts per journey
                break;

            case 'apparition':
                if (distance > this.APPARITION_RANGE) {
                    restrictions.push('Distance exceeds safe Apparition range');
                    safetyRating = 'Extremely Dangerous';
                } else {
                    safetyRating = passengerAge >= 17 && hasPermits ? 'Moderate' : 'Dangerous';
                }
                travelTime = {
                    minutes: 0,
                    hours: 0,
                    description: 'Instantaneous'
                };
                magicalEnergy = Math.min(80, distance * 0.5);
                restrictions = ['Must be 17 or older', 'Requires Apparition license', 'Risk of splinching'];
                if (passengerAge < 17) restrictions.push('Side-along Apparition with adult required');
                break;

            case 'portkey':
                travelTime = {
                    minutes: 0,
                    hours: 0,
                    description: 'Instantaneous at activation time'
                };
                magicalEnergy = 5;
                safetyRating = 'Very Safe';
                restrictions = ['Ministry approved Portkey required', 'Scheduled activation times only'];
                break;

            case 'knight_bus':
                const hours = distance / this.KNIGHT_BUS_SPEED;
                travelTime = {
                    minutes: Math.round((hours % 1) * 60),
                    hours: Math.floor(hours),
                    description: `Magical public transport with multiple stops`
                };
                magicalEnergy = 0;
                safetyRating = 'Safe';
                restrictions = ['Emergency transport only', 'No underage unaccompanied travel'];
                cost = 0.5 + (distance * 0.01); // Base fare + distance
                break;

            case 'flying':
                const flyingHours = distance / this.FLYING_SPEED;
                travelTime = {
                    minutes: Math.round((flyingHours % 1) * 60),
                    hours: Math.floor(flyingHours),
                    description: `Flying by broomstick or magical creature`
                };
                magicalEnergy = 30;
                safetyRating = 'Moderate';
                restrictions = ['Weather dependent', 'Requires flying skills', 'International airspace restrictions'];
                if (distance > 100) restrictions.push('Long distance flying permits required');
                break;

            case 'hogwarts_express':
                travelTime = {
                    minutes: 0,
                    hours: 9,
                    description: 'September 1st and end of term service'
                };
                magicalEnergy = 0;
                safetyRating = 'Very Safe';
                restrictions = ['Hogwarts students only', 'Specific travel dates', 'Platform 9¾ access required'];
                cost = 0; // Included in school fees
                break;

            default:
                throw new Error(`Unknown transport method: ${method}`);
        }

        return {
            method,
            distance,
            travelTime,
            magicalEnergy,
            safetyRating,
            restrictions,
            cost
        };
    }

    /**
     * Calculate current school year and term
     */
    calculateSchoolYear(
        currentDate: Date,
        startingYear: number = 1991
    ): HogwartsSchoolYear {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();

        let schoolYear;
        let term: 'autumn' | 'spring' | 'summer';
        let week: number;

        // Determine which school year we're in
        if (currentMonth >= 9 || (currentMonth === 8 && currentDay >= 15)) {
            schoolYear = currentYear - startingYear + 1;
        } else {
            schoolYear = currentYear - startingYear;
        }

        // Determine term
        if (currentMonth >= 9 || currentMonth <= 1) {
            term = 'autumn';
            week = this.calculateWeekInTerm(currentDate, 'autumn');
        } else if (currentMonth >= 2 && currentMonth <= 6) {
            term = 'spring';
            week = this.calculateWeekInTerm(currentDate, 'spring');
        } else {
            term = 'summer';
            week = this.calculateWeekInTerm(currentDate, 'summer');
        }

        const description = `Year ${schoolYear}, ${term} term, Week ${week}`;
        const majorEvents = this.getMajorEventsForWeek(schoolYear, term, week);
        const examPeriods = this.getExamPeriods(term, week);

        return {
            startYear: startingYear + schoolYear - 1,
            endYear: startingYear + schoolYear,
            term,
            week,
            description,
            majorEvents,
            examPeriods
        };
    }

    /**
     * Calculate house points and standings
     */
    calculateHousePoints(
        house: 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin',
        currentPoints: number,
        pointsChange: number,
        reason: string,
        awardedBy: string,
        allHousePoints: Record<string, number>
    ): HousePointsCalculation {
        const newTotal = currentPoints + pointsChange;

        // Update all house points for ranking
        const updatedPoints = { ...allHousePoints, [house]: newTotal };
        const sortedHouses = Object.entries(updatedPoints)
            .sort(([, a], [, b]) => b - a)
            .map(([houseName]) => houseName);

        const houseCupStanding = sortedHouses.indexOf(house) + 1;

        return {
            house,
            currentPoints,
            pointsAwarded: pointsChange > 0 ? pointsChange : 0,
            pointsDeducted: pointsChange < 0 ? Math.abs(pointsChange) : 0,
            reason,
            awardedBy,
            newTotal,
            houseCupStanding
        };
    }

    /**
     * Get famous magical routes in the wizarding world
     */
    getWizardingRoutes(): MagicalRoute[] {
        return [
            {
                origin: 'King\'s Cross Station',
                destination: 'Hogsmeade Station',
                distance: 500,
                methods: ['hogwarts_express'],
                restrictions: ['September 1st and end of term only', 'Hogwarts students only'],
                recommendedMethod: 'hogwarts_express',
                schoolYear: 1,
                term: 'autumn',
                description: 'The iconic journey to Hogwarts School of Witchcraft and Wizardry'
            },
            {
                origin: 'Diagon Alley',
                destination: 'Hogwarts',
                distance: 500,
                methods: ['floo', 'apparition', 'flying'],
                restrictions: ['Floo Network access required', 'Apparition within grounds prohibited'],
                recommendedMethod: 'floo',
                description: 'Shopping trip to school journey'
            },
            {
                origin: 'The Burrow',
                destination: 'King\'s Cross Station',
                distance: 50,
                methods: ['flying', 'floo', 'apparition', 'knight_bus'],
                restrictions: [],
                recommendedMethod: 'flying',
                description: 'Weasley family traditional route to catch the Hogwarts Express'
            },
            {
                origin: 'Grimmauld Place',
                destination: 'Hogwarts',
                distance: 500,
                methods: ['apparition', 'floo', 'knight_bus'],
                restrictions: ['Headquarters under Fidelius Charm'],
                recommendedMethod: 'apparition',
                description: 'Order of the Phoenix to Hogwarts during dangerous times'
            },
            {
                origin: 'Ministry of Magic',
                destination: 'Azkaban',
                distance: 100,
                methods: ['flying', 'apparition'],
                restrictions: ['Official business only', 'Maximum security clearance required'],
                recommendedMethod: 'flying',
                description: 'Official transport to the wizarding prison'
            },
            {
                origin: 'Hogsmeade',
                destination: 'Hogwarts',
                distance: 2,
                methods: ['walking', 'flying'],
                restrictions: ['Third years and above only', 'Permission slip required'],
                recommendedMethod: 'walking',
                description: 'Weekend trips to the wizarding village'
            }
        ];
    }

    /**
     * Calculate week in current term
     */
    private calculateWeekInTerm(currentDate: Date, term: 'autumn' | 'spring' | 'summer'): number {
        // Simplified calculation - in reality would need specific term start dates
        const currentMonth = currentDate.getMonth() + 1;
        const currentWeek = Math.ceil(currentDate.getDate() / 7);

        switch (term) {
            case 'autumn':
                return currentMonth >= 9 ? (currentMonth - 9) * 4 + currentWeek : currentWeek;
            case 'spring':
                return (currentMonth - 1) * 4 + currentWeek;
            case 'summer':
                return (currentMonth - 6) * 4 + currentWeek;
            default:
                return 1;
        }
    }

    /**
     * Get major events for specific week
     */
    private getMajorEventsForWeek(schoolYear: number, term: string, week: number): string[] {
        const events: string[] = [];

        // Add some example events based on the books
        if (term === 'autumn') {
            if (week === 1) events.push('Start of Term Feast', 'First Years Sorting');
            if (week === 8) events.push('Halloween Feast');
            if (week === 16) events.push('Christmas Holidays Begin');
        } else if (term === 'spring') {
            if (week === 1) events.push('Return from Christmas Holidays');
            if (week === 8) events.push('Valentine\'s Day');
            if (week === 20) events.push('End of Year Exams Begin');
        }

        return events;
    }

    /**
     * Get exam periods for current term
     */
    private getExamPeriods(term: string, week: number): string[] {
        const exams: string[] = [];

        if (term === 'spring' && week >= 18) {
            exams.push('O.W.L.S.', 'N.E.W.T.S.', 'End of Year Exams');
        } else if (term === 'autumn' && week >= 12) {
            exams.push('Mid-term Assessments');
        }

        return exams;
    }

    /**
     * Calculate Sorting Hat house probability
     */
    calculateHouseProbability(
        traits: {
            courage: number; // 1-10
            intelligence: number; // 1-10
            loyalty: number; // 1-10
            ambition: number; // 1-10
        }
    ): Record<string, number> {
        const total = traits.courage + traits.intelligence + traits.loyalty + traits.ambition;

        return {
            gryffindor: Math.round((traits.courage / total) * 100),
            ravenclaw: Math.round((traits.intelligence / total) * 100),
            hufflepuff: Math.round((traits.loyalty / total) * 100),
            slytherin: Math.round((traits.ambition / total) * 100)
        };
    }
}

export default MagicalCalculator;
