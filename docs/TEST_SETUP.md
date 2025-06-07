# Test Infrastructure Setup

This document describes the test infrastructure setup for the Multi-Universe Book Series Writing Assistant project.

## Database Mocking

### Redis Mock Configuration

Redis mocking is implemented using `ioredis-mock` with custom configuration to ensure reliable test execution:

```typescript
const redisMockConfig = {
  data: {},
  lazyConnect: false,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
};
```

Key features:

- Disabled lazy connection to prevent timing issues
- Disabled ready check to prevent unnecessary delays
- Limited retries to prevent timeout cascades
- Proper cleanup in test lifecycle

### MongoDB Mock Configuration

MongoDB mocking uses the `mongodb-memory-server` package for in-memory testing:

```typescript
const mongoConfig = {
  instance: {
    dbName: 'test',
    storageEngine: 'wiredTiger',
  },
  binary: {
    version: '6.0.12',
  },
};
```

Features:

- In-memory storage for fast execution
- Proper cleanup after tests
- Support for validation rules
- Configurable version matching production

## Test Lifecycle

### Setup

1. Redis mock initialization with custom config
2. MongoDB memory server startup
3. Database connections established
4. Global test context populated

### Cleanup

1. Redis data flushed and connection closed
2. MongoDB collections cleared
3. MongoDB connection closed
4. MongoDB memory server stopped

## Best Practices

1. **Database Operations**

   - Use the global client instances in tests
   - Clear data between tests
   - Handle async operations properly

2. **Error Handling**

   - Use proper assertions for database errors
   - Test timeout scenarios
   - Validate cleanup success

3. **Performance**
   - Minimize database operations in tests
   - Use shared setup when possible
   - Clean up resources promptly

## Examples

### Redis Test Example

```typescript
it('should handle Redis operations', async () => {
  const key = 'test-key';
  const value = 'test-value';

  await global.redisClient.set(key, value);
  const result = await global.redisClient.get(key);

  expect(result).toBe(value);
});
```

### MongoDB Test Example

```typescript
it('should handle MongoDB operations', async () => {
  const collection = global.mongoClient.db().collection('test');
  const doc = { test: 'value' };

  await collection.insertOne(doc);
  const result = await collection.findOne({ test: 'value' });

  expect(result).toBeDefined();
  expect(result?.test).toBe('value');
});
```
