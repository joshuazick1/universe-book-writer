/**
 * Direct migration execution for universe collections
 */

import { MongoClient } from 'mongodb';

async function createUniverseCollections() {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'verseforge';

    console.log('Creating universe management collections...');

    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);

    try {
        // Create universes collection
        console.log('Creating universes collection...');
        await db.createCollection('universes');

        // Create indexes for universes collection
        console.log('Creating indexes for universes...');
        await db.collection('universes').createIndexes([
            {
                key: { id: 1 },
                unique: true,
                name: 'idx_universes_id'
            },
            {
                key: { owner_id: 1 },
                name: 'idx_universes_owner_id'
            },
            {
                key: { 'plugin_config.active_plugin': 1 },
                name: 'idx_universes_active_plugin'
            },
            {
                key: { name: 1, owner_id: 1 },
                unique: true,
                name: 'idx_universes_name_owner_unique'
            },
            {
                key: { created_at: -1 },
                name: 'idx_universes_created_at_desc'
            },
            {
                key: { updated_at: -1 },
                name: 'idx_universes_updated_at_desc'
            },
            {
                key: { sync_token: 1 },
                name: 'idx_universes_sync_token'
            },
            {
                key: { name: 'text', description: 'text' },
                name: 'idx_universes_text_search'
            }
        ]);

        // Create universe_sync_events collection
        console.log('Creating universe_sync_events collection...');
        await db.createCollection('universe_sync_events');

        await db.collection('universe_sync_events').createIndexes([
            {
                key: { universe_id: 1, timestamp: -1 },
                name: 'idx_sync_events_universe_timestamp'
            },
            {
                key: { user_id: 1, timestamp: -1 },
                name: 'idx_sync_events_user_timestamp'
            },
            {
                key: { event_type: 1 },
                name: 'idx_sync_events_type'
            },
            {
                key: { sync_token: 1 },
                name: 'idx_sync_events_sync_token'
            },
            {
                key: { timestamp: 1 },
                expireAfterSeconds: 2592000, // 30 days
                name: 'idx_sync_events_ttl'
            }
        ]);

        // Create universe_collaborators collection
        console.log('Creating universe_collaborators collection...');
        await db.createCollection('universe_collaborators');

        await db.collection('universe_collaborators').createIndexes([
            {
                key: { universe_id: 1, user_id: 1 },
                unique: true,
                name: 'idx_collaborators_universe_user_unique'
            },
            {
                key: { universe_id: 1 },
                name: 'idx_collaborators_universe_id'
            },
            {
                key: { user_id: 1 },
                name: 'idx_collaborators_user_id'
            },
            {
                key: { role: 1 },
                name: 'idx_collaborators_role'
            }
        ]);

        // Create plugin_data_preservation collection
        console.log('Creating plugin_data_preservation collection...');
        await db.createCollection('plugin_data_preservation');

        await db.collection('plugin_data_preservation').createIndexes([
            {
                key: { universe_id: 1, plugin_id: 1 },
                name: 'idx_preservation_universe_plugin'
            },
            {
                key: { universe_id: 1 },
                name: 'idx_preservation_universe_id'
            },
            {
                key: { plugin_id: 1 },
                name: 'idx_preservation_plugin_id'
            },
            {
                key: { preserved_date: -1 },
                name: 'idx_preservation_date'
            },
            {
                key: { preserved_date: 1 },
                expireAfterSeconds: 31536000, // 1 year
                name: 'idx_preservation_ttl'
            }
        ]);

        console.log('✅ Universe management collections created successfully!');
    } catch (error: any) {
        if (error.code === 48) { // Collection already exists
            console.log('⚠️ Collections may already exist, continuing...');
        } else {
            throw error;
        }
    } finally {
        await client.close();
    }
}

createUniverseCollections().catch(console.error);
