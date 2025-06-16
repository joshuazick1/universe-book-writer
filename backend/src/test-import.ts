/* eslint-disable @typescript-eslint/no-unused-vars */
// Test file to investigate import issues
import 'dotenv/config';

console.log('✅ dotenv imported successfully');

try {
  console.log('Testing MongoDB import...');
  const { MongoClient: _MongoClient } = await import('mongodb');
  console.log('✅ MongoDB imported successfully');
} catch (error) {
  console.error('❌ MongoDB import failed:', error);
}

try {
  console.log('Testing Express import...');
  const _express = await import('express');
  console.log('✅ Express imported successfully');
} catch (error) {
  console.error('❌ Express import failed:', error);
}

try {
  console.log('Testing MongoDB config import...');
  const { mongoDBConnection: _mongoDBConnection } = await import('./config/mongodb.config.js');
  console.log('✅ MongoDB config imported successfully');
} catch (error) {
  console.error('❌ MongoDB config import failed:', error);
}

try {
  console.log('Testing container import...');
  const { createAuthContainer: _createAuthContainer } = await import(
    './infrastructure/container/container.js'
  );
  console.log('✅ Container imported successfully');
} catch (error) {
  console.error('❌ Container import failed:', error);
}

console.log('✅ All imports tested');
