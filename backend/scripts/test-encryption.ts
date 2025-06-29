/**
 * Test encryption functionality
 */

import { UniverseEncryptionService } from '../src/core/services/encryption.service.js';

async function testEncryption() {
    console.log('Testing Universe Encryption Service...');

    const encryptionService = new UniverseEncryptionService();

    // Test data
    const testData = {
        name: 'USS Enterprise Test Universe',
        description: 'A test universe for encryption validation',
        plugin_config: {
            active_plugin: 'star-trek',
            plugin_version: '1.0.0',
            sub_universe: 'Prime',
            canon_compliance: 'flexible'
        },
        settings: {
            is_private: true,
            allow_collaboration: false
        }
    };

    const universeId = 'test-universe-123';
    const ownerId = 'test-owner-456';

    try {
        console.log('1. Encrypting test data...');
        const encryptedData = await encryptionService.encryptUniverseData(
            testData,
            universeId,
            ownerId
        );

        console.log('✅ Encryption successful');
        console.log('Encrypted data size:', encryptedData.encrypted_data.length, 'characters');
        console.log('Encryption method:', encryptedData.encryption_method);
        console.log('Key version:', encryptedData.key_version);

        console.log('2. Decrypting test data...');
        const decryptedData = await encryptionService.decryptUniverseData(
            encryptedData,
            universeId,
            ownerId
        );

        console.log('✅ Decryption successful');

        console.log('3. Verifying data integrity...');
        const originalString = JSON.stringify(testData);
        const decryptedString = JSON.stringify(decryptedData);

        if (originalString === decryptedString) {
            console.log('✅ Data integrity verified - original and decrypted data match');
        } else {
            console.log('❌ Data integrity check failed');
            console.log('Original:', originalString);
            console.log('Decrypted:', decryptedString);
        }

        console.log('4. Testing encryption info...');
        const encryptionInfo = encryptionService.getEncryptionInfo();
        console.log('Encryption info:', encryptionInfo);

        console.log('🎉 All encryption tests passed!');

    } catch (error) {
        console.error('❌ Encryption test failed:', error);
        throw error;
    }
}

testEncryption().catch(console.error);
