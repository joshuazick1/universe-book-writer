# MongoDB Test Setup Documentation

## Overview

The test suite has been updated to use your **existing local MongoDB instance** instead of downloading MongoDB Memory Server. This provides several benefits:

- **No MongoDB downloads** - Uses your existing MongoDB at `mongodb://localhost:27017`
- **Faster test startup** - No need to start/stop MongoDB Memory Server
- **More realistic testing** - Tests against the same MongoDB version you use in development
- **Isolated test databases** - Each test run creates unique databases that are automatically cleaned up

## Configuration

### Environment Variables

Create or update `backend/tests/.env.test` with your MongoDB configuration:

```env
# MongoDB connection string for your existing MongoDB instance
MONGODB_URI=mongodb://localhost:27017

# Node environment for tests
NODE_ENV=test

# Optional: Test database prefix (will be combined with timestamp for uniqueness)
TEST_DB_PREFIX=verseforge_test
```

### Prerequisites

1. **MongoDB Running**: Ensure your local MongoDB instance is running on port 27017 (or update the URI in `.env.test`)
2. **No Authentication Required**: The test setup assumes no authentication. If your MongoDB requires auth, update the URI accordingly:
   ```env
   MONGODB_URI=mongodb://username:password@localhost:27017
   ```

## How It Works

### Test Database Isolation

Each test suite creates a unique database with the pattern:

```
test_{databaseName}_{timestamp}
```

For example:

- `test_hot_reload_1733123456789`
- `test_plugin_system_1733123456790`

### Automatic Cleanup

- **Per-test cleanup**: Each test database is dropped after the test suite completes
- **Global cleanup**: All MongoDB connections are properly closed after all tests finish

### Connection Reuse

The helper uses a singleton pattern to reuse the MongoDB connection across test suites, improving performance.

## Usage in Tests

### Basic Usage

```typescript
import { setupMongoForTest } from '../helpers/mongodb-test-helper.js';

describe('My Test Suite', () => {
  let mongoClient: MongoClient;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await setupMongoForTest('my-test-db');
    mongoClient = setup.mongoClient;
    cleanup = setup.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  test('should work with MongoDB', async () => {
    const db = mongoClient.db('test_my-test-db_' + Date.now());
    // Your test logic here
  });
});
```

### Plugin System Example

```typescript
beforeAll(async () => {
  const mongoSetup = await setupMongoForTest('test-hot-reload');
  mongoClient = mongoSetup.mongoClient;
  mongoCleanup = mongoSetup.cleanup;

  // Use mongoClient for plugin system initialization
  const system = await PluginSystemFactory.create({
    mongoClient,
    databaseName: 'test-hot-reload',
    autoLoadPlugins: false,
  });
});
```

## Migration from MongoDB Memory Server

### What Changed

1. **No more MongoDB downloads** - The helper no longer uses `mongodb-memory-server`
2. **Different connection pattern** - Uses your existing MongoDB instead of in-memory instance
3. **Faster test execution** - No startup/shutdown overhead

### Breaking Changes

- `MongoTestInstance` interface removed
- `mongoHelper.getMongoInstance()` replaced with `setupMongoForTest()`
- No more `server` property in test setup

### Update Your Tests

**Before:**

```typescript
const { client } = await mongoHelper.getMongoInstance();
```

**After:**

```typescript
const { mongoClient } = await setupMongoForTest('test-db-name');
```

## Troubleshooting

### MongoDB Connection Issues

1. **Check MongoDB is running**:

   ```powershell
   # Check if MongoDB service is running
   Get-Service -Name "MongoDB"

   # Or check if MongoDB is listening on port 27017
   Test-NetConnection -ComputerName localhost -Port 27017
   ```

2. **Verify connection string**:

   ```powershell
   # Test connection using mongo shell
   mongo mongodb://localhost:27017/test
   ```

3. **Check firewall/permissions**:
   - Ensure MongoDB is configured to accept local connections
   - Check Windows Firewall settings for port 27017

### Test Database Permissions

If you encounter permission errors:

```typescript
// Add to your .env.test file
MONGODB_URI=mongodb://your-username:your-password@localhost:27017/admin
```

### Performance Issues

If tests are slow:

1. **Check MongoDB configuration** - Ensure your MongoDB has sufficient resources
2. **Monitor connection pool** - The helper reuses connections efficiently
3. **Database cleanup** - Each test database is small and gets dropped quickly

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
NODE_ENV=test
```

## Files Modified

1. **`backend/tests/helpers/mongodb-test-helper.ts`** - Complete rewrite to use existing MongoDB
2. **`backend/tests/.env.test`** - New environment configuration
3. **`backend/tests/jest.env.js`** - Environment loader for Jest
4. **`jest.config.mjs`** - Added environment setup and global teardown
5. **`jest.teardown.global.mjs`** - Updated to use new cleanup function

## Benefits

- ✅ **No downloads** - No more waiting for MongoDB binaries
- ✅ **Faster tests** - Immediate startup with existing MongoDB
- ✅ **Real environment** - Test against your actual MongoDB setup
- ✅ **Clean isolation** - Each test gets its own database
- ✅ **Automatic cleanup** - No manual database cleanup needed
- ✅ **Better debugging** - Use your existing MongoDB tools to inspect test data
