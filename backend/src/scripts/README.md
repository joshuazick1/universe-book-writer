# The Road to the Stars - Database Seeding Script

This directory contains a TypeScript seeding script that populates the database with all characters, locations, organizations, timeline events, and story content from "The Road to the Stars" - Book 1 of the United Republic of Planets series.

## ⚠️ **Future Deprecation Notice**

**This comprehensive seed script is temporary.** As AI content analysis capabilities are implemented in future phases, most of this detailed data will be **automatically extracted** from chapter content rather than manually seeded.

**Deprecation Timeline**:
- **Phase B** (AI Foundation): No changes - maintain full seed data
- **Phase 3** (AI Integration): Begin deprecating character/location details as AI extracts them
- **Phase D** (Advanced AI): Major cleanup - remove 80%+ of manual seed data
- **Post-Phase D**: Minimal testing data only

For complete details, see [`docs/SEED_SCRIPT_DEPRECATION_STRATEGY.md`](../../../docs/SEED_SCRIPT_DEPRECATION_STRATEGY.md).

## Overview

The seeding script (`seed-road-to-stars.ts`) extracts comprehensive data from all 5 chapters of the book and structures it according to the database schema and validation rules defined in the Universe Book Writer application.

## What Gets Seeded

### 📚 **Story Content**
- **Book**: "The Road to the Stars" with complete chapter content
- **Synopsis**: Comprehensive book summary
- **Chapter Metadata**: Themes, key events, character relationships

### 👥 **Characters** (11 total)
- **James Calloway**: Human Captain of the Vash'Tel
- **Thara zh'Shiron**: Andorian First Officer
- **Jorrek Ven**: Tellarite Chief Engineer  
- **Sovek**: Vulcan Chief of Operations
- **Dr. Emon Vrix**: Denobulan Chief Medical Officer
- **Lirian Saar**: Vulcan Science Officer
- **Ralvek**: Andorian Tactical Officer
- **T'Ryn**: Vulcan Navigator (emotional Vulcan)
- **Ral'kas**: Vulcan Assistant Navigator
- **Ethan Blackwood**: Human Maintenance Crew (mysterious knowledge)
- **The Narrator**: Omniscient entity with reality-altering abilities

### 🗺️ **Locations** (8 total)
- **USS Vash'Tel**: First Republic starship (multi-species design)
- **Galactic Republic Starfleet Academy**: Multi-species training facility
- **Vulcan**: Homeworld with political tensions
- **Vulcan High Command**: Government facility
- **P'Jem Monastery**: Religious site occupied by traditionalists
- **Earth**: Human homeworld and Republic center
- **Andoria**: Andorian homeworld (martial culture)
- **Tellar**: Tellarite homeworld (engineering focus)

### 🏛️ **Organizations** (6 total)
- **United Republic of Planets**: Main government alliance
- **Republic Starfleet**: Multi-species exploration/military force
- **Vulcan High Command**: Traditional Vulcan government
- **Andorian Imperial Guard**: Andorian military force
- **Orion Syndicate**: Pirate criminal organization
- **Vulcan Traditionalist Faction**: Anti-Republic resistance group

### 🌌 **Universe Details**
- **United Republic of Planets Universe**: Complete world-building
- **Timeline Events**: Key historical moments from formation to current events
- **Species Information**: Human, Vulcan, Andorian, Tellarite characteristics
- **Political Structure**: Republic federation with member species

## Prerequisites

Before running the seeding script, ensure you have:

1. **MongoDB Running**: Local instance or connection string to remote database
2. **Database Migrations Applied**: Run all migrations to create required collections
3. **Environment Variables**: Proper MongoDB connection configuration

### Required Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/universe-book-writer
```

## Running the Seed Script

### Method 1: Using npm script (Recommended)

```powershell
# Navigate to the backend directory
cd backend

# Run the seeding script
npm run seed:road-to-stars
```

### Method 2: Direct execution

```powershell
# Navigate to the backend directory
cd backend

# Run with ts-node
node --loader ts-node/esm src/scripts/seed-road-to-stars.ts
```

## Database Schema Compliance

The seeding script is designed to comply with:

- **MongoDB Schema Validation**: All documents pass collection validators
- **Star Trek Universe Plugin**: Character species and ranks validate against plugin rules
- **Core Validation Schemas**: Story, Character, and Universe validation requirements
- **Relationship Integrity**: Proper ObjectId references between collections

## Data Structure Features

### Character Relationships
- Command structure (Captain → First Officer)
- Species groupings (Fellow Vulcans, Andorians)
- Department hierarchies (Engineering, Medical, etc.)

### Location Hierarchy
- Parent-child relationships (P'Jem → Vulcan)
- Coordinate systems for star charts
- Classification types (Starship, Planet, Facility)

### Organization Memberships
- Leadership roles and structures
- Member affiliations and hierarchies  
- Headquarters and territorial control

### Timeline Integration
- Historical events with proper dating
- Story progression markers
- Political developments and conflicts

## Star Trek Universe Plugin Compatibility

The seeded data includes:

- **Valid Species**: Human, Vulcan, Andorian, Tellarite (per plugin validation)
- **Proper Ranks**: Starfleet hierarchy (Captain, Commander, Lieutenant, etc.)
- **Sector Designations**: Format 001-001 (per plugin requirements)
- **Technical Consistency**: Warp technology, plasma flow systems
- **Cultural Accuracy**: Species-specific traits and behaviors

## Verification After Seeding

After running the script, verify the data was inserted correctly:

```javascript
// Connect to your MongoDB instance and check collections
use universe-book-writer

// Check character count
db.characters.countDocuments()  // Should return 11

// Check locations count  
db.locations.countDocuments()   // Should return 8

// Check organizations count
db.organizations.countDocuments() // Should return 6

// Verify universe exists
db.universes.findOne({name: "United Republic of Planets"})

// Check book with chapters
db.books.findOne({title: "The Road to the Stars"})
```

## Story Themes and Metadata

The seeded content includes rich metadata capturing:

- **Unity Through Diversity**: Core Republic philosophy
- **Multi-species Cooperation**: Technical and cultural integration
- **Political Tensions**: Vulcan resistance, sovereignty debates  
- **Exploration Spirit**: Peaceful discovery vs. defensive needs
- **Character Development**: Individual growth within diverse crews
- **Technological Innovation**: Collaborative engineering achievements

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify MongoDB is running
   - Check MONGODB_URI environment variable
   - Ensure database permissions

2. **Schema Validation Errors**
   - Run database migrations first: `npm run migrate:up`
   - Check required collections exist
   - Verify document structure matches validators

3. **Missing Dependencies**
   - Install required packages: `npm install`
   - Ensure TypeScript and ts-node are available

4. **Data Already Exists**
   - Script may fail if data already exists with same names
   - Uncomment `clearExistingData()` function call to clear first
   - Or manually remove conflicting documents

### Script Modifications

To customize the seeding:

1. **Add Characters**: Extend the `characters` array in `createSeedData()`
2. **Modify Relationships**: Update the `relationships` arrays
3. **Add Locations**: Include new locations in the `locations` array
4. **Update Timeline**: Modify events in the universe `timelines`

## Integration with Application

The seeded data integrates with:

- **Frontend Character Management**: All characters available for story development
- **Location Mapping**: Coordinates ready for star chart visualization  
- **Timeline Views**: Events ready for chronological display
- **AI Writing Assistance**: Rich context for story generation
- **Plugin Validation**: Data passes Star Trek universe plugin checks

## Deprecation Categories

### 🔴 **Will Be Auto-Extracted** (Phase D+)
*These elements will be deprecated when AI systems can extract them from chapter content:*

- **Character profiles** (physical descriptions, personality traits, relationships)
- **Location details** (descriptions, atmospheric data, significance to plot)
- **Organization structures** (membership, leadership, political alignments)
- **Plot elements** (themes, timeline events, character arcs)
- **Narrative metadata** (chapter themes, character interactions)

### 🟢 **Will Be Retained** (Permanent Testing Infrastructure)
*These elements will always remain for testing purposes:*

- **User accounts** and authentication testing
- **Universe templates** and plugin configurations
- **Basic schema validation** data
- **Integration testing** scenarios
- **Performance benchmarking** datasets

### 🟡 **Will Be Simplified** (Phase 3+)
*These elements will be reduced to minimal testing data:*

- **Sample character relationships** (2-3 characters for testing)
- **Basic location hierarchies** (parent-child validation)
- **Simple organizational membership** (testing membership systems)

## Future Enhancements

Potential improvements to the seeding script:

- **Multiple Books**: Seed data for entire series
- **Character Arcs**: Track character development across books
- **Relationship Evolution**: How relationships change over time
- **Political Developments**: Expanding conflicts and resolutions
- **Technology Progression**: Advancement of ship and weapon systems

---

This seeding script provides a complete foundation for developing stories within the United Republic of Planets universe, with rich, interconnected data that supports both narrative development and application functionality.
