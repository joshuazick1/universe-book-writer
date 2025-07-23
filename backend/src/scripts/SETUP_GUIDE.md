# Quick Setup Guide: The Road to the Stars Seeding

This guide provides step-by-step instructions for setting up and running the database seeding script for "The Road to the Stars".

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running locally or have a connection string to a remote instance
2. **Node.js**: Version 18+ installed
3. **Dependencies**: Project dependencies installed

## Step-by-Step Setup

### 1. Install Dependencies

```powershell
# Navigate to the backend directory
cd backend

# Install all dependencies
npm install
```

### 2. Configure Environment

Create or update your `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/verseforge
NODE_ENV=development
```

### 3. Run Database Migrations

First, apply all database migrations to create the required collections:

```powershell
# Check migration status
npm run migrate:status

# Apply all pending migrations
npm run migrate:up
```

This will create the following collections:
- `users`
- `universes` 
- `characters`
- `books`
- `locations`
- `organizations`

### 4. Run the Seeding Script

```powershell
# Seed the database with "The Road to the Stars" data
npm run seed:road-to-stars
```

Expected output:
```
🌟 Starting seed for "The Road to the Stars"...
📝 Inserting users...
✅ Inserted 1 users
🌌 Inserting universes...
✅ Inserted 1 universes
👥 Inserting characters...
✅ Inserted 11 characters
🗺️ Inserting locations...
✅ Inserted 8 locations
🏛️ Inserting organizations...
✅ Inserted 6 organizations
📚 Inserting books...
✅ Inserted 1 books
✅ Seeding completed successfully!
🎉 Seed script completed successfully!
```

### 5. Verify the Seeding

Run the verification script to ensure all data was seeded correctly:

```powershell
# Verify the seeded data
npm run verify:road-to-stars
```

Expected output:
```
🔍 Verifying "The Road to the Stars" seeding data...

📊 Verification Results:

✅ users: 1/1 PASSED
✅ universes: 1/1 PASSED
✅ characters: 11/11 PASSED
✅ locations: 8/8 PASSED
✅ organizations: 6/6 PASSED
✅ books: 1/1 PASSED
✅ universe-validation: 1/1 PASSED
✅ character-validation: 1/1 PASSED
✅ location-validation: 1/1 PASSED
✅ book-validation: 1/1 PASSED
✅ relationship-validation: 1/1 PASSED

🎯 Overall Results: 11/11 tests passed
🎉 All verification tests passed! Seeding was successful.
```

## What Gets Created

### Characters (11)
- **Command Staff**: James Calloway (Captain), Thara zh'Shiron (First Officer)
- **Department Heads**: Jorrek Ven (Engineering), Sovek (Operations), Dr. Emon Vrix (Medical)
- **Officers**: Lirian Saar (Science), Ralvek (Tactical), T'Ryn (Navigation), Ral'kas (Assistant Nav)
- **Crew**: Ethan Blackwood (Maintenance)
- **Entities**: The Narrator (Omniscient Observer)

### Locations (8)
- **Ships**: USS Vash'Tel (Republic starship)
- **Facilities**: Galactic Republic Starfleet Academy, Vulcan High Command, P'Jem Monastery
- **Worlds**: Vulcan, Earth, Andoria, Tellar

### Organizations (6)
- **Government**: United Republic of Planets, Vulcan High Command
- **Military**: Republic Starfleet, Andorian Imperial Guard
- **Opposition**: Orion Syndicate, Vulcan Traditionalist Faction

### Story Content
- Complete book with 5 chapters
- Rich character relationships and metadata
- Timeline events and universe history

## Troubleshooting

### MongoDB Connection Issues

```powershell
# Check if MongoDB is running
Get-Process mongod

# Start MongoDB (if using local installation)
mongod --dbpath "C:\data\db"
```

### Migration Issues

```powershell
# Reset migrations if needed
npm run migrate:down
npm run migrate:up
```

### Clear and Re-seed

If you need to start fresh:

1. Open the seeding script: `src/scripts/seed-road-to-stars.ts`
2. Uncomment the line: `// await clearExistingData(db);`
3. Run the seed script again

### Verify MongoDB Data

You can manually check the data using MongoDB shell:

```javascript
// Connect to database
use verseforge

// Check collections
show collections

// Count documents
db.characters.countDocuments()
db.locations.countDocuments()
db.organizations.countDocuments()

// Sample character
db.characters.findOne({name: "James Calloway"})

// Sample universe
db.universes.findOne({name: "United Republic of Planets"})
```

## Next Steps

After successful seeding, you can:

1. **Start the Frontend**: View the seeded data in the UI
2. **Test API Endpoints**: Query the seeded characters, locations, etc.
3. **Develop Stories**: Use the rich context for AI-assisted writing
4. **Extend Data**: Add more books, characters, or locations to the universe

## Integration with Application

The seeded data is fully compatible with:

- ✅ **Frontend Components**: Character lists, location maps, timeline views
- ✅ **API Endpoints**: All CRUD operations work with seeded data
- ✅ **Validation Rules**: Passes all schema and plugin validations
- ✅ **AI Systems**: Rich context for story generation and assistance
- ✅ **Search Features**: Characters, locations, and content are searchable

---

You now have a complete United Republic of Planets universe ready for story development!
