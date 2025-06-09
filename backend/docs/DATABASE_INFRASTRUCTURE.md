# Database Infrastructure Documentation

## Overview

The Universe Book Writer project uses a dual-database architecture with MongoDB as the primary document store and Redis for caching and session management. This document provides comprehensive coverage of the database infrastructure, including setup, configuration, migration system, validation, and operational procedures.

## Architecture Overview

### Database Stack

- **MongoDB 6.0+**: Primary document database for application data
- **Redis 7.0+**: In-memory cache and session store
- **Connection Pooling**: Optimized connection management for both databases
- **Migration System**: TypeScript-based schema evolution framework
- **Validation Layer**: Comprehensive data validation using Zod schemas

### Infrastructure Components

```
Database Infrastructure
├── MongoDB Configuration
│   ├── Connection Management
│   ├── Schema Validation
│   ├── Indexing Strategy
│   └── Backup & Recovery
├── Redis Configuration
│   ├── Cache Management
│   ├── Session Storage
│   ├── Key Expiration
│   └── Persistence Settings
├── Migration System
│   ├── Schema Evolution
│   ├── Data Transformation
│   ├── Rollback Capability
│   └── Testing Framework
└── Validation Framework
    ├── Input Validation
    ├── Schema Enforcement
    ├── Type Safety
    └── Error Handling
```

## MongoDB Configuration

### Connection Setup

**Location**: `backend/src/infrastructure/database/mongodb.ts`

```typescript
interface MongoDBConfig {
  uri: string;
  databaseName: string;
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  retryWrites: boolean;
  writeConcern: {
    w: string | number;
    j: boolean;
    wtimeout: number;
  };
}
```

**Key Features**:
- **Connection Pooling**: Optimized pool sizing for concurrent requests
- **Retry Logic**: Automatic retry for transient failures
- **Write Concern**: Configurable durability guarantees
- **Monitoring**: Connection health and performance metrics

### Environment Configuration

```bash
# MongoDB Primary Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=universe_book_writer

# Connection Pool Settings
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=30000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000

# Write Concern Settings
MONGODB_WRITE_CONCERN_W=majority
MONGODB_WRITE_CONCERN_J=true
MONGODB_WRITE_CONCERN_WTIMEOUT=5000

# Authentication (Production)
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_AUTH_SOURCE=admin
```

### Collections Schema

#### Users Collection

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'passwordHash', 'roles', 'status'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        passwordHash: {
          bsonType: 'string',
          minLength: 1
        },
        roles: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['USER', 'MODERATOR', 'ADMIN']
          },
          minItems: 1
        },
        status: {
          bsonType: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']
        },
        isEmailVerified: {
          bsonType: 'bool'
        },
        profile: {
          bsonType: 'object',
          properties: {
            firstName: { bsonType: 'string', maxLength: 50 },
            lastName: { bsonType: 'string', maxLength: 50 },
            bio: { bsonType: 'string', maxLength: 500 },
            avatar: { bsonType: 'string' }
          }
        }
      }
    }
  }
}
```

#### Universes Collection

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'description', 'creatorId'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100
        },
        description: {
          bsonType: 'string',
          maxLength: 2000
        },
        creatorId: {
          bsonType: 'objectId'
        },
        locations: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['name', 'description'],
            properties: {
              name: { bsonType: 'string', maxLength: 100 },
              description: { bsonType: 'string', maxLength: 2000 },
              coordinates: {
                bsonType: 'object',
                additionalProperties: { bsonType: 'number' }
              }
            }
          }
        },
        timelines: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['name', 'events'],
            properties: {
              name: { bsonType: 'string', maxLength: 100 },
              events: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['id', 'date', 'description'],
                  properties: {
                    id: { bsonType: 'string' },
                    date: { bsonType: 'string' },
                    description: { bsonType: 'string', maxLength: 2000 }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

#### Sessions Collection

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'userId', 'expiresAt', 'deviceInfo', 'isActive'],
      properties: {
        sessionId: {
          bsonType: 'string',
          minLength: 1
        },
        userId: {
          bsonType: 'objectId'
        },
        expiresAt: {
          bsonType: 'date'
        },
        deviceInfo: {
          bsonType: 'object',
          required: ['type', 'deviceId'],
          properties: {
            type: {
              bsonType: 'string',
              enum: ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN']
            },
            deviceId: { bsonType: 'string' },
            os: { bsonType: ['string', 'null'] },
            browser: { bsonType: ['string', 'null'] }
          }
        },
        isActive: {
          bsonType: 'bool'
        },
        ipAddress: {
          bsonType: 'string'
        },
        userAgent: {
          bsonType: 'string'
        }
      }
    }
  }
}
```

### Indexing Strategy

#### Performance Indexes

```javascript
// Users Collection Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ roles: 1, status: 1 });
db.users.createIndex({ status: 1, createdAt: -1 });
db.users.createIndex({ isEmailVerified: 1, status: 1 });

// Universes Collection Indexes
db.universes.createIndex({ name: 1 }, { unique: true });
db.universes.createIndex({ creatorId: 1, createdAt: -1 });
db.universes.createIndex({ "locations.name": 1 });
db.universes.createIndex({ "timelines.name": 1 });

// Sessions Collection Indexes
db.auth_sessions.createIndex({ userId: 1, isActive: 1, expiresAt: 1 });
db.auth_sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.auth_sessions.createIndex({ ipAddress: 1, lastActivityAt: -1 });
db.auth_sessions.createIndex({ "deviceInfo.deviceId": 1, userId: 1 });

// Characters Collection Indexes
db.characters.createIndex({ universeId: 1, name: 1 });
db.characters.createIndex({ name: 1 });

// Books Collection Indexes
db.books.createIndex({ universeId: 1, authorId: 1 });
db.books.createIndex({ title: 1 });
db.books.createIndex({ status: 1, updatedAt: -1 });
```

#### Query Optimization

- **Compound Indexes**: Optimized for common query patterns
- **Unique Constraints**: Email and username uniqueness enforcement
- **TTL Indexes**: Automatic cleanup for expired sessions
- **Text Indexes**: Full-text search capabilities for content

## Redis Configuration

### Connection Setup

**Location**: `backend/src/infrastructure/database/redis.ts`

```typescript
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  keyPrefix: string;
}
```

### Environment Configuration

```bash
# Redis Primary Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Connection Settings
REDIS_RETRY_DELAY_ON_FAILOVER=100
REDIS_MAX_RETRIES_PER_REQUEST=3
REDIS_LAZY_CONNECT=true
REDIS_KEEP_ALIVE=30000

# Key Management
REDIS_KEY_PREFIX=ubw:
REDIS_SESSION_TTL=86400
REDIS_CACHE_TTL=3600
```

### Key Patterns and Usage

#### Session Management

```typescript
// Session Storage Pattern
const sessionKey = `${keyPrefix}session:${sessionId}`;
const sessionData = {
  userId: string;
  deviceInfo: DeviceInfo;
  lastActivity: number;
  metadata: Record<string, any>;
};

// Session Operations
await redis.setex(sessionKey, sessionTTL, JSON.stringify(sessionData));
await redis.del(sessionKey); // Session cleanup
```

#### Caching Strategy

```typescript
// Cache Key Patterns
const userCacheKey = `${keyPrefix}user:${userId}`;
const universeCacheKey = `${keyPrefix}universe:${universeId}`;
const storyCacheKey = `${keyPrefix}story:${storyId}`;

// Cache Operations
await redis.setex(cacheKey, cacheTTL, JSON.stringify(data));
const cached = await redis.get(cacheKey);
```

#### Rate Limiting

```typescript
// Rate Limit Key Pattern
const rateLimitKey = `${keyPrefix}rate:${userId}:${endpoint}`;

// Rate Limiting Implementation
const currentCount = await redis.incr(rateLimitKey);
if (currentCount === 1) {
  await redis.expire(rateLimitKey, windowSeconds);
}
```

### Data Persistence

```bash
# Redis Persistence Configuration
REDIS_SAVE_ENABLED=true
REDIS_SAVE_SECONDS=900
REDIS_SAVE_CHANGES=1
REDIS_AOF_ENABLED=true
REDIS_AOF_FSYNC=everysec
```

## Migration System

### Framework Overview

**Location**: `backend/src/migrations/`

The migration system uses **migrate-mongo** with TypeScript support for schema evolution and data transformation.

### Migration File Structure

```typescript
import type { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Forward migration logic
  await db.createCollection('new_collection', {
    validator: { /* schema definition */ }
  });
  
  await db.collection('existing_collection').createIndex(
    { newField: 1 },
    { unique: true }
  );
}

export async function down(db: Db): Promise<void> {
  // Rollback migration logic
  await db.collection('new_collection').drop();
  await db.collection('existing_collection').dropIndex('newField_1');
}
```

### Migration Commands

```powershell
# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create -- migration_name
```

### Existing Migrations

#### 1. Initial Setup (20250606000000)

**File**: `20250606000000-initial-setup.ts`

- Creates core collections: `users`, `universes`, `characters`, `books`
- Establishes basic schema validation
- Creates fundamental indexes
- Sets up collection relationships

#### 2. Authentication Collections (20250607000000)

**File**: `20250607000000-add-auth-collections.ts`

- Creates authentication collections: `auth_sessions`, `refresh_tokens`
- Implements session management schema
- Adds security-focused indexes
- Establishes device tracking

#### 3. Enhanced User Schema (20250607000001)

**File**: `20250607000001-update-users-schema.ts`

- Enhances user schema with profiles and permissions
- Adds role-based access control fields
- Implements email verification system
- Updates user-related indexes

### Migration Testing

```typescript
describe('Migration Tests', () => {
  beforeEach(async () => {
    const { mongoClient } = await setupMongoForTest('migration-test');
    testDb = mongoClient.db();
  });

  it('should run migration up successfully', async () => {
    await up(testDb);
    
    // Verify collections were created
    const collections = await testDb.listCollections().toArray();
    expect(collections.some(c => c.name === 'users')).toBe(true);
    
    // Verify indexes were created
    const indexes = await testDb.collection('users').listIndexes().toArray();
    expect(indexes.some(i => i.key.email === 1)).toBe(true);
  });

  it('should rollback migration successfully', async () => {
    await up(testDb);
    await down(testDb);
    
    // Verify collections were removed
    const collections = await testDb.listCollections().toArray();
    expect(collections.some(c => c.name === 'users')).toBe(false);
  });
});
```

## Data Validation System

### Schema Validation Architecture

**Location**: `packages/core/src/validation/`

The validation system uses **Zod** for runtime validation with TypeScript integration.

### Base Validation Schema

```typescript
import { z } from 'zod';

export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export abstract class BaseValidator<T extends BaseEntity> {
  protected schema: z.ZodSchema<T>;

  constructor(schema: z.ZodSchema<T>) {
    this.schema = schema;
  }

  validate(data: unknown): T {
    try {
      return this.schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  }

  validatePartial(data: unknown): Partial<T> {
    try {
      return this.schema.partial().parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Partial validation failed', error.errors);
      }
      throw error;
    }
  }
}
```

### Domain-Specific Validators

#### Universe Validator

```typescript
export const LocationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000),
  coordinates: z.record(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().max(2000),
});

export const TimelineSchema = z.object({
  name: z.string().min(1).max(100),
  events: z.array(TimelineEventSchema).min(1),
});

export const UniverseSchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Empty name not allowed').max(100, 'Name too long'),
  description: z.string().max(2000, 'Description too long'),
  creatorId: z.string(),
  locations: z.array(LocationSchema).default([]),
  timelines: z.array(TimelineSchema).default([]),
});

export class UniverseValidator extends BaseValidator<Universe> {
  constructor() {
    super(UniverseSchema);
  }
}
```

#### Story Validator

```typescript
export const CharacterSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).default({}),
  universeId: z.string(),
});

export const StoryChapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  order: z.number().int().min(1),
  wordCount: z.number().int().min(0).default(0),
});

export const StorySchema = BaseEntitySchema.extend({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000),
  universeId: z.string(),
  authorId: z.string(),
  chapters: z.array(StoryChapterSchema).default([]),
  characters: z.array(CharacterSchema).default([]),
  status: z.enum(['draft', 'in-progress', 'review', 'published']).default('draft'),
});

export class StoryValidator extends BaseValidator<Story> {
  constructor() {
    super(StorySchema);
  }
}
```

### Express Middleware Integration

```typescript
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@universe-book-writer/core';

export function validateRequest<T>(validator: BaseValidator<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validator.validate(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// Usage in routes
app.post('/api/universes', 
  validateRequest(new UniverseValidator()),
  createUniverseHandler
);
```

### Validation Testing

```typescript
describe('UniverseValidator', () => {
  let validator: UniverseValidator;

  beforeEach(() => {
    validator = new UniverseValidator();
  });

  it('should validate a complete universe', () => {
    const validUniverse = {
      id: 'universe-1',
      name: 'Middle Earth',
      description: 'Tolkien fantasy world',
      creatorId: 'user-1',
      locations: [{
        name: 'Shire',
        description: 'Home of the Hobbits'
      }],
      timelines: [{
        name: 'Third Age',
        events: [{
          id: 'event-1',
          date: '3019',
          description: 'War of the Ring'
        }]
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = validator.validate(validUniverse);
    expect(result.name).toBe('Middle Earth');
    expect(result.locations).toHaveLength(1);
  });

  it('should reject invalid universe', () => {
    const invalidUniverse = {
      name: '', // Empty name should fail
      description: 'A' * 3000, // Too long description
    };

    expect(() => validator.validate(invalidUniverse))
      .toThrow(ValidationError);
  });
});
```

## Testing Infrastructure

### MongoDB Test Setup

**Location**: `backend/tests/helpers/mongodb-test-helper.ts`

The test infrastructure uses your existing local MongoDB instance for faster and more reliable testing.

### Test Configuration

```typescript
export interface MongoTestSetup {
  mongoClient: MongoClient;
  cleanup: () => Promise<void>;
}

export async function setupMongoForTest(databaseName: string): Promise<MongoTestSetup> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  
  if (!globalMongoClient) {
    globalMongoClient = new MongoClient(mongoUri);
    await globalMongoClient.connect();
  }

  const testDbName = `test_${databaseName}_${Date.now()}`;
  const db = globalMongoClient.db(testDbName);

  await db.admin().ping();

  const cleanup = async () => {
    await db.dropDatabase();
  };

  return { mongoClient: globalMongoClient, cleanup };
}
```

### Redis Test Configuration

```typescript
const redisMockConfig = {
  data: {},
  lazyConnect: false,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
};

// Mock Redis for testing
jest.mock('ioredis', () => {
  const Redis = require('ioredis-mock');
  return function(...args: any[]) {
    return new Redis(redisMockConfig);
  };
});
```

### Test Environment Variables

```bash
# Test Environment Configuration
MONGODB_URI=mongodb://localhost:27017
NODE_ENV=test
TEST_DB_PREFIX=universe_book_writer_test
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Performance Optimization

### Connection Pooling

```typescript
const mongoOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2'),
  maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000'),
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
};
```

### Query Optimization

```typescript
// Efficient pagination
const findOptions = {
  skip: (page - 1) * limit,
  limit: limit,
  sort: { createdAt: -1 },
  projection: { sensitiveField: 0 } // Exclude sensitive data
};

// Index-optimized queries
const query = {
  userId: userId,
  status: 'ACTIVE',
  createdAt: { $gte: startDate, $lte: endDate }
};
```

### Caching Strategy

```typescript
// Multi-level caching
async function getCachedData(key: string): Promise<any> {
  // Level 1: In-memory cache
  let data = memoryCache.get(key);
  if (data) return data;

  // Level 2: Redis cache
  data = await redis.get(key);
  if (data) {
    memoryCache.set(key, JSON.parse(data));
    return JSON.parse(data);
  }

  // Level 3: Database query
  data = await database.findOne({ key });
  if (data) {
    await redis.setex(key, 3600, JSON.stringify(data));
    memoryCache.set(key, data);
  }

  return data;
}
```

## Security Implementation

### Data Protection

```typescript
// Field-level encryption for sensitive data
const encryptedSchema = {
  email: { type: String, encrypt: true },
  personalInfo: { type: Object, encrypt: true },
  paymentInfo: { type: Object, encrypt: true }
};

// Data sanitization
function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/[<>\"\']/g, '');
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
}
```

### Access Control

```typescript
// Database-level access control
const userPermissions = {
  read: ['users.own', 'universes.public'],
  write: ['users.own', 'universes.own'],
  admin: ['users.*', 'universes.*', 'system.*']
};

// Query filtering based on permissions
function addSecurityFilter(query: any, user: User): any {
  if (!user.roles.includes('ADMIN')) {
    query.$or = [
      { visibility: 'public' },
      { creatorId: user.id },
      { collaborators: user.id }
    ];
  }
  return query;
}
```

## Backup and Recovery

### Automated Backup Strategy

```bash
# MongoDB Backup Script
#!/bin/bash
BACKUP_DIR="/backups/mongodb/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"
tar -czf "$BACKUP_DIR.tar.gz" -C /backups/mongodb "$(date +%Y-%m-%d)"
rm -rf "$BACKUP_DIR"

# Retention policy (keep 30 days)
find /backups/mongodb -name "*.tar.gz" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# Redis Backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "/backups/redis/dump-$(date +%Y-%m-%d-%H-%M).rdb"

# MongoDB Point-in-Time Recovery
mongorestore --uri="$MONGODB_URI" --drop --dir="/backups/mongodb/2025-06-08"
```

### Disaster Recovery Procedures

1. **Data Loss Assessment**: Identify affected collections and timeframe
2. **Service Isolation**: Stop application services to prevent further corruption
3. **Backup Restoration**: Restore from most recent clean backup
4. **Data Reconciliation**: Apply transaction logs if available
5. **Validation Testing**: Verify data integrity post-recovery
6. **Service Restoration**: Gradually bring services back online
7. **Monitoring**: Enhanced monitoring during recovery period

## Monitoring and Alerting

### Database Health Metrics

```typescript
interface DatabaseMetrics {
  mongodb: {
    connections: {
      current: number;
      available: number;
      totalCreated: number;
    };
    operations: {
      insert: number;
      query: number;
      update: number;
      delete: number;
    };
    memory: {
      resident: number;
      virtual: number;
      mapped: number;
    };
    replication: {
      lag: number;
      status: string;
    };
  };
  redis: {
    memory: {
      used: number;
      peak: number;
      available: number;
    };
    keys: {
      total: number;
      expired: number;
      evicted: number;
    };
    operations: {
      commands: number;
      hits: number;
      misses: number;
    };
  };
}
```

### Alert Conditions

```typescript
const alertThresholds = {
  mongodb: {
    connectionUtilization: 80, // % of max connections
    queryResponseTime: 1000,   // milliseconds
    replicationLag: 10000,     // milliseconds
    diskUsage: 85,             // % of available disk
  },
  redis: {
    memoryUsage: 90,           // % of available memory
    hitRatio: 70,              // % cache hit rate
    keyEvictions: 1000,        // evictions per minute
    connectionCount: 1000,     // max concurrent connections
  }
};
```

## Troubleshooting Guide

### Common Issues

#### MongoDB Connection Problems

**Symptoms**: Connection timeouts, authentication failures
**Solutions**:
```bash
# Check MongoDB service status
Get-Service -Name "MongoDB"

# Test connection
mongo --eval "db.adminCommand('ping')"

# Check authentication
mongo --username $MONGODB_USERNAME --password $MONGODB_PASSWORD --authenticationDatabase admin
```

#### Redis Connection Issues

**Symptoms**: Cache misses, session loss
**Solutions**:
```bash
# Test Redis connectivity
redis-cli ping

# Check Redis memory usage
redis-cli info memory

# Monitor Redis operations
redis-cli monitor
```

#### Migration Failures

**Symptoms**: Schema validation errors, index creation failures
**Solutions**:
```powershell
# Check migration status
npm run migrate:status

# Rollback problematic migration
npm run migrate:down

# Validate schema manually
mongo --eval "db.collection.findOne()"
```

### Performance Issues

#### Slow Queries

```javascript
// Enable MongoDB query profiling
db.setProfilingLevel(2, { slowms: 100 });

// Analyze slow queries
db.system.profile.find().sort({ ts: -1 }).limit(5);

// Create missing indexes
db.collection.createIndex({ "field": 1 });
```

#### Memory Issues

```javascript
// MongoDB memory optimization
db.adminCommand({ "planCacheClear": "*" });
db.runCommand({ "compact": "collection_name" });

// Redis memory optimization
redis-cli FLUSHDB  // Clear database
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Configuration Examples

### Production Configuration

```bash
# MongoDB Production Settings
MONGODB_URI=mongodb://username:password@host1:27017,host2:27017,host3:27017/production?replicaSet=rs0&authSource=admin
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10
MONGODB_WRITE_CONCERN_W=majority
MONGODB_WRITE_CONCERN_J=true

# Redis Production Settings
REDIS_HOST=redis-cluster.production.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_KEY_PREFIX=ubw:prod:
REDIS_SESSION_TTL=604800  # 7 days
REDIS_CACHE_TTL=3600      # 1 hour
```

### Development Configuration

```bash
# MongoDB Development Settings
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=universe_book_writer_dev
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

# Redis Development Settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_KEY_PREFIX=ubw:dev:
REDIS_SESSION_TTL=86400   # 1 day
REDIS_CACHE_TTL=1800      # 30 minutes
```

### Test Configuration

```bash
# MongoDB Test Settings
MONGODB_URI=mongodb://localhost:27017
TEST_DB_PREFIX=universe_book_writer_test
MONGODB_MAX_POOL_SIZE=5

# Redis Test Settings (uses ioredis-mock)
NODE_ENV=test
REDIS_MOCK_ENABLED=true
```

## Best Practices

### Database Design

1. **Schema Design**: Use embedded documents for 1-to-few relationships, references for 1-to-many
2. **Index Strategy**: Create indexes based on query patterns, not just fields
3. **Data Modeling**: Design for your queries, not your data structure
4. **Validation**: Implement validation at both application and database levels

### Performance

1. **Connection Management**: Use connection pooling and connection reuse
2. **Query Optimization**: Use explain() to analyze query performance
3. **Caching Strategy**: Implement multi-level caching with appropriate TTLs
4. **Monitoring**: Continuous monitoring of database performance metrics

### Security

1. **Authentication**: Use strong authentication mechanisms for both databases
2. **Authorization**: Implement role-based access control
3. **Encryption**: Encrypt sensitive data both at rest and in transit
4. **Auditing**: Log all database operations for security auditing

### Maintenance

1. **Regular Backups**: Implement automated backup procedures with testing
2. **Index Maintenance**: Regular index optimization and cleanup
3. **Capacity Planning**: Monitor growth trends and plan for scaling
4. **Version Management**: Keep databases updated with security patches

## Conclusion

The database infrastructure provides a robust foundation for the Universe Book Writer application with comprehensive support for data storage, validation, migration, and performance optimization. The dual-database architecture ensures optimal performance for both persistent storage and real-time operations while maintaining data consistency and security.

The system is designed for scalability and maintainability, with comprehensive testing, monitoring, and troubleshooting capabilities to ensure reliable operation in production environments.
