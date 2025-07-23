import type { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Create auth_tokens collection
  await db.createCollection('auth_tokens', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'token', 'type', 'expiresAt', 'isRevoked', 'createdAt', 'updatedAt'],
        properties: {
          userId: {
            bsonType: 'objectId',
            description: 'Reference to the user who owns this token',
          },
          token: {
            bsonType: 'string',
            minLength: 1,
            description: 'The actual token string',
          },
          type: {
            bsonType: 'string',
            enum: ['ACCESS', 'REFRESH', 'EMAIL_VERIFICATION', 'PASSWORD_RESET'],
            description: 'Type of the token',
          },
          expiresAt: {
            bsonType: 'date',
            description: 'When the token expires',
          },
          isRevoked: {
            bsonType: 'bool',
            description: 'Whether the token has been revoked',
          },
          revokedAt: {
            bsonType: ['date', 'null'],
            description: 'When the token was revoked',
          },
          metadata: {
            bsonType: ['object', 'null'],
            description: 'Additional token metadata',
          },
          createdAt: {
            bsonType: 'date',
            description: 'When the token was created',
          },
          updatedAt: {
            bsonType: 'date',
            description: 'When the token was last updated',
          },
        },
        additionalProperties: false,
      },
    },
  });

  // Create auth_sessions collection
  await db.createCollection('auth_sessions', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'sessionId',
          'userId',
          'expiresAt',
          'deviceInfo',
          'ipAddress',
          'userAgent',
          'isActive',
          'lastActivityAt',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          sessionId: {
            bsonType: 'string',
            minLength: 1,
            description: 'Unique session identifier',
          },
          userId: {
            bsonType: 'objectId',
            description: 'Reference to the user who owns this session',
          },
          expiresAt: {
            bsonType: 'date',
            description: 'When the session expires',
          },
          deviceInfo: {
            bsonType: 'object',
            required: ['type', 'deviceId'],
            properties: {
              type: {
                bsonType: 'string',
                enum: ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'],
                description: 'Type of device',
              },
              deviceId: {
                bsonType: 'string',
                description: 'Unique device identifier',
              },
              os: {
                bsonType: ['string', 'null'],
                description: 'Operating system',
              },
              browser: {
                bsonType: ['string', 'null'],
                description: 'Browser information',
              },
            },
            additionalProperties: false,
          },
          ipAddress: {
            bsonType: 'string',
            description: 'IP address of the session',
          },
          userAgent: {
            bsonType: 'string',
            description: 'User agent string',
          },
          isActive: {
            bsonType: 'bool',
            description: 'Whether the session is active',
          },
          lastActivityAt: {
            bsonType: 'date',
            description: 'Last activity timestamp',
          },
          deactivatedAt: {
            bsonType: ['date', 'null'],
            description: 'When the session was deactivated',
          },
          metadata: {
            bsonType: ['object', 'null'],
            description: 'Additional session metadata',
          },
          createdAt: {
            bsonType: 'date',
            description: 'When the session was created',
          },
          updatedAt: {
            bsonType: 'date',
            description: 'When the session was last updated',
          },
        },
        additionalProperties: false,
      },
    },
  });

  // Create indexes for auth_tokens
  await Promise.all([
    // Unique index on token
    db.collection('auth_tokens').createIndex({ token: 1 }, { unique: true }),

    // Compound index for user queries
    db.collection('auth_tokens').createIndex({ userId: 1, type: 1, isRevoked: 1 }),

    // Index for expiration cleanup
    db.collection('auth_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    // Index for token lookup
    db.collection('auth_tokens').createIndex({ userId: 1, expiresAt: 1, isRevoked: 1 }),
  ]);

  // Create indexes for auth_sessions
  await Promise.all([
    // Unique index on sessionId
    db.collection('auth_sessions').createIndex({ sessionId: 1 }, { unique: true }),

    // Compound index for user session queries
    db.collection('auth_sessions').createIndex({ userId: 1, isActive: 1, expiresAt: 1 }),

    // Index for expiration cleanup
    db.collection('auth_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    // Index for security monitoring
    db.collection('auth_sessions').createIndex({ ipAddress: 1, lastActivityAt: -1 }),

    // Index for device tracking
    db.collection('auth_sessions').createIndex({ 'deviceInfo.deviceId': 1, userId: 1 }),
  ]);

  console.log('Authentication collections and indexes created successfully');
}

export async function down(db: Db): Promise<void> {
  // Drop the collections
  await Promise.all([db.collection('auth_tokens').drop(), db.collection('auth_sessions').drop()]);

  console.log('Authentication collections dropped successfully');
}
