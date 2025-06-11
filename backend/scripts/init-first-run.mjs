#!/usr/bin/env node
/**
 * First-run initialization script
 * Creates a default admin user if none exists
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/universe-book-writer';
const DB_NAME = process.env.MONGODB_DB_NAME || 'universe-book-writer';

// Witty default admin credentials
const DEFAULT_ADMIN = {
  email: 'admin@universe-writer.com',
  password: 'WriteTheStars2025!', // Witty and secure
  firstName: 'Universe',
  lastName: 'Admin',
  username: 'universe-admin',
  role: 'admin'
};

/**
 * Generate a secure ID for entities
 */
function generateSecureId(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if admin user exists
 */
async function adminUserExists(db) {
  const users = db.collection('users');
  const adminUser = await users.findOne({ 
    $or: [
      { role: 'admin' },
      { email: DEFAULT_ADMIN.email }
    ]
  });
  return adminUser !== null;
}

/**
 * Create default admin user
 */
async function createAdminUser(db) {
  const users = db.collection('users');
  
  // Hash the password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);
  
  // Create admin user
  const adminUser = {
    id: generateSecureId(),
    email: DEFAULT_ADMIN.email,
    username: DEFAULT_ADMIN.username,
    firstName: DEFAULT_ADMIN.firstName,
    lastName: DEFAULT_ADMIN.lastName,
    passwordHash: hashedPassword,
    role: DEFAULT_ADMIN.role,
    status: 'active',
    emailVerified: true, // Auto-verify admin user
    permissions: {
      canCreateUniverses: true,
      canEditUniverses: true,
      canDeleteUniverses: true,
      canManageUsers: true,
      canAccessAdminPanel: true,
    },
    preferences: {
      theme: 'default',
      notifications: {
        email: true,
        inApp: true,
      },
      privacy: {
        profileVisibility: 'private',
        allowDataCollection: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  await users.insertOne(adminUser);
  
  console.log('🎉 Default admin user created successfully!');
  console.log('');
  console.log('📧 Email:', DEFAULT_ADMIN.email);
  console.log('🔑 Password:', DEFAULT_ADMIN.password);
  console.log('');
  console.log('⚠️  Please change the password after first login!');
  console.log('');
  
  return adminUser;
}

/**
 * Initialize first-run setup
 */
async function initFirstRun() {
  let client;
  
  try {
    console.log('🚀 Starting first-run initialization...');
    console.log('');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    console.log('✅ Connected to database:', DB_NAME);
    console.log('');
    
    // Check if admin user already exists
    console.log('🔍 Checking for existing admin users...');
    const adminExists = await adminUserExists(db);
    
    if (adminExists) {
      console.log('✅ Admin user already exists. No action needed.');
      console.log('');
      return;
    }
    
    console.log('👤 No admin user found. Creating default admin user...');
    console.log('');
    
    // Create admin user
    await createAdminUser(db);
    
    console.log('✨ First-run initialization completed successfully!');
    console.log('');
    console.log('🌟 Welcome to Universe Book Writer!');
    console.log('💫 Your multiverse awaits...');
    
  } catch (error) {
    console.error('❌ First-run initialization failed:');
    console.error(error.message);
    console.error('');
    console.error('💡 Tips:');
    console.error('  - Make sure MongoDB is running');
    console.error('  - Check your MONGODB_URI in .env file');
    console.error('  - Verify database permissions');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the initialization
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  initFirstRun().catch(console.error);
}

export { initFirstRun, DEFAULT_ADMIN };
