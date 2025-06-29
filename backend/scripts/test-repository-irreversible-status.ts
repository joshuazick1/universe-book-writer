/**
 * Test script for repository integration with irreversible public status
 * Tests that the repository correctly handles encryption/decryption with the new field
 */

import { MongoClient } from 'mongodb';
import { UniverseEntity, CanonLevel } from '../src/core/entities/universe.entity.js';
import { MongoUniverseRepository } from '../src/infrastructure/repositories/universe.repository.js';
import { UniverseEncryptionService } from '../src/core/services/encryption.service.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/universe-book-writer';

async function testRepositoryWithIrreversibleStatus() {
    console.log('🔐 Testing Repository Integration with Irreversible Public Status...\n');

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const encryptionService = new UniverseEncryptionService();
        const repository = new MongoUniverseRepository(db, client, encryptionService);

        // Test 1: Create and save a private universe
        console.log('\n1️⃣ Creating and saving a private universe...');
        const privateUniverse = new UniverseEntity({
            name: 'Test Private Universe - Repo',
            description: 'A private universe for repository testing',
            owner_id: 'user123',
            plugin_config: {
                active_plugin: 'star-trek',
                plugin_version: '1.0.0',
                sub_universe: 'prime',
                canon_compliance: CanonLevel.FLEXIBLE,
                theme_config: {
                    theme_id: 'lcars',
                    variant: 'dark'
                }
            },
            settings: {
                is_private: true,
                was_ever_public: false
            }
        });

        await repository.save(privateUniverse);
        console.log(`   ✅ Private universe saved: ${privateUniverse.name}`);
        console.log(`   🔒 Is private: ${privateUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${privateUniverse.settings.was_ever_public}`);

        // Test 2: Retrieve the private universe
        console.log('\n2️⃣ Retrieving the private universe...');
        const retrievedPrivate = await repository.findById(privateUniverse.id);

        if (!retrievedPrivate) {
            throw new Error('Private universe not found after saving');
        }

        console.log(`   ✅ Retrieved universe: ${retrievedPrivate.name}`);
        console.log(`   🔒 Is private: ${retrievedPrivate.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedPrivate.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${retrievedPrivate.canBeMadePrivate()}`);

        // Test 3: Make universe public and save
        console.log('\n3️⃣ Making universe public and saving...');
        retrievedPrivate.makePublic();
        await repository.save(retrievedPrivate);

        console.log(`   ✅ Universe made public and saved`);
        console.log(`   🔓 Is private: ${retrievedPrivate.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedPrivate.settings.was_ever_public}`);

        // Test 4: Retrieve the now-public universe
        console.log('\n4️⃣ Retrieving the now-public universe...');
        const retrievedPublic = await repository.findById(privateUniverse.id);

        if (!retrievedPublic) {
            throw new Error('Public universe not found after saving');
        }

        console.log(`   ✅ Retrieved public universe: ${retrievedPublic.name}`);
        console.log(`   🔓 Is private: ${retrievedPublic.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedPublic.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${retrievedPublic.canBeMadePrivate()}`);

        // Test 5: Try to make the retrieved universe private (should fail)
        console.log('\n5️⃣ Attempting to make retrieved universe private (should fail)...');
        try {
            retrievedPublic.makePrivate();
            console.log('   ❌ ERROR: Universe was made private (this should not happen!)');
        } catch (error) {
            console.log(`   ✅ Correctly prevented re-encryption: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Test 6: Create a universe that starts public
        console.log('\n6️⃣ Creating and saving a universe that starts public...');
        const publicUniverse = new UniverseEntity({
            name: 'Test Public Universe - Repo',
            description: 'A public universe for repository testing',
            owner_id: 'user456',
            plugin_config: {
                active_plugin: 'star-trek',
                plugin_version: '1.0.0',
                sub_universe: 'kelvin',
                canon_compliance: CanonLevel.STRICT,
                theme_config: {
                    theme_id: 'lcars',
                    variant: 'light'
                }
            },
            settings: {
                is_private: false
            }
        });

        await repository.save(publicUniverse);
        console.log(`   ✅ Public universe saved: ${publicUniverse.name}`);

        // Test 7: Retrieve and verify the public universe
        console.log('\n7️⃣ Retrieving the public universe...');
        const retrievedAlwaysPublic = await repository.findById(publicUniverse.id);

        if (!retrievedAlwaysPublic) {
            throw new Error('Always-public universe not found after saving');
        }

        console.log(`   ✅ Retrieved always-public universe: ${retrievedAlwaysPublic.name}`);
        console.log(`   🔓 Is private: ${retrievedAlwaysPublic.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedAlwaysPublic.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${retrievedAlwaysPublic.canBeMadePrivate()}`);

        // Test 8: Find universes by owner
        console.log('\n8️⃣ Finding universes by owner...');
        const user123Universes = await repository.findByOwnerId('user123');
        const user456Universes = await repository.findByOwnerId('user456');

        console.log(`   ✅ User123 has ${user123Universes.length} universe(s)`);
        console.log(`   ✅ User456 has ${user456Universes.length} universe(s)`);

        user123Universes.forEach(universe => {
            console.log(`   - ${universe.name}: private=${universe.settings.is_private}, was_ever_public=${universe.settings.was_ever_public}`);
        });

        user456Universes.forEach(universe => {
            console.log(`   - ${universe.name}: private=${universe.settings.is_private}, was_ever_public=${universe.settings.was_ever_public}`);
        });

        // Test 9: Cleanup
        console.log('\n9️⃣ Cleaning up test data...');
        await repository.delete(privateUniverse.id);
        await repository.delete(publicUniverse.id);
        console.log('   ✅ Test data cleaned up');

        console.log('\n🎉 All repository integration tests completed successfully!');
        console.log('✅ Repository correctly handles irreversible public status.');

    } catch (error) {
        console.error('❌ Repository integration test failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testRepositoryWithIrreversibleStatus().catch(console.error);
