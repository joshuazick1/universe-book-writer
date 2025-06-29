/**
 * Integration test for Universe Repository with User-Level Encryption and Irreversible Public Status
 * Tests the complete flow of universe creation, encryption, and public status management
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import { MongoUserRepository } from '../src/infrastructure/persistence/user.repository.js';
import { MongoUniverseRepository } from '../src/infrastructure/repositories/universe.repository.js';
import { UserEncryptionService } from '../src/core/services/user-encryption.service.js';
import { UniverseEncryptionService } from '../src/core/services/universe-encryption-updated.service.js';
import { User, UserRole, UserStatus } from '../src/core/entities/user.entity.js';
import { UniverseEntity, CanonLevel, UniverseEncryptionSecurityError } from '../src/core/entities/universe.entity.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'universe_book_writer_test';

async function testUniverseRepositoryWithEncryption() {
    console.log('🚀 Testing Universe Repository with User-Level Encryption and Irreversible Public Status...\n');

    let client: MongoClient | null = null;

    try {
        // Connect to MongoDB
        console.log('1️⃣ Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db: Db = client.db(DB_NAME);
        console.log('   ✅ Connected to MongoDB');

        // Initialize repositories and services
        console.log('\n2️⃣ Initializing repositories and services...');
        const userRepository = new MongoUserRepository(db);
        const userEncryptionService = new UserEncryptionService(userRepository);
        const universeEncryptionService = new UniverseEncryptionService(userEncryptionService);
        const universeRepository = new MongoUniverseRepository(db, client, userRepository, universeEncryptionService);
        console.log('   ✅ Repositories and services initialized');

        // Create test user
        console.log('\n3️⃣ Creating test user...');
        const userId = new ObjectId().toString();
        const testUser = new User({
            id: userId,
            email: 'test@example.com',
            username: 'testuser',
            passwordHash: 'hashedpassword123',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true
        });

        const savedUser = await userRepository.save(testUser);
        console.log(`   ✅ Test user created: ${savedUser.username} (ID: ${savedUser.id})`);

        // Test 1: Create a private universe
        console.log('\n4️⃣ Testing private universe creation...');
        const privateUniverse = new UniverseEntity({
            name: 'Secret Star Trek Universe',
            description: 'A private universe with classified information',
            owner_id: savedUser.id,
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
                is_private: true, // Start as private
                was_ever_public: false,
                allow_collaboration: false,
                collaboration_permissions: {
                    can_view: false,
                    can_edit: false,
                    can_manage: false,
                    user_permissions: {}
                },
                sync_settings: {
                    real_time_sync: true,
                    sync_frequency: 1000,
                    conflict_resolution: 'last_write_wins',
                    mobile_settings: {
                        sync_on_cellular: false,
                        max_payload_size: 1024 * 1024,
                        offline_mode: true
                    }
                },
                validation_settings: {
                    strict_validation: false,
                    custom_rules: [],
                    auto_correction: {
                        enabled: false,
                        correction_types: [],
                        require_confirmation: true
                    }
                }
            }
        });

        // Add some secret data
        privateUniverse.storePluginData('star-trek', {
            classified_missions: ['Operation Phoenix', 'Project Genesis'],
            secret_technologies: ['Cloaking Device', 'Temporal Displacement']
        }, '1.0.0');

        await universeRepository.save(privateUniverse);
        console.log(`   ✅ Private universe created and saved: ${privateUniverse.name}`);

        // Test 2: Retrieve private universe (should be decrypted)
        console.log('\n5️⃣ Testing private universe retrieval...');
        const retrievedPrivateUniverse = await universeRepository.findById(privateUniverse.id);

        if (!retrievedPrivateUniverse) {
            throw new Error('❌ Private universe not found after save');
        }

        console.log(`   ✅ Private universe retrieved: ${retrievedPrivateUniverse.name}`);
        console.log(`   🔒 Is private: ${retrievedPrivateUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedPrivateUniverse.settings.was_ever_public}`);

        // Verify secret data is preserved
        const secretData = retrievedPrivateUniverse.getPluginData('star-trek');
        if (secretData && secretData.data.classified_missions) {
            console.log('   ✅ Secret data preserved after encryption/decryption');
        } else {
            throw new Error('❌ Secret data not preserved');
        }

        // Test 3: Make universe public (irreversible)
        console.log('\n6️⃣ Testing making universe public (irreversible operation)...');
        retrievedPrivateUniverse.makePublic();
        await universeRepository.save(retrievedPrivateUniverse);
        console.log('   ✅ Universe made public successfully');

        // Verify public status
        const publicUniverse = await universeRepository.findById(privateUniverse.id);
        if (!publicUniverse) {
            throw new Error('❌ Universe not found after making public');
        }

        console.log(`   🔓 Is private: ${publicUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${publicUniverse.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${publicUniverse.canBeMadePrivate()}`);

        if (!publicUniverse.settings.was_ever_public) {
            throw new Error('❌ was_ever_public flag not set correctly');
        }

        // Test 4: Try to make universe private again (should fail)
        console.log('\n7️⃣ Testing irreversible public status (should fail to make private)...');
        try {
            publicUniverse.makePrivate();
            throw new Error('❌ Universe was made private (this should not happen!)');
        } catch (error) {
            if (error instanceof UniverseEncryptionSecurityError) {
                console.log(`   ✅ Correctly prevented re-encryption: ${error.message}`);
            } else {
                throw error;
            }
        }

        // Test 5: Try to update settings to make private (should fail)
        console.log('\n8️⃣ Testing settings update prevention...');
        try {
            publicUniverse.updateSettings({ is_private: true });
            throw new Error('❌ Universe settings were updated to private (this should not happen!)');
        } catch (error) {
            if (error instanceof UniverseEncryptionSecurityError) {
                console.log(`   ✅ Correctly prevented re-encryption via settings: ${error.message}`);
            } else {
                throw error;
            }
        }

        // Test 6: Test serialization/deserialization preserves public status
        console.log('\n9️⃣ Testing serialization/deserialization...');
        const serialized = publicUniverse.toObject();
        const deserialized = UniverseEntity.fromObject(serialized);

        console.log(`   ✅ Serialization completed`);
        console.log(`   🔓 Deserialized - Is private: ${deserialized.settings.is_private}`);
        console.log(`   📖 Deserialized - Was ever public: ${deserialized.settings.was_ever_public}`);
        console.log(`   🔄 Deserialized - Can be made private: ${deserialized.canBeMadePrivate()}`);

        if (deserialized.settings.was_ever_public && !deserialized.canBeMadePrivate()) {
            console.log('   ✅ Serialization preserves irreversible public status');
        } else {
            throw new Error('❌ Serialization does not preserve public status correctly');
        }

        // Test 7: Create a universe that starts public
        console.log('\n🔟 Testing universe that starts as public...');
        const alwaysPublicUniverse = new UniverseEntity({
            name: 'Open Star Trek Universe',
            description: 'A universe that was always public',
            owner_id: savedUser.id,
            plugin_config: {
                active_plugin: 'star-trek',
                plugin_version: '1.0.0',
                sub_universe: 'kelvin',
                canon_compliance: CanonLevel.FLEXIBLE,
                theme_config: {
                    theme_id: 'lcars',
                    variant: 'light'
                }
            },
            settings: {
                is_private: false, // Starts public
                was_ever_public: false // Should be automatically set to true
            }
        });

        // Making it public should set the flag
        alwaysPublicUniverse.makePublic();
        await universeRepository.save(alwaysPublicUniverse);

        const retrievedPublicUniverse = await universeRepository.findById(alwaysPublicUniverse.id);
        if (!retrievedPublicUniverse) {
            throw new Error('❌ Always-public universe not found');
        }

        console.log(`   ✅ Always-public universe created: ${retrievedPublicUniverse.name}`);
        console.log(`   🔓 Is private: ${retrievedPublicUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${retrievedPublicUniverse.settings.was_ever_public}`);

        if (retrievedPublicUniverse.settings.was_ever_public) {
            console.log('   ✅ Always-public universe correctly marked as was_ever_public');
        } else {
            throw new Error('❌ Always-public universe not marked correctly');
        }

        // Test 8: Test privacy status information
        console.log('\n1️⃣1️⃣ Testing privacy status information...');
        const privacyStatus = retrievedPublicUniverse.getPrivacyStatus();
        console.log('   📊 Privacy Status:', JSON.stringify(privacyStatus, null, 2));

        if (!privacyStatus.is_private && privacyStatus.was_ever_public && !privacyStatus.can_be_made_private && privacyStatus.can_be_made_public) {
            console.log('   ✅ Privacy status information is correct');
        } else {
            throw new Error('❌ Privacy status information is incorrect');
        }

        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await universeRepository.delete(privateUniverse.id);
        await universeRepository.delete(alwaysPublicUniverse.id);
        await userRepository.delete(savedUser.id);
        console.log('   ✅ Test data cleaned up');

        console.log('\n🎉 All tests passed successfully!');
        console.log('✅ Universe Repository with User-Level Encryption and Irreversible Public Status is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('📪 MongoDB connection closed');
        }
    }
}

// Run the test
testUniverseRepositoryWithEncryption().catch(console.error);
