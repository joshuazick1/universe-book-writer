// Test file to isolate import issues
import 'dotenv/config';

console.log('✅ dotenv imported successfully');

try {
  console.log('Testing MongoDB import...');
  const { MongoClient } = await import('mongodb');
  console.log('✅ MongoDB imported successfully');
} catch (error) {
  console.error('❌ MongoDB import failed:', error);
}

try {
  console.log('Testing Express import...');
  const express = await import('express');
  console.log('✅ Express imported successfully');
} catch (error) {
  console.error('❌ Express import failed:', error);
}

try {
  console.log('Testing MongoDB config import...');
  const { mongoDBConnection } = await import('./config/mongodb.config.js');
  console.log('✅ MongoDB config imported successfully');
} catch (error) {
  console.error('❌ MongoDB config import failed:', error);
}

try {
  console.log('Testing container import...');
  const { createAuthContainer } = await import('./infrastructure/container/container.js');
  console.log('✅ Container imported successfully');
} catch (error) {
  console.error('❌ Container import failed:', error);
}

console.log('✅ All imports tested');
