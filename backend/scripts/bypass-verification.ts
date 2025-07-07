/**
 * Script to bypass email verification for testing purposes
 * This script directly updates the database to mark a user as verified
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/verseforge';

async function bypassEmailVerification(email: string) {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Find the user
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            return;
        }

        console.log(`📧 Found user: ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(`🔍 Current verification status: ${user.email_verified ? 'Verified' : 'Not Verified'}`);

        if (user.email_verified) {
            console.log('✅ User is already verified');
            return;
        }

        // Update the user to be verified
        const result = await usersCollection.updateOne(
            { email: email },
            {
                $set: {
                    email_verified: true,
                    email_verified_at: new Date(),
                    updated_at: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log('✅ Email verification bypassed successfully');
            console.log(`🎉 User ${email} is now verified and can log in`);
        } else {
            console.log('❌ Failed to update user verification status');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
    console.log('Usage: npm run bypass-verification <email>');
    console.log('Example: npm run bypass-verification testcollab@example.com');
    process.exit(1);
}

bypassEmailVerification(email);
