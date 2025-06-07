import { MongoClient, type MongoClientOptions } from 'mongodb';

export const MONGODB_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB_NAME || 'universe_book_writer',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  } as MongoClientOptions,
};

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private client: MongoClient | null = null;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<MongoClient> {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = await MongoClient.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);

      // Create indexes on startup
      await this.createIndexes();

      console.log('Successfully connected to MongoDB.');
      return this.client;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log('MongoDB connection closed.');
    }
  }

  public getClient(): MongoClient | null {
    return this.client;
  }

  private async createIndexes(): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB client not initialized');
    }

    const db = this.client.db(MONGODB_CONFIG.dbName);

    // Create indexes for different collections
    // Users collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
    ]);

    // Universes collection indexes
    await db
      .collection('universes')
      .createIndexes([{ key: { name: 1 }, unique: true }, { key: { creatorId: 1 } }]);

    // Characters collection indexes
    await db
      .collection('characters')
      .createIndexes([{ key: { universeId: 1 } }, { key: { name: 1, universeId: 1 } }]);

    // Books collection indexes
    await db
      .collection('books')
      .createIndexes([{ key: { universeId: 1 } }, { key: { authorId: 1 } }]);

    console.log('MongoDB indexes created successfully.');
  }
}

export const mongoDBConnection = MongoDBConnection.getInstance();
