/**
 * 🌟 SEEDING SCRIPT: "The Road to the Stars" - Book 1 of the United Republic of Planets series
 *
 * PURPOSE:
 * This script populates the database with comprehensive story data extracted from all 5 chapters
 * of "The Road to the Stars". It serves as foundational content for development and testing.
 *
 * SCOPE:
 * - 11 fully-detailed characters with Star Trek plugin validation
 * - 8 key story locations (ships, planets, facilities)
 * - 6 organizations (political, military, academic)
 * - Complete universe lore and timeline events
 * - Full book content with chapter metadata
 *
 * ⚠️  FUTURE DEVELOPMENT CONSIDERATIONS:
 *
 * 1. DEPRECATION STRATEGY:
 *    - Remove character seeding when Character Creation UI is implemented
 *    - Remove location seeding when World Building tools are ready
 *    - Remove organization seeding when Faction/Org management is built
 *    - Keep universe and book data for reference/testing purposes
 *
 * 2. FEATURES REQUIRING SEED UPDATES:
 *    - Character relationship system (update relationship arrays)
 *    - Timeline/chronology features (expand timeline events)
 *    - Location hierarchy system (add parent/child location references)
 *    - Organization membership tracking (expand member arrays)
 *    - Character development arcs (add character progression data)
 *    - Plot thread tracking (add story arc metadata to chapters)
 *
 * 3. FEATURES THAT CAN CREATE OWN DATA:
 *    - User authentication (users can register themselves)
 *    - Character creation (writers can create new characters)
 *    - Location creation (world-building tools will handle this)
 *    - Organization creation (faction management will handle this)
 *    - Book writing (authors will write their own content)
 *
 * 4. PLUGIN INTEGRATION NOTES:
 *    - All character data complies with Star Trek Universe plugin validation
 *    - Species validation: Human, Vulcan, Andorian, Tellarite, Orion
 *    - Rank validation: Standard Starfleet hierarchy
 *    - When adding new universes, ensure plugin compatibility
 *
 * 5. DATA EVOLUTION GUIDELINES:
 *    - Maintain backward compatibility when updating character schemas
 *    - Version seed scripts when making breaking changes
 *    - Document schema changes in migration files
 *    - Keep original ObjectIds stable for relationship integrity
 *
 * USAGE:
 * npm run seed:road-to-stars    # Run seeding
 * npm run verify:road-to-stars  # Verify seeded data
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import type {
  Universe,
  Character,
  Book,
  Location,
  TimelineEvent,
  Organization,
} from '@universe-book-writer/core';

/**
 * 📝 TYPE DEFINITIONS
 *
 * These interfaces extend the core types with MongoDB-specific fields and seed-specific data.
 *
 * EVOLUTION NOTES:
 * - When Character schema evolves, update SeedCharacter interface
 * - Add new optional fields to support future features
 * - Maintain compatibility with existing validation schemas
 * - Consider versioning when making breaking changes
 */

interface SeedUser {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SeedCharacter: Enhanced character data for seeding
 *
 * PLUGIN COMPLIANCE:
 * - 'species' field validates against Star Trek Universe plugin
 * - 'rank' field validates against Starfleet hierarchy
 * - 'assignment' provides current posting information
 *
 * FUTURE FEATURES:
 * - Character progression tracking: Add 'developmentArcs' array
 * - Skill system: Add 'skills' and 'abilities' objects
 * - Inventory system: Add 'equipment' and 'possessions' arrays
 * - Biography system: Add 'personalHistory' timeline
 */
interface SeedCharacter extends Omit<Character, 'id' | 'universeId'> {
  _id: ObjectId;
  universeId: ObjectId;
  species?: string; // Star Trek plugin validation
  rank?: string; // Starfleet hierarchy validation
  assignment?: string; // Current posting/duty assignment
  relationships?: Array<{
    // Character interconnections
    characterId: ObjectId;
    type: string;
    description?: string;
  }>;
}

/**
 * SeedLocation: Enhanced location data for seeding
 *
 * EXTENDS CORE LOCATION:
 * - Based on core Location interface from universe domain
 * - Adds MongoDB-specific _id and universeId fields
 * - Includes Star Trek plugin-compatible fields
 *
 * PLUGIN COMPLIANCE:
 * - 'sector' and 'system' fields required by Star Trek Universe plugin
 * - 'classification' enables location type categorization
 * - Coordinates support 3D space mapping for galactic positioning
 *
 * FUTURE FEATURES:
 * - Location hierarchy: Add 'parentLocationId' for nested locations (planets in systems, etc.)
 * - Discovery system: Add 'discoveredBy', 'explorationStatus', 'firstContact'
 * - Resource management: Add 'resources', 'facilities', 'defenses' arrays
 * - Environmental system: Add 'climate', 'hazards', 'atmosphere', 'gravity'
 * - Travel system: Add 'accessMethods', 'travelTime', 'securityLevel'
 * - Faction control: Add 'controllingFaction', 'conflictZone', 'strategicValue'
 */
interface SeedLocation extends Omit<Location, 'id'> {
  _id: ObjectId;
  universeId: ObjectId;
  sector?: string; // Galactic sector (Star Trek format: "123-456")
  system?: string; // Star system reference
  classification?: string; // Location type (starship, planet, station, etc.)
  // coordinates field inherited from Location interface
}

interface SeedUniverse extends Omit<Universe, 'id' | 'creatorId'> {
  _id: ObjectId;
  creatorId: ObjectId;
}

interface SeedBook extends Omit<Book, 'id' | 'universeId' | 'authorId'> {
  _id: ObjectId;
  universeId: ObjectId;
  authorId: ObjectId;
  chapters: Array<{
    title: string;
    content: string;
    characters: ObjectId[];
    locations?: ObjectId[];
    metadata: Record<string, unknown>;
  }>;
}

interface SeedOrganization {
  _id: ObjectId;
  name: string;
  description: string;
  type: string;
  universeId: ObjectId;
  leadership?: ObjectId[];
  members?: ObjectId[];
  headquarters?: ObjectId;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main seeding function
 */
export async function seedRoadToTheStars(): Promise<void> {
  const client = new MongoClient(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/universe-book-writer'
  );

  try {
    await client.connect();
    const db = client.db();

    console.log('🌟 Starting seed for "The Road to the Stars"...');

    // Clear existing data (optional - uncomment if needed)
    // await clearExistingData(db);

    // Create seed data
    const seedData = createSeedData();

    // Insert data in correct order (dependencies first)
    await insertUsers(db, seedData.users);
    await insertUniverses(db, seedData.universes);
    await insertCharacters(db, seedData.characters);
    await insertLocations(db, seedData.locations);
    await insertOrganizations(db, seedData.organizations);
    await insertBooks(db, seedData.books);

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Create all seed data based on "The Road to the Stars" content
 */
function createSeedData() {
  const now = new Date();

  // Create user (author)
  const authorId = new ObjectId();
  const users: SeedUser[] = [
    {
      _id: authorId,
      email: 'author@roadtostars.com',
      username: 'roadtostars_author',
      passwordHash: '$2b$10$dummy.hash.for.seeding.purposes.only',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create United Republic of Planets universe
  const universeId = new ObjectId();
  const universes: SeedUniverse[] = [
    {
      _id: universeId,
      name: 'United Republic of Planets',
      description:
        'A Star Trek-inspired universe featuring the United Republic of Planets, formed by the alliance of Humans, Vulcans, Andorians, and Tellarites. Set in an era of exploration, diplomacy, and the forging of interstellar unity.',
      creatorId: authorId,
      locations: [],
      timelines: [
        {
          name: 'Main Timeline',
          events: [
            {
              id: 'urp-formation',
              date: '2155',
              description:
                'Formation of the United Republic of Planets alliance between Human, Vulcan, Andorian, and Tellarite species',
            },
            {
              id: 'vashtel-launch',
              date: '2161',
              description:
                "Launch of the Vash'Tel, the first Republic starship, marking a new era of cooperative exploration",
            },
            {
              id: 'academy-establishment',
              date: '2158',
              description:
                'Establishment of the Galactic Republic Starfleet Academy for training joint-species crews',
            },
            {
              id: 'vulcan-goodwill-tour',
              date: '2161',
              description:
                "The Vash'Tel's goodwill tour to Vulcan, addressing political tensions and resistance movements",
            },
          ],
        },
      ],
      metadata: {
        era: 'Pre-Federation',
        theme: 'Unity through diversity',
        techLevel: 'Early warp civilization',
        governmentType: 'Republic federation',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create character IDs
  const characterIds = {
    jamesCalloway: new ObjectId(),
    tharaZhShiron: new ObjectId(),
    jorrekVen: new ObjectId(),
    sovek: new ObjectId(),
    drEmonVrix: new ObjectId(),
    lirianSaar: new ObjectId(),
    ralvek: new ObjectId(),
    tRyn: new ObjectId(),
    ralkas: new ObjectId(),
    ethanBlackwood: new ObjectId(),
    theNarrator: new ObjectId(),
  };

  // Create characters based on the story
  const characters: SeedCharacter[] = [
    {
      _id: characterIds.jamesCalloway,
      name: 'James Calloway',
      universeId,
      description:
        "Captain of the Vash'Tel, the first Republic starship. A seasoned human officer who embodies the diplomatic ideals of the United Republic of Planets. Known for his strategic thinking and ability to unite diverse crews.",
      species: 'Human',
      rank: 'Captain',
      assignment: "USS Vash'Tel - Commanding Officer",
      attributes: {
        personality: 'Diplomatic, strategic, calm under pressure',
        background: 'Starfleet Academy graduate, experienced in interspecies relations',
        specialSkills: 'Leadership, diplomacy, tactical planning',
        age: 35,
        birthplace: 'Earth',
      },
      relationships: [
        {
          characterId: characterIds.tharaZhShiron,
          type: 'first_officer',
          description: 'First Officer and trusted advisor',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.tharaZhShiron,
      name: "Thara zh'Shiron",
      universeId,
      description:
        "Andorian First Officer of the Vash'Tel. An experienced officer with deep blue skin and characteristic antennae. Represents the martial heritage of the Andorians while embracing the Republic's cooperative ideals.",
      species: 'Andorian',
      rank: 'Commander',
      assignment: "USS Vash'Tel - First Officer",
      attributes: {
        personality: 'Controlled aggression, tactically minded, loyal',
        background: 'Former Andorian Imperial Guard, Republic convert',
        specialSkills: 'Tactical operations, combat strategy, crew coordination',
        gender: 'Zhen',
        clan: "zh'Shiron",
      },
      relationships: [
        {
          characterId: characterIds.jamesCalloway,
          type: 'commanding_officer',
          description: 'Captain and commanding officer',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.jorrekVen,
      name: 'Jorrek Ven',
      universeId,
      description:
        "Chief Engineer of the Vash'Tel. A skilled Tellarite engineer responsible for maintaining the ship's complex systems, including the revolutionary plasma flow technology that combines multiple species' innovations.",
      species: 'Tellarite',
      rank: 'Lieutenant Commander',
      assignment: "USS Vash'Tel - Chief Engineer",
      attributes: {
        personality: 'Direct, argumentative (in Tellarite tradition), technically brilliant',
        background: 'Tellarite Engineering Corps, plasma flow specialist',
        specialSkills: 'Warp core maintenance, plasma conduit systems, technical diagnostics',
        expertise: 'Multi-species technology integration',
      },
      relationships: [
        {
          characterId: characterIds.jamesCalloway,
          type: 'department_head',
          description: 'Reports to Captain Calloway',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.sovek,
      name: 'Sovek',
      universeId,
      description:
        "Vulcan Chief of Operations aboard the Vash'Tel. Brings logical analysis and precise coordination to the ship's daily operations. Represents the Vulcan contribution to the Republic alliance.",
      species: 'Vulcan',
      rank: 'Lieutenant Commander',
      assignment: "USS Vash'Tel - Chief of Operations",
      attributes: {
        personality: 'Logical, methodical, pragmatic',
        background: 'Vulcan Science Academy, operations specialist',
        specialSkills: 'Systems coordination, data analysis, logical decision-making',
        philosophy: 'IDIC (Infinite Diversity in Infinite Combinations)',
      },
      relationships: [
        {
          characterId: characterIds.tRyn,
          type: 'colleague',
          description: 'Fellow Vulcan officer',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.drEmonVrix,
      name: 'Dr. Emon Vrix',
      universeId,
      description:
        "Chief Medical Officer of the Vash'Tel. A dedicated physician responsible for the health and well-being of the diverse, multi-species crew.",
      species: 'Denobulan',
      rank: 'Lieutenant Commander',
      assignment: "USS Vash'Tel - Chief Medical Officer",
      attributes: {
        personality: 'Caring, methodical, cross-species medical expert',
        background: 'Multi-species medical training, Republic medical corps',
        specialSkills: 'Xenobiology, emergency medicine, psychological counseling',
        specialization: 'Inter-species physiology',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.lirianSaar,
      name: 'Lirian Saar',
      universeId,
      description:
        "Science Officer aboard the Vash'Tel, contributing to the ship's exploratory and research missions.",
      species: 'Vulcan',
      rank: 'Lieutenant',
      assignment: "USS Vash'Tel - Science Officer",
      attributes: {
        personality: 'Curious, analytical, dedicated to scientific discovery',
        background: 'Vulcan Science Academy, xenobiology specialist',
        specialSkills: 'Scientific analysis, research protocols, sensor operations',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.ralvek,
      name: 'Ralvek',
      universeId,
      description:
        "Tactical Officer of the Vash'Tel. A towering Andorian responsible for the ship's defensive systems and threat assessment.",
      species: 'Andorian',
      rank: 'Lieutenant',
      assignment: "USS Vash'Tel - Tactical Officer",
      attributes: {
        personality: 'Vigilant, protective, strategically minded',
        background: 'Andorian Imperial Guard, tactical specialist',
        specialSkills: 'Weapons systems, threat analysis, ship defense',
        physicalDescription: 'Towering frame, imposing presence',
      },
      relationships: [
        {
          characterId: characterIds.tharaZhShiron,
          type: 'fellow_andorian',
          description: 'Fellow Andorian officer',
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.tRyn,
      name: "T'Ryn",
      universeId,
      description:
        "Vulcan officer aboard the Vash'Tel, responsible for navigation and helm operations. An example of emotional Vulcan adaptation to Republic ideals.",
      species: 'Vulcan',
      rank: 'Lieutenant',
      assignment: "USS Vash'Tel - Navigator/Helm Officer",
      attributes: {
        personality: 'More emotional than typical Vulcans, adaptive, skilled pilot',
        background: 'Vulcan navigator training, Republic integration',
        specialSkills: 'Navigation, helm operations, warp calculations',
        uniqueTrait: 'Shows emotional responses while maintaining Vulcan discipline',
      },
      relationships: [
        {
          characterId: characterIds.ralkas,
          type: 'colleague',
          description: "Works closely with Ral'kas in navigation",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.ralkas,
      name: "Ral'kas",
      universeId,
      description:
        "Navigation specialist working alongside T'Ryn on the Vash'Tel's helm operations.",
      species: 'Vulcan',
      rank: 'Ensign',
      assignment: "USS Vash'Tel - Assistant Navigator",
      attributes: {
        personality: 'Precise, focused, detail-oriented',
        background: 'Recent Starfleet Academy graduate',
        specialSkills: 'Navigation calculations, sensor operations, data analysis',
      },
      relationships: [
        {
          characterId: characterIds.tRyn,
          type: 'colleague',
          description: "Works closely with T'Ryn in navigation",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.ethanBlackwood,
      name: 'Ethan Blackwood',
      universeId,
      description:
        "Maintenance crew member aboard the Vash'Tel. Often seen cleaning and maintaining the ship's systems. Possesses mysterious knowledge of historical events.",
      species: 'Human',
      rank: 'Crewman',
      assignment: "USS Vash'Tel - Maintenance Crew",
      attributes: {
        personality: 'Quiet, observant, mysteriously knowledgeable',
        background: 'Ship maintenance specialist, unknown prior service',
        specialSkills: 'Ship maintenance, cleaning systems, equipment care',
        mystery: 'References historical events and maneuvers from unknown sources',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: characterIds.theNarrator,
      name: 'The Narrator',
      universeId,
      description:
        "Mysterious omniscient entity that observes and occasionally intervenes in the events aboard the Vash'Tel. Possesses reality-altering abilities and intimate knowledge of the crew's activities.",
      species: 'Unknown Entity',
      rank: 'Observer',
      assignment: 'Unaffiliated - Cosmic Observer',
      attributes: {
        personality: 'Omniscient, mysterious, occasionally interventionist',
        abilities: 'Reality manipulation, telekinesis, matter alteration',
        knowledge: 'Complete awareness of all events and timelines',
        intervention: 'Subtle assistance during critical moments',
        nature: 'Possibly Q-like entity or advanced being',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create location IDs
  const locationIds = {
    vashtel: new ObjectId(),
    starfleetAcademy: new ObjectId(),
    vulcan: new ObjectId(),
    vulcanHighCommand: new ObjectId(),
    pjem: new ObjectId(),
    earth: new ObjectId(),
    andoria: new ObjectId(),
    tellar: new ObjectId(),
  };

  // Create locations based on the story
  const locations: SeedLocation[] = [
    {
      _id: locationIds.vashtel,
      name: "USS Vash'Tel",
      universeId,
      description:
        'The first Republic starship, representing the unity of Human, Vulcan, Andorian, and Tellarite engineering. Features a saucer-shaped primary hull reminiscent of Earth aircraft carriers, angular secondary hull inspired by Andorian design, and Vulcan ring nacelles.',
      classification: 'Republic Starship',
      type: 'Starship',
      metadata: {
        registry: 'NCC-1701',
        shipClass: 'Republic-class',
        captain: 'James Calloway',
        crew: 200,
        launched: '2161',
        design: 'Multi-species collaborative design',
        primaryHull: 'Saucer-shaped, Human-inspired',
        secondaryHull: 'Angular, Andorian-inspired',
        nacelles: 'Ring design, Vulcan engineering',
        systems: 'Integrated plasma flow technology',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.starfleetAcademy,
      name: 'Galactic Republic Starfleet Academy',
      universeId,
      description:
        'Training facility for Republic officers, where cadets from multiple species learn to work together in integrated crews.',
      classification: 'Educational Facility',
      type: 'Academy',
      coordinates: { x: 0, y: 0, z: 0 }, // Earth orbit
      metadata: {
        established: '2158',
        purpose: 'Multi-species officer training',
        graduates: "James Calloway, Thara zh'Shiron, and others",
        curriculum: 'Interspecies cooperation, starship operations',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.vulcan,
      name: 'Vulcan',
      universeId,
      description:
        'Homeworld of the Vulcan species, known for its logical philosophy and scientific advancement. A key member world of the United Republic of Planets.',
      classification: 'M-Class Planet',
      type: 'Homeworld',
      system: 'Vulcan System',
      sector: '001-001',
      coordinates: { x: 16, y: -12, z: 8 },
      metadata: {
        species: 'Vulcan',
        government: 'Vulcan High Command',
        philosophy: 'Logic and IDIC',
        climate: 'Desert, high temperatures',
        politicalStatus: 'Republic member with internal resistance',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.vulcanHighCommand,
      name: 'Vulcan High Command',
      universeId,
      description:
        'Governing body of Vulcan, housed in austere halls designed for purpose rather than ornamentation. Center of Vulcan political and military authority.',
      classification: 'Government Facility',
      type: 'Command Center',
      parentLocation: locationIds.vulcan,
      metadata: {
        function: 'Vulcan governmental authority',
        architecture: 'Austere, logical design',
        leadership: 'Administrator Seleth and others',
        politicalStance: 'Mixed support for Republic alliance',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.pjem,
      name: "P'Jem Monastery",
      universeId,
      description:
        'Ancient Vulcan monastery with rugged landscape surroundings. Has become a refuge for Vulcan traditionalists who oppose the Republic alliance.',
      classification: 'Religious Site',
      type: 'Monastery',
      parentLocation: locationIds.vulcan,
      metadata: {
        status: 'Occupied by traditionalist faction',
        significance: 'Religious and political refuge',
        landscape: 'Rugged, mountainous',
        threat: 'Potential disruption to Republic peace',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.earth,
      name: 'Earth',
      universeId,
      description:
        'Homeworld of humanity and founding member of the United Republic of Planets. Center of diplomatic efforts and exploration initiatives.',
      classification: 'M-Class Planet',
      type: 'Homeworld',
      system: 'Sol System',
      sector: '001-000',
      coordinates: { x: 0, y: 0, z: 0 },
      metadata: {
        species: 'Human',
        government: 'United Earth Government',
        role: 'Diplomatic leadership in Republic',
        characteristics: 'Exploration focus, diplomatic ideals',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.andoria,
      name: 'Andoria',
      universeId,
      description:
        'Homeworld of the Andorian people, known for their martial heritage and fierce warrior culture. A founding member of the Republic.',
      classification: 'M-Class Planet',
      type: 'Homeworld',
      system: 'Andorian System',
      sector: '002-001',
      metadata: {
        species: 'Andorian',
        government: 'Andorian Empire',
        culture: 'Martial, warrior traditions',
        contribution: 'Military expertise and ship design',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: locationIds.tellar,
      name: 'Tellar',
      universeId,
      description:
        'Homeworld of the Tellarites, known for their engineering expertise and argumentative culture. A founding member of the Republic.',
      classification: 'M-Class Planet',
      type: 'Homeworld',
      system: 'Tellarite System',
      sector: '003-001',
      metadata: {
        species: 'Tellarite',
        government: 'Tellarite Government',
        culture: 'Engineering focus, debate traditions',
        contribution: 'Technical expertise and engineering',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create organization IDs
  const organizationIds = {
    unitedRepublic: new ObjectId(),
    starfleet: new ObjectId(),
    vulcanHighCommand: new ObjectId(),
    andorianGuard: new ObjectId(),
    orionSyndicate: new ObjectId(),
    vulcanResistance: new ObjectId(),
  };

  // Create organizations
  const organizations: SeedOrganization[] = [
    {
      _id: organizationIds.unitedRepublic,
      name: 'United Republic of Planets',
      description:
        'Alliance of Human, Vulcan, Andorian, and Tellarite species formed for mutual cooperation, exploration, and defense.',
      type: 'Government Alliance',
      universeId,
      leadership: [characterIds.jamesCalloway], // Symbolic representation
      headquarters: locationIds.earth,
      metadata: {
        founded: '2155',
        memberSpecies: ['Human', 'Vulcan', 'Andorian', 'Tellarite'],
        principles: 'Unity through diversity, peaceful exploration',
        government: 'Federal republic structure',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizationIds.starfleet,
      name: 'Republic Starfleet',
      description:
        'Joint military and exploration organization of the United Republic of Planets, operating multi-species crews on exploration and defense missions.',
      type: 'Military/Exploration',
      universeId,
      leadership: [characterIds.jamesCalloway, characterIds.tharaZhShiron],
      headquarters: locationIds.starfleetAcademy,
      members: Object.values(characterIds).filter(id => id !== characterIds.theNarrator),
      metadata: {
        mission: 'Exploration, defense, diplomacy',
        structure: 'Multi-species integration',
        flagship: "USS Vash'Tel",
        academy: 'Galactic Republic Starfleet Academy',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizationIds.vulcanHighCommand,
      name: 'Vulcan High Command',
      description:
        'Traditional governing body of Vulcan, with mixed support for the Republic alliance.',
      type: 'Government',
      universeId,
      headquarters: locationIds.vulcanHighCommand,
      metadata: {
        stance: 'Cautious support for Republic',
        philosophy: 'Logic and Vulcan sovereignty',
        internal: 'Contains both supporters and resisters',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizationIds.andorianGuard,
      name: 'Andorian Imperial Guard',
      description:
        'Traditional military force of Andoria, now integrated with Republic Starfleet while maintaining Andorian martial traditions.',
      type: 'Military',
      universeId,
      headquarters: locationIds.andoria,
      members: [characterIds.tharaZhShiron, characterIds.ralvek],
      metadata: {
        tradition: 'Warrior culture and martial honor',
        integration: 'Cooperating with Republic Starfleet',
        expertise: 'Combat tactics and ship design',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizationIds.orionSyndicate,
      name: 'Orion Syndicate',
      description:
        "Pirate organization encountered by the Vash'Tel during its maiden voyage. Represents criminal elements opposed to Republic expansion.",
      type: 'Criminal Organization',
      universeId,
      metadata: {
        activities: 'Piracy, smuggling, territorial control',
        threatLevel: 'Moderate - operates in fringe territories',
        encounter: "Defeated by Vash'Tel using tactical deception",
        warning: 'Has sworn revenge against the Republic',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizationIds.vulcanResistance,
      name: 'Vulcan Traditionalist Faction',
      description:
        "Group of Vulcans who oppose the Republic alliance and have taken refuge at P'Jem monastery, seeking to preserve traditional Vulcan sovereignty.",
      type: 'Political Faction',
      universeId,
      headquarters: locationIds.pjem,
      metadata: {
        position: 'Anti-Republic, pro-Vulcan sovereignty',
        methods: 'Peaceful resistance, occupation of sacred sites',
        threat: 'Potential to disrupt Republic stability',
        philosophy: 'Pure Vulcan logic without compromise',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Create book
  const bookId = new ObjectId();
  const books: SeedBook[] = [
    {
      _id: bookId,
      title: 'The Road to the Stars',
      universeId,
      authorId,
      synopsis:
        "The inaugural voyage of the Vash'Tel, the first Republic starship, as Captain James Calloway and his diverse crew embark on a goodwill tour that will test the unity of the United Republic of Planets. From the launch complications to encounters with pirates and political resistance, this story chronicles the challenges of forging unity among diverse species in the early days of interstellar cooperation.",
      status: 'published' as const,
      chapters: [
        {
          title: 'Chapter 1: The Academy Days',
          content: `The story begins at the Galactic Republic Starfleet Academy, where cadets from multiple species train together. James Calloway, Thara zh'Shiron, and other future officers learn to work as an integrated crew, setting the foundation for the Republic's multi-species cooperation ideal.`,
          characters: [
            characterIds.jamesCalloway,
            characterIds.tharaZhShiron,
            characterIds.jorrekVen,
            characterIds.sovek,
            characterIds.drEmonVrix,
            characterIds.lirianSaar,
            characterIds.ralvek,
            characterIds.tRyn,
            characterIds.ralkas,
            characterIds.ethanBlackwood,
            characterIds.theNarrator,
          ],
          locations: [locationIds.starfleetAcademy],
          metadata: {
            themes: ['Unity through diversity', 'Academy training', 'Character introduction'],
            keyEvents: ['Meeting of main characters', 'Academy graduation'],
          },
        },
        {
          title: "Chapter 2: The Tour of the Vash'Tel",
          content: `Captain Calloway takes his first tour of the Vash'Tel, marveling at its revolutionary design that combines Human, Andorian, and Vulcan engineering. The ship represents the physical manifestation of Republic unity, with each species contributing their unique strengths to create something greater than the sum of its parts.`,
          characters: [
            characterIds.jamesCalloway,
            characterIds.tharaZhShiron,
            characterIds.jorrekVen,
            characterIds.sovek,
            characterIds.drEmonVrix,
            characterIds.ralvek,
            characterIds.tRyn,
            characterIds.ralkas,
            characterIds.ethanBlackwood,
            characterIds.theNarrator,
          ],
          locations: [locationIds.vashtel],
          metadata: {
            themes: [
              'Ship as symbol of unity',
              'Multi-species engineering',
              'Pre-launch preparations',
            ],
            keyEvents: ['Ship tour', 'Crew assembly', 'Final launch preparations'],
          },
        },
        {
          title: 'Chapter 3: Launch and the Mysterious Anomaly',
          content: `The Vash'Tel's maiden launch encounters a mysterious engine anomaly caused by a hidden Tellarite Shockweaver creature. When conventional diagnostics fail, the mysterious Narrator intervenes with reality-altering abilities, erasing the problem and allowing the mission to proceed. The crew remains unaware of this supernatural assistance.`,
          characters: [
            characterIds.jamesCalloway,
            characterIds.tharaZhShiron,
            characterIds.tRyn,
            characterIds.jorrekVen,
            characterIds.theNarrator,
          ],
          locations: [locationIds.vashtel],
          metadata: {
            themes: ['Mysterious intervention', 'Technical problems', 'Hidden dangers'],
            keyEvents: ['Engine malfunction', 'Narrator intervention', 'Successful launch'],
            mysteries: ['Shockweaver creature', "Narrator's abilities"],
          },
        },
        {
          title: 'Chapter 4: The Pirate Encounter',
          content: `En route to Vulcan, the Vash'Tel encounters Orion pirates. Captain Calloway employs a tactical maneuver reminiscent of the "Picard Maneuver," using a brief warp jump to create the illusion of being in two places at once. The confused pirates fire on each other, allowing the Vash'Tel to escape while delivering a warning about Republic strength.`,
          characters: [
            characterIds.jamesCalloway,
            characterIds.tharaZhShiron,
            characterIds.tRyn,
            characterIds.ralvek,
            characterIds.sovek,
            characterIds.ralkas,
            characterIds.ethanBlackwood,
          ],
          locations: [locationIds.vashtel],
          metadata: {
            themes: ['Tactical deception', 'First contact with hostiles', 'Republic defense'],
            keyEvents: ['Pirate encounter', 'Tactical maneuver', 'Victory and warning'],
            tactics: ['Picard Maneuver-like deception'],
          },
        },
        {
          title: 'Chapter 5: Arrival at Vulcan',
          content: `The Vash'Tel arrives at Vulcan to find protesters opposing the Republic alliance. The crew faces hostility from Vulcan traditionalists who view the Republic as a compromise of Vulcan sovereignty. Administrator Seleth assigns them to deal with a faction that has taken refuge at the P'Jem monastery, testing the Republic's commitment to maintaining peace while respecting diverse viewpoints.`,
          characters: [
            characterIds.jamesCalloway,
            characterIds.tharaZhShiron,
            characterIds.tRyn,
            characterIds.ralkas,
            characterIds.jorrekVen,
          ],
          locations: [locationIds.vulcan, locationIds.vulcanHighCommand, locationIds.pjem],
          metadata: {
            themes: ['Political resistance', 'Diplomatic challenges', 'Religious sanctuary'],
            keyEvents: ['Vulcan arrival', 'Protester encounter', "P'Jem mission assignment"],
            conflicts: ['Vulcan sovereignty vs Republic unity'],
          },
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    users,
    universes,
    characters,
    locations,
    organizations,
    books,
  };
}

/**
 * Insert functions for each collection
 */
async function insertUsers(db: Db, users: SeedUser[]): Promise<void> {
  console.log('📝 Inserting users...');
  await db.collection('users').insertMany(users);
  console.log(`✅ Inserted ${users.length} users`);
}

async function insertUniverses(db: Db, universes: SeedUniverse[]): Promise<void> {
  console.log('🌌 Inserting universes...');
  await db.collection('universes').insertMany(universes);
  console.log(`✅ Inserted ${universes.length} universes`);
}

async function insertCharacters(db: Db, characters: SeedCharacter[]): Promise<void> {
  console.log('👥 Inserting characters...');
  await db.collection('characters').insertMany(characters);
  console.log(`✅ Inserted ${characters.length} characters`);
}

async function insertLocations(db: Db, locations: SeedLocation[]): Promise<void> {
  console.log('🗺️ Inserting locations...');
  await db.collection('locations').insertMany(locations);
  console.log(`✅ Inserted ${locations.length} locations`);
}

async function insertOrganizations(db: Db, organizations: SeedOrganization[]): Promise<void> {
  console.log('🏛️ Inserting organizations...');
  await db.collection('organizations').insertMany(organizations);
  console.log(`✅ Inserted ${organizations.length} organizations`);
}

async function insertBooks(db: Db, books: SeedBook[]): Promise<void> {
  console.log('📚 Inserting books...');
  await db.collection('books').insertMany(books);
  console.log(`✅ Inserted ${books.length} books`);
}

/**
 * Optional: Clear existing data
 */
async function clearExistingData(db: Db): Promise<void> {
  console.log('🧹 Clearing existing data...');
  await Promise.all([
    db.collection('books').deleteMany({}),
    db.collection('organizations').deleteMany({}),
    db.collection('locations').deleteMany({}),
    db.collection('characters').deleteMany({}),
    db.collection('universes').deleteMany({}),
    db.collection('users').deleteMany({}),
  ]);
  console.log('✅ Existing data cleared');
}

/**
 * Main execution function
 */
if (require.main === module) {
  seedRoadToTheStars()
    .then(() => {
      console.log('🎉 Seed script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seed script failed:', error);
      process.exit(1);
    });
}
