/**
 * Debug version of encryption service with detailed logging
 */

import { randomBytes, scrypt, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function debugDetailedEncryption() {
    console.log('🔍 Detailed Encryption Debug...\n');

    const masterKey = randomBytes(32).toString('hex');
    console.log('1️⃣ Master key generated:', masterKey.substring(0, 16) + '...');

    const algorithm = 'aes-256-cbc';
    const keyLength = 32;
    const ivLength = 16;
    const saltLength = 32;

    const universeId = 'test-universe';
    const ownerId = 'test-owner';

    try {
        // Step 1: Generate encryption key
        console.log('\n2️⃣ Generating encryption key...');
        const salt = randomBytes(saltLength);
        console.log('Salt length:', salt.length);
        console.log('Salt (hex):', salt.toString('hex').substring(0, 16) + '...');

        const keyMaterial = `${masterKey}:${universeId}:${ownerId}`;
        console.log('Key material:', keyMaterial);

        const key = await scryptAsync(keyMaterial, salt, keyLength) as Buffer;
        console.log('Derived key length:', key.length);
        console.log('Derived key (hex):', key.toString('hex').substring(0, 16) + '...');

        const encryptionKey = Buffer.concat([salt, key]).toString('base64');
        console.log('Combined encryption key length:', encryptionKey.length);

        // Step 2: Extract key components (simulate what happens in decryption)
        console.log('\n3️⃣ Extracting key components...');
        const combined = Buffer.from(encryptionKey, 'base64');
        const extractedSalt = combined.subarray(0, saltLength);
        const extractedKey = combined.subarray(saltLength);

        console.log('Extracted salt length:', extractedSalt.length);
        console.log('Extracted key length:', extractedKey.length);
        console.log('Salt matches:', salt.equals(extractedSalt));
        console.log('Key matches:', key.equals(extractedKey));

        // Step 3: Encrypt data
        console.log('\n4️⃣ Encrypting data...');
        const testData = { message: 'Hello, World!' };
        const dataString = JSON.stringify(testData);
        console.log('Data to encrypt:', dataString);

        const iv = randomBytes(ivLength);
        console.log('IV length:', iv.length);
        console.log('IV (hex):', iv.toString('hex'));

        const cipher = createCipheriv(algorithm, extractedKey, iv);
        let encrypted = cipher.update(dataString, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        console.log('Encrypted data:', encrypted);

        const checksum = createHash('sha256').update(dataString).digest('hex');
        console.log('Checksum:', checksum);

        // Step 4: Decrypt data
        console.log('\n5️⃣ Decrypting data...');

        // Regenerate key (simulate repository call)
        const newSalt = randomBytes(saltLength);
        const newKeyMaterial = `${masterKey}:${universeId}:${ownerId}`;
        const newKey = await scryptAsync(newKeyMaterial, newSalt, keyLength) as Buffer;
        const newEncryptionKey = Buffer.concat([newSalt, newKey]).toString('base64');

        // Extract components
        const newCombined = Buffer.from(newEncryptionKey, 'base64');
        const newExtractedSalt = newCombined.subarray(0, saltLength);
        const newExtractedKey = newCombined.subarray(saltLength);

        console.log('New key generation:');
        console.log('- New salt matches original:', newExtractedSalt.equals(extractedSalt));
        console.log('- New key matches original:', newExtractedKey.equals(extractedKey));

        // Try decryption with new key
        try {
            const decipher = createDecipheriv(algorithm, newExtractedKey, iv);
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            console.log('Decrypted with new key:', decrypted);
        } catch (error) {
            console.log('❌ Decryption with new key failed:', error instanceof Error ? error.message : String(error));
        }

        // Try decryption with original key
        try {
            const decipher = createDecipheriv(algorithm, extractedKey, iv);
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            console.log('✅ Decrypted with original key:', decrypted);

            const decryptedData = JSON.parse(decrypted);
            console.log('Parsed data:', decryptedData);

            const decryptedChecksum = createHash('sha256').update(decrypted).digest('hex');
            console.log('Checksum matches:', checksum === decryptedChecksum);

        } catch (error) {
            console.log('❌ Decryption with original key failed:', error instanceof Error ? error.message : String(error));
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugDetailedEncryption().catch(console.error);
