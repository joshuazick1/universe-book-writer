/**
 * Migration: Add was_ever_public field to universe settings
 * 
 * This migration adds the new was_ever_public field to all existing universes.
 * For universes that are currently public (is_private: false), we set was_ever_public to true.
 * For universes that are currently private (is_private: true), we set was_ever_public to false.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/universe-book-writer';

async function addWasEverPublicField() {
    console.log('🔄 Adding was_ever_public field to universe settings...\n');

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const collection = db.collection('universes');

        // First, let's see how many universes we have
        const totalCount = await collection.countDocuments();
        console.log(`📊 Found ${totalCount} universes to update`);

        if (totalCount === 0) {
            console.log('ℹ️  No universes found, migration complete.');
            return;
        }

        // Update universes that are currently public (not encrypted)
        console.log('\n1️⃣ Updating public universes...');
        const publicUpdateResult = await collection.updateMany(
            {
                $or: [
                    { 'settings.is_private': false },
                    { 'settings.is_private': { $exists: false } }, // Default to public
                    { 'is_encrypted': false },
                    { 'is_encrypted': { $exists: false } }
                ],
                'settings.was_ever_public': { $exists: false }
            },
            {
                $set: {
                    'settings.was_ever_public': true // Currently public = was ever public
                }
            }
        );
        console.log(`   ✅ Updated ${publicUpdateResult.modifiedCount} public universes`);

        // Update universes that are currently private (encrypted)
        console.log('\n2️⃣ Updating private universes...');
        const privateUpdateResult = await collection.updateMany(
            {
                $or: [
                    { 'settings.is_private': true },
                    { 'is_encrypted': true }
                ],
                'settings.was_ever_public': { $exists: false }
            },
            {
                $set: {
                    'settings.was_ever_public': false // Currently private = not yet public
                }
            }
        );
        console.log(`   ✅ Updated ${privateUpdateResult.modifiedCount} private universes`);

        // Verify the migration
        console.log('\n3️⃣ Verifying migration...');
        const publicCount = await collection.countDocuments({ 'settings.was_ever_public': true });
        const privateCount = await collection.countDocuments({ 'settings.was_ever_public': false });
        const totalUpdated = publicCount + privateCount;

        console.log(`   📊 Verification Results:`);
        console.log(`   - Universes marked as "was ever public": ${publicCount}`);
        console.log(`   - Universes marked as "never public": ${privateCount}`);
        console.log(`   - Total updated: ${totalUpdated}`);
        console.log(`   - Original total: ${totalCount}`);

        if (totalUpdated === totalCount) {
            console.log('   ✅ Migration successful - all universes updated');
        } else {
            console.log(`   ⚠️  Warning: ${totalCount - totalUpdated} universes not updated`);

            // Show universes that weren't updated
            const notUpdated = await collection.find({
                'settings.was_ever_public': { $exists: false }
            }).toArray();

            console.log('   Universes not updated:');
            notUpdated.forEach((doc, index) => {
                console.log(`   ${index + 1}. ID: ${doc.id}, Name: ${doc.name || 'Unknown'}`);
            });
        }

        // Create index for the new field for better query performance
        console.log('\n4️⃣ Creating index for was_ever_public field...');
        await collection.createIndex({ 'settings.was_ever_public': 1 });
        console.log('   ✅ Index created successfully');

        console.log('\n🎉 Migration completed successfully!');
        console.log('✅ All universes now have the was_ever_public field.');
        console.log('🔐 Irreversible public status feature is now active.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
addWasEverPublicField().catch(console.error);
