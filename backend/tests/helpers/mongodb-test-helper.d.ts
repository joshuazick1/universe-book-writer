/**
 * MongoDB Test Helper - Uses Existing Local MongoDB Instance
 *
 * This helper connects to your existing MongoDB instance instead of
 * downloading and running MongoDB Memory Server. This is faster and
 * uses your actual MongoDB setup.
 */
import { MongoClient } from 'mongodb';
export interface MongoTestSetup {
  mongoClient: MongoClient;
  cleanup: () => Promise<void>;
}
/**
 * Setup MongoDB connection using existing local instance
 */
export declare function setupMongoForTest(databaseName: string): Promise<MongoTestSetup>;
/**
 * Global cleanup for all MongoDB connections
 */
export declare function globalMongoCleanup(): Promise<void>;
export declare const mongoHelper: {
  forceCleanup(): Promise<void>;
};
//# sourceMappingURL=mongodb-test-helper.d.ts.map
