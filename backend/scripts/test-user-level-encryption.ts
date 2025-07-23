/**
 * Test script for user-level salt encryption
 * Tests the updated encryption service with persistent user salts
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import { MongoUserRepository } from '../src/infrastructure/persistence/user.repository.js';
import { UserEncryptionService } from '../src/core/services/user-encryption.service.js';
import { UniverseEncryptionService } from '../src/core/services/universe-encryption-updated.service.js';
import { User, UserRole, UserStatus } from '../src/core/entities/user.entity.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'verseforge_test';

async function testUserLevelSaltEncryption() {
    console.log('🔐 Testing User-Level Salt Encryption...\n');

    let client: MongoClient | null = null;

    try {
        // Connect to MongoDB
        console.log('1️⃣ Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db: Db = client.db(DB_NAME);
        console.log('   ✅ Connected to MongoDB');

        // Initialize services
        console.log('\n2️⃣ Initializing services...');
        const userRepository = new MongoUserRepository(db);
        const userEncryptionService = new UserEncryptionService(userRepository);
        const universeEncryptionService = new UniverseEncryptionService(userEncryptionService);
        console.log('   ✅ Services initialized');    // Create a test user
        console.log('\n3️⃣ Creating test user...');
        const userId = new ObjectId().toString(); // Generate a valid ObjectId string
        const testUserData = new User({
            id: userId,
            email: 'test@example.com',
            username: 'testuser',
            passwordHash: 'hashedpassword123',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: true
        });

        const savedUser = await userRepository.save(testUserData);
        console.log(`   ✅ Test user created: ${savedUser.username} (ID: ${savedUser.id})`);// Test user encryption salt generation
        console.log('\n4️⃣ Testing user salt generation...');
        const salt1 = await userEncryptionService.getUserEncryptionSalt(savedUser.id);
        console.log(`   ✅ First salt generated (length: ${salt1.length})`);

        // Test salt persistence (should return same salt)
        const salt2 = await userEncryptionService.getUserEncryptionSalt(savedUser.id);
        console.log(`   ✅ Second salt retrieved (length: ${salt2.length})`);

        if (salt1 === salt2) {
            console.log('   ✅ Salt persistence verified - salts match');
        } else {
            throw new Error('❌ Salt persistence failed - salts do not match');
        }

        // Test encryption key generation
        console.log('\n5️⃣ Testing encryption key generation...');
        const key1 = await userEncryptionService.generateUserEncryptionKey(savedUser.id);
        const key2 = await userEncryptionService.generateUserEncryptionKey(savedUser.id);
        console.log(`   ✅ Keys generated (length: ${key1.length} bytes)`);

        if (key1.equals(key2)) {
            console.log('   ✅ Key consistency verified - keys match');
        } else {
            throw new Error('❌ Key consistency failed - keys do not match');
        }

        // Test universe data encryption
        console.log('\n6️⃣ Testing universe data encryption...');
        const testUniverseData = {
            name: 'Test Private Universe',
            description: 'A secret universe for testing encryption',
            plugin_config: {
                active_plugin: 'star-trek',
                plugin_version: '1.0.0'
            },
            secret_data: {
                classified_info: 'This is highly confidential',
                secret_number: 42
            }
        }; const encryptedData = await universeEncryptionService.encryptUniverseData(
            testUniverseData,
            'universe-123',
            savedUser.id
        );

        console.log('   ✅ Universe data encrypted successfully');
        console.log(`   📊 Encrypted data size: ${encryptedData.encrypted_data.length} chars`);
        console.log(`   🔑 IV length: ${encryptedData.iv.length} chars`);
        console.log(`   🏷️  Algorithm: ${encryptedData.encryption_algorithm}`);

        // Test universe data decryption
        console.log('\n7️⃣ Testing universe data decryption...'); const decryptedData = await universeEncryptionService.decryptUniverseData(
            encryptedData,
            'universe-123',
            savedUser.id
        );

        console.log('   ✅ Universe data decrypted successfully');

        // Verify data integrity
        const originalJson = JSON.stringify(testUniverseData, null, 2);
        const decryptedJson = JSON.stringify(decryptedData, null, 2);

        if (originalJson === decryptedJson) {
            console.log('   ✅ Data integrity verified - original and decrypted data match');
        } else {
            console.log('   ❌ Data integrity failed');
            console.log('   Original:', originalJson);
            console.log('   Decrypted:', decryptedJson);
            throw new Error('Data integrity verification failed');
        }

        // Test encryption/decryption consistency
        console.log('\n8️⃣ Testing encryption/decryption consistency...'); const encryptedData2 = await universeEncryptionService.encryptUniverseData(
            testUniverseData,
            'universe-456',
            savedUser.id
        );

        const decryptedData2 = await universeEncryptionService.decryptUniverseData(
            encryptedData2,
            'universe-456',
            savedUser.id
        );

        const decryptedJson2 = JSON.stringify(decryptedData2, null, 2);

        if (originalJson === decryptedJson2) {
            console.log('   ✅ Encryption/decryption consistency verified');
        } else {
            throw new Error('❌ Encryption/decryption consistency failed');
        }

        // Test access control (wrong user)
        console.log('\n9️⃣ Testing access control...');
        try {
            await universeEncryptionService.decryptUniverseData(
                encryptedData,
                'universe-123',
                'different-user-id'
            );
            throw new Error('❌ Access control failed - unauthorized user could decrypt');
        } catch (error) {
            if (error instanceof Error && error.message.includes('Access denied')) {
                console.log('   ✅ Access control verified - unauthorized access blocked');
            } else {
                throw error;
            }
        }

        // Test encryption info
        console.log('\n🔟 Testing encryption info...');
        const encryptionInfo = await universeEncryptionService.getEncryptionInfo(savedUser.id);
        console.log('   📊 Encryption Info:', JSON.stringify(encryptionInfo, null, 2));

        if (encryptionInfo.user_has_encryption) {
            console.log('   ✅ Encryption info verified');
        } else {
            throw new Error('❌ Encryption info verification failed');
        }    // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await userRepository.delete(savedUser.id);
        console.log('   ✅ Test data cleaned up');

        console.log('\n🎉 All tests passed successfully!');
        console.log('✅ User-level salt encryption is working correctly.');

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
testUserLevelSaltEncryption().catch(console.error);
