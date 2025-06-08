/**
 * MongoDB Test Helper - Uses Existing Local MongoDB Instance
 *
 * This helper connects to your existing MongoDB instance instead of
 * downloading and running MongoDB Memory Server. This is faster and
 * uses your actual MongoDB setup.
 */
import { MongoClient } from 'mongodb';
let globalMongoClient = null;
/**
 * Setup MongoDB connection using existing local instance
 */
export async function setupMongoForTest(databaseName) {
  try {
    // Use your existing MongoDB instance
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    // Reuse existing connection or create new one
    if (!globalMongoClient) {
      globalMongoClient = new MongoClient(mongoUri);
      await globalMongoClient.connect();
      console.log(`Connected to existing MongoDB at ${mongoUri}`);
    }
    // Create a unique test database name to avoid conflicts
    const testDbName = `test_${databaseName}_${Date.now()}`;
    const db = globalMongoClient.db(testDbName);
    // Verify connection
    await db.admin().ping();
    console.log(`Test database '${testDbName}' ready`);
    const cleanup = async () => {
      try {
        // Drop the test database after tests
        await db.dropDatabase();
        console.log(`Test database '${testDbName}' cleaned up`);
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    };
    return {
      mongoClient: globalMongoClient,
      cleanup,
    };
  } catch (error) {
    console.error('MongoDB setup failed:', error);
    throw new Error(
      `Failed to connect to MongoDB at ${process.env.MONGODB_URI || 'mongodb://localhost:27017'}: ${error}`
    );
  }
}
/**
 * Global cleanup for all MongoDB connections
 */
export async function globalMongoCleanup() {
  if (globalMongoClient) {
    try {
      await globalMongoClient.close(true); // Force close to terminate connections immediately
      globalMongoClient = null;
      console.log('Global MongoDB connection closed');
    } catch (error) {
      console.warn('Global MongoDB cleanup warning:', error);
    }
  }
}
// Export for backwards compatibility
export const mongoHelper = {
  async forceCleanup() {
    await globalMongoCleanup();
  },
};
//# sourceMappingURL=mongodb-test-helper.js.map
