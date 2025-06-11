/**
 * Minimal backend index for debugging - bypasses complex container issues
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mongoDBConnection } from './config/mongodb.config.js';

const app = express();
const port = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Universe Book Writer API - Minimal Mode',
    version: '0.1.0',
    mode: 'minimal'
  });
});

// Start server
async function startMinimalServer() {
  try {
    console.log('🚀 Starting minimal backend server...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoDBConnection.connect();
    console.log('✅ MongoDB connected successfully');

    // Start the server
    app.listen(port, () => {
      console.log(`✅ Minimal backend server running on port ${port}`);
      console.log(`📍 Health check: http://localhost:${port}/api/health`);
      console.log(`📍 API info: http://localhost:${port}/api`);
    });

  } catch (error) {
    console.error('❌ Failed to start minimal server:', error);
    process.exit(1);
  }
}

startMinimalServer();
