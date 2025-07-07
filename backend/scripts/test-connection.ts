/**
 * Simple migration test to verify MongoDB connection
 */

import { MongoClient } from 'mongodb';

async function testConnection() {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'verseforge';

    console.log('Testing MongoDB connection...');
    console.log(`URL: ${url}`);
    console.log(`Database: ${dbName}`);

    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log('✅ Connected successfully');

        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));

        await client.close();
        console.log('✅ Connection closed');
    } catch (error) {
        console.error('❌ Connection failed:', error);
        throw error;
    }
}

testConnection().catch(console.error);
