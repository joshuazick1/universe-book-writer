/**
 * Test script for debugging encryption/decryption mismatch
 * Creates fresh encrypted data and immediately decrypts it
 */

import { UniverseEncryptionService } from '../src/core/services/encryption.service.js';

async function debugEncryption() {
    console.log('🔍 Debugging Encryption/Decryption...\n');

    const encryptionService = new UniverseEncryptionService();

    const testData = {
        name: 'Test Universe',
        description: 'A test universe for debugging',
        plugin_config: {
            active_plugin: 'star-trek',
            plugin_version: '1.0.0'
        }
    };

    const universeId = 'test-universe-123';
    const ownerId = 'user-456';

    try {
        console.log('1️⃣ Original data:');
        console.log(JSON.stringify(testData, null, 2));

        console.log('\n2️⃣ Encrypting data...');
        const encrypted = await encryptionService.encryptUniverseData(testData, universeId, ownerId);

        console.log('Encrypted data structure:');
        console.log(`- universe_id: ${encrypted.universe_id}`);
        console.log(`- encryption_method: ${encrypted.encryption_method}`);
        console.log(`- key_version: ${encrypted.key_version}`);
        console.log(`- iv length: ${encrypted.iv.length}`);
        console.log(`- encrypted_data length: ${encrypted.encrypted_data.length}`);
        console.log(`- checksum: ${encrypted.checksum}`);

        console.log('\n3️⃣ Immediately decrypting the same data...');
        const decrypted = await encryptionService.decryptUniverseData(encrypted, universeId, ownerId);

        console.log('Decrypted data:');
        console.log(JSON.stringify(decrypted, null, 2));

        console.log('\n4️⃣ Comparing original and decrypted...');
        const originalJson = JSON.stringify(testData);
        const decryptedJson = JSON.stringify(decrypted);

        if (originalJson === decryptedJson) {
            console.log('✅ Data matches perfectly!');
        } else {
            console.log('❌ Data mismatch!');
            console.log('Original:', originalJson);
            console.log('Decrypted:', decryptedJson);
        }

        console.log('\n🎉 Encryption/Decryption debug completed successfully!');

    } catch (error) {
        console.error('❌ Debug failed:', error);

        // Try to provide more specific error information
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }

        process.exit(1);
    }
}

// Run the debug
debugEncryption().catch(console.error);
