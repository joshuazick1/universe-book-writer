/**
 * First-run script to create admin user if none exists
 * This script creates an admin user for the first time setup
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const ADMIN_USER = {
  email: 'admin@universe-writer.com',
  password: 'WriteTheStars2025!',
  firstName: 'System',
  lastName: 'Administrator',
  role: 'admin',
  emailVerified: true,
  status: 'active'
};

async function createFirstAdminUser() {
  let client;
  
  try {
    console.log('🚀 Starting first-run admin user creation...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'universe_book_writer';
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Check if any admin user already exists
    const existingAdmin = await usersCollection.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists:', existingAdmin.email);
      console.log('✅ First-run setup not needed');
      return;
    }
    
    // Check if the specific admin user already exists
    const existingUser = await usersCollection.findOne({ email: ADMIN_USER.email });
    
    if (existingUser) {
      console.log('ℹ️  User already exists:', ADMIN_USER.email);
      console.log('✅ Updating user to admin role...');
      
      await usersCollection.updateOne(
        { email: ADMIN_USER.email },
        { 
          $set: { 
            role: 'admin', 
            emailVerified: true, 
            status: 'active',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('✅ User updated to admin successfully');
      return;
    }
    
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, saltRounds);
    
    // Create the admin user
    const adminUser = {
      ...ADMIN_USER,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      failedLoginAttempts: 0,
      accountLocked: false,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false
        }
      }
    };
    
    const result = await usersCollection.insertOne(adminUser);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', ADMIN_USER.email);
    console.log('🔑 Password:', ADMIN_USER.password);
    console.log('🆔 User ID:', result.insertedId);
    console.log('');
    console.log('🎉 You can now log in to the application with these credentials');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

// Run the script
createFirstAdminUser()
  .then(() => {
    console.log('🏁 First-run setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 First-run setup failed:', error);
    process.exit(1);
  });
