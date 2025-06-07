/**
 * Jest Global Teardown
 * Ensures proper cleanup of shared resources after all tests complete
 */

export default async function globalTeardown() {
  console.log('Running global teardown...');
  try {
    // Close any global MongoDB connections if they exist
    if (global.__MONGO_CLIENT__) {
      await global.__MONGO_CLIENT__.close();
      console.log('Global MongoDB client closed');
    }
    
    // Force close any remaining MongoDB connections
    if (global.__MONGODB_CONNECTIONS__) {
      for (const connection of global.__MONGODB_CONNECTIONS__) {
        await connection.close();
      }
      console.log('All MongoDB connections closed');
    }
    
    // Clear any timers or intervals
    if (global.__HEALTH_MONITOR_INTERVALS__) {
      global.__HEALTH_MONITOR_INTERVALS__.forEach(clearInterval);
      console.log('Health monitor intervals cleared');
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
  } catch (error) {
    console.warn('Error during global teardown:', error.message);
  }
  console.log('Global teardown completed');
}
