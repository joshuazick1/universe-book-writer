# Centralized Mocks System

This directory contains a centralized mock system for backend tests, providing consistent mocking across all test files.

## Overview

The centralized mock system provides:
- **MongoDB mocks**: Complete MongoDB client and database operation mocks
- **Express mocks**: App, router, request, and response mocks
- **File system mocks**: fs and path operation mocks
- **Service mocks**: Auth, user, and token service mocks
- **Container mocks**: Dependency injection container mocks
- **Utility functions**: Helper functions for setting up and managing mocks

## Usage

### Basic Usage

```typescript
import centralizedMocks, { setupCommonMocks } from '../__mocks__/centralized-mocks.js';

describe('Your Test Suite', () => {
  beforeEach(() => {
    setupCommonMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use mocked services', () => {
    const { mockAuthService } = centralizedMocks;
    // Use the mocked service
    expect(mockAuthService.login).toBeDefined();
  });
});
```

### Module Mocking

For tests that need to mock entire modules:

```typescript
import { createModuleMocks } from '../__mocks__/centralized-mocks.js';

const moduleMocks = createModuleMocks();

jest.unstable_mockModule('mongodb', () => moduleMocks['mongodb']);
jest.unstable_mockModule('express', () => moduleMocks['express']);
```

### Available Mocks

#### Database Mocks
- `mockMongoClient`: Complete MongoDB client mock
- `mockFs`: File system operations mock
- `mockPath`: Path operations mock

#### Web Framework Mocks
- `mockExpressApp`: Express application mock
- `mockExpressRouter`: Express router mock
- `mockRequest(overrides)`: HTTP request mock factory
- `mockResponse()`: HTTP response mock factory
- `mockNext`: Express next function mock

#### Service Mocks
- `mockAuthService`: Authentication service mock
- `mockUserService`: User service mock
- `mockTokenService`: JWT token service mock
- `mockPluginSystem`: Plugin system mock

#### Infrastructure Mocks
- `mockContainer`: Dependency injection container mock
- `mockLogger`: Logger mock
- `mockConfig`: Configuration mock

## Best Practices

### 1. Use setupCommonMocks() in beforeEach
```typescript
beforeEach(() => {
  setupCommonMocks();
});
```

### 2. Clear mocks in afterEach
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 3. Customize mocks for specific tests
```typescript
it('should handle login failure', async () => {
  const { mockAuthService } = centralizedMocks;
  mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
  
  // Test code here
});
```

### 4. Use mock factories for request/response
```typescript
const req = mockRequest({ body: { username: 'test' } });
const res = mockResponse();
```

## Migration Guide

### Updating Existing Tests

1. **Import centralized mocks**:
   ```typescript
   import centralizedMocks, { setupCommonMocks } from '../__mocks__/centralized-mocks.js';
   ```

2. **Replace individual mocks**:
   ```typescript
   // Before
   const mockLogin = jest.fn();
   
   // After
   const { mockAuthService } = centralizedMocks;
   // Use mockAuthService.login instead
   ```

3. **Use setupCommonMocks()**:
   ```typescript
   beforeEach(() => {
     setupCommonMocks();
   });
   ```

### Common Patterns

#### Controller Tests
```typescript
import centralizedMocks, { setupCommonMocks } from '../__mocks__/centralized-mocks.js';

describe('Auth Controller', () => {
  beforeEach(() => {
    setupCommonMocks();
  });

  it('should login user', async () => {
    const { mockAuthService, mockRequest, mockResponse } = centralizedMocks;
    const req = mockRequest({ body: { username: 'test', password: 'pass' } });
    const res = mockResponse();
    
    // Test implementation
  });
});
```

#### Service Tests
```typescript
import centralizedMocks, { setupCommonMocks } from '../__mocks__/centralized-mocks.js';

describe('User Service', () => {
  beforeEach(() => {
    setupCommonMocks();
  });

  it('should find user by id', async () => {
    const { mockMongoClient } = centralizedMocks;
    mockMongoClient.db().collection().findOne.mockResolvedValue({
      _id: '1',
      username: 'test'
    });
    
    // Test implementation
  });
});
```

## Extending the System

To add new mocks:

1. **Add the mock object** to `centralized-mocks.ts`
2. **Update the container mock** to return your new mock
3. **Add module mocking** if needed in `createModuleMocks()`
4. **Export the mock** in the default export
5. **Update this README** with usage examples

Example:
```typescript
// Add new mock
export const mockNewService = {
  doSomething: jest.fn().mockResolvedValue('result'),
};

// Update container mock
mockContainer.get.mockImplementation((token: string) => {
  switch (token) {
    case 'NEW_SERVICE':
      return mockNewService;
    // ... other cases
  }
});

// Export in default
export default {
  // ... other mocks
  mockNewService,
  // ... rest
};
```

## Testing the Mock System

The centralized mock system itself is tested in `backend/tests/unit/index.test.ts`. This ensures:
- All mocks are properly defined
- Mock functions work as expected
- Module mocking works correctly
- Container resolution works properly
