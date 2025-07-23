// scripts/wipe-all-mongodb-databases.ts
// WARNING: This script will delete ALL databases in the connected MongoDB instance.
// Use with extreme caution!

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function wipeAllDatabases() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    for (const dbInfo of dbs.databases) {
        if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') {
            // Never drop system databases
            continue;
        }
        console.log(`Dropping database: ${dbInfo.name}`);
        await client.db(dbInfo.name).dropDatabase();
    }
    await client.close();
    console.log('All user databases dropped.');
}

wipeAllDatabases().catch(err => {
    console.error('Failed to wipe all MongoDB databases:', err);
    process.exit(1);
});
