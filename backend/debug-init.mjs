#!/usr/bin/env node
/**
 * Debug script for initialization
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🐛 Debug script starting...');

// Load environment variables
config({ path: join(__dirname, '.env') });

console.log('📁 Environment loaded from:', join(__dirname, '.env'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/verseforge';
const DB_NAME = process.env.MONGODB_DB_NAME || 'verseforge';

console.log('🔧 MONGODB_URI:', MONGODB_URI);
console.log('🔧 DB_NAME:', DB_NAME);

async function debugConnection() {
  let client;

  try {
    console.log('📡 Attempting MongoDB connection...');
    client = new MongoClient(MONGODB_URI);

    console.log('🔌 Connecting...');
    await client.connect();

    console.log('✅ Connected successfully!');

    const db = client.db(DB_NAME);
    console.log('📚 Using database:', DB_NAME);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📝 Collections:', collections.map(c => c.name));

    // Check users collection
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log('👥 User count:', userCount);

    if (userCount > 0) {
      const allUsers = await users.find({}).toArray();
      console.log('👤 Users found:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Full error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

debugConnection();
