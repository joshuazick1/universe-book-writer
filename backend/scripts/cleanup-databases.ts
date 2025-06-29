/**
 * Script to clean up defunct/test databases
 * This script will list all databases and allow selective cleanup
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function cleanupDatabases() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        // List all databases
        const adminDb = client.db().admin();
        const databaseList = await adminDb.listDatabases();

        console.log('\n📊 Current databases:');
        console.log('=====================');
        for (const dbInfo of databaseList.databases) {
            const sizeInMB = ((dbInfo.sizeOnDisk || 0) / (1024 * 1024)).toFixed(2);
            console.log(`📁 ${dbInfo.name} (${sizeInMB} MB)`);

            // Show collections in each database
            if (!dbInfo.name.startsWith('admin') && !dbInfo.name.startsWith('config') && !dbInfo.name.startsWith('local')) {
                const db = client.db(dbInfo.name);
                const collections = await db.listCollections().toArray();
                console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);

                // Show document counts for main collections
                for (const collection of collections) {
                    if (['users', 'universes', 'auth_tokens', 'auth_sessions'].includes(collection.name)) {
                        const count = await db.collection(collection.name).countDocuments();
                        console.log(`     - ${collection.name}: ${count} documents`);
                    }
                }
            }
            console.log('');
        }

        // Identify databases that look like test/defunct databases
        const testDatabases = databaseList.databases.filter(db =>
            db.name.includes('test') ||
            db.name.includes('temp') ||
            db.name.includes('dev') ||
            db.name.includes('backup') ||
            db.name.endsWith('-old') ||
            db.name.startsWith('universe-book-writer-')
        );

        if (testDatabases.length > 0) {
            console.log('🗑️  Potential test/defunct databases found:');
            console.log('===========================================');
            for (const db of testDatabases) {
                const sizeInMB = ((db.sizeOnDisk || 0) / (1024 * 1024)).toFixed(2);
                console.log(`   - ${db.name} (${sizeInMB} MB)`);
            }

            console.log('\n⚠️  To delete these databases, run with --delete flag:');
            console.log('   npm run cleanup-databases -- --delete');
        }

        // Check for specific cleanup flags
        const shouldDelete = process.argv.includes('--delete');
        const deleteAll = process.argv.includes('--delete-all');
        const specificDb = process.argv.find(arg => arg.startsWith('--db='));

        if (shouldDelete && testDatabases.length > 0) {
            console.log('\n🗑️  Deleting test/defunct databases...');
            for (const dbInfo of testDatabases) {
                try {
                    await client.db(dbInfo.name).dropDatabase();
                    console.log(`✅ Deleted: ${dbInfo.name}`);
                } catch (error) {
                    console.log(`❌ Failed to delete ${dbInfo.name}:`, error);
                }
            }
        }

        if (deleteAll) {
            console.log('\n🚨 DANGER: Deleting ALL non-system databases...');
            const userDatabases = databaseList.databases.filter(db =>
                !db.name.startsWith('admin') &&
                !db.name.startsWith('config') &&
                !db.name.startsWith('local')
            );

            for (const dbInfo of userDatabases) {
                try {
                    await client.db(dbInfo.name).dropDatabase();
                    console.log(`✅ Deleted: ${dbInfo.name}`);
                } catch (error) {
                    console.log(`❌ Failed to delete ${dbInfo.name}:`, error);
                }
            }
        }

        if (specificDb) {
            const dbName = specificDb.split('=')[1];
            console.log(`\n🗑️  Deleting specific database: ${dbName}`);
            try {
                await client.db(dbName).dropDatabase();
                console.log(`✅ Deleted: ${dbName}`);
            } catch (error) {
                console.log(`❌ Failed to delete ${dbName}:`, error);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

console.log('🧹 Database Cleanup Tool');
console.log('=======================');
console.log('Options:');
console.log('  --delete         Delete test/defunct databases');
console.log('  --delete-all     Delete ALL non-system databases (DANGEROUS!)');
console.log('  --db=<name>      Delete specific database');
console.log('');

cleanupDatabases();
