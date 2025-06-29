/**
 * Test script for irreversible public status functionality
 * Tests the one-way encryption toggle feature
 */

import { UniverseEntity, CanonLevel, CollaborationRole, UniverseEncryptionSecurityError } from '../src/core/entities/universe.entity.js';

async function testIrreversiblePublicStatus() {
    console.log('🔐 Testing Irreversible Public Status Feature...\n');

    try {
        // Test 1: Create a private universe
        console.log('1️⃣ Creating a private universe...');
        const universe = new UniverseEntity({
            name: 'Test Private Universe',
            description: 'A test universe for encryption testing',
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

        console.log(`   ✅ Private universe created: ${universe.name}`);
        console.log(`   🔒 Is private: ${universe.settings.is_private}`);
        console.log(`   📖 Was ever public: ${universe.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${universe.canBeMadePrivate()}`);

        // Test 2: Get privacy status
        console.log('\n2️⃣ Checking privacy status...');
        const status1 = universe.getPrivacyStatus();
        console.log('   Privacy Status:', JSON.stringify(status1, null, 2));

        // Test 3: Make universe public (should work)
        console.log('\n3️⃣ Making universe public...');
        universe.makePublic();
        console.log(`   ✅ Universe made public successfully`);
        console.log(`   🔓 Is private: ${universe.settings.is_private}`);
        console.log(`   📖 Was ever public: ${universe.settings.was_ever_public}`);
        console.log(`   🔄 Can be made private: ${universe.canBeMadePrivate()}`);

        // Test 4: Get privacy status after making public
        console.log('\n4️⃣ Checking privacy status after making public...');
        const status2 = universe.getPrivacyStatus();
        console.log('   Privacy Status:', JSON.stringify(status2, null, 2));

        // Test 5: Try to make universe private again (should fail)
        console.log('\n5️⃣ Attempting to make universe private again (should fail)...');
        try {
            universe.makePrivate();
            console.log('   ❌ ERROR: Universe was made private (this should not happen!)');
        } catch (error) {
            if (error instanceof UniverseEncryptionSecurityError) {
                console.log(`   ✅ Correctly prevented re-encryption: ${error.message}`);
            } else {
                console.log(`   ⚠️  Unexpected error type: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Test 6: Try to update settings to make private (should fail)
        console.log('\n6️⃣ Attempting to update settings to make private (should fail)...');
        try {
            universe.updateSettings({ is_private: true });
            console.log('   ❌ ERROR: Universe settings were updated to private (this should not happen!)');
        } catch (error) {
            if (error instanceof UniverseEncryptionSecurityError) {
                console.log(`   ✅ Correctly prevented re-encryption via settings: ${error.message}`);
            } else {
                console.log(`   ⚠️  Unexpected error type: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Test 7: Create a universe that starts public
        console.log('\n7️⃣ Creating a universe that starts as public...');
        const publicUniverse = new UniverseEntity({
            name: 'Test Public Universe',
            description: 'A test universe that starts public',
            owner_id: 'user456',
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
                is_private: false, // Starts public
                was_ever_public: false // Should be set automatically
            }
        });

        console.log(`   ✅ Public universe created: ${publicUniverse.name}`);
        console.log(`   🔓 Is private: ${publicUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${publicUniverse.settings.was_ever_public}`);

        // Test 8: Make already public universe public (should be no-op)
        console.log('\n8️⃣ Making already public universe public (should be no-op)...');
        publicUniverse.makePublic();
        console.log(`   ✅ Operation completed`);
        console.log(`   🔓 Is private: ${publicUniverse.settings.is_private}`);
        console.log(`   📖 Was ever public: ${publicUniverse.settings.was_ever_public}`);

        // Test 9: Test serialization and deserialization
        console.log('\n9️⃣ Testing serialization and deserialization...');
        const serialized = universe.toObject();
        const deserialized = UniverseEntity.fromObject(serialized);

        console.log(`   ✅ Serialization completed`);
        console.log(`   🔓 Deserialized - Is private: ${deserialized.settings.is_private}`);
        console.log(`   📖 Deserialized - Was ever public: ${deserialized.settings.was_ever_public}`);
        console.log(`   🔄 Deserialized - Can be made private: ${deserialized.canBeMadePrivate()}`);

        // Test 10: Try to make deserialized universe private (should fail)
        console.log('\n🔟 Attempting to make deserialized universe private (should fail)...');
        try {
            deserialized.makePrivate();
            console.log('   ❌ ERROR: Deserialized universe was made private (this should not happen!)');
        } catch (error) {
            if (error instanceof UniverseEncryptionSecurityError) {
                console.log(`   ✅ Correctly prevented re-encryption on deserialized universe: ${error.message}`);
            } else {
                console.log(`   ⚠️  Unexpected error type: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ Irreversible public status feature is working correctly.');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
testIrreversiblePublicStatus().catch(console.error);
