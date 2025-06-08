export async function up(db) {
  // Update users collection schema to match our User entity
  await db.command({
    collMod: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'email',
          'firstName',
          'lastName',
          'passwordHash',
          'roles',
          'permissions',
          'status',
          'isEmailVerified',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            description: 'User email address',
          },
          firstName: {
            bsonType: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'User first name',
          },
          lastName: {
            bsonType: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'User last name',
          },
          passwordHash: {
            bsonType: 'string',
            minLength: 1,
            description: 'Hashed password',
          },
          roles: {
            bsonType: 'array',
            items: {
              bsonType: 'string',
              enum: ['USER', 'MODERATOR', 'ADMIN'],
            },
            minItems: 1,
            description: 'User roles',
          },
          permissions: {
            bsonType: 'array',
            items: {
              bsonType: 'string',
            },
            description: 'User permissions',
          },
          status: {
            bsonType: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
            description: 'User account status',
          },
          isEmailVerified: {
            bsonType: 'bool',
            description: 'Whether email is verified',
          },
          emailVerifiedAt: {
            bsonType: ['date', 'null'],
            description: 'When email was verified',
          },
          lastLoginAt: {
            bsonType: ['date', 'null'],
            description: 'Last login timestamp',
          },
          failedLoginAttempts: {
            bsonType: ['int', 'null'],
            minimum: 0,
            description: 'Number of failed login attempts',
          },
          lockedUntil: {
            bsonType: ['date', 'null'],
            description: 'Account locked until this date',
          },
          profile: {
            bsonType: ['object', 'null'],
            properties: {
              bio: {
                bsonType: ['string', 'null'],
                maxLength: 500,
              },
              avatar: {
                bsonType: ['string', 'null'],
              },
              website: {
                bsonType: ['string', 'null'],
              },
              location: {
                bsonType: ['string', 'null'],
                maxLength: 100,
              },
              timezone: {
                bsonType: ['string', 'null'],
                maxLength: 50,
              },
              preferences: {
                bsonType: ['object', 'null'],
              },
            },
            additionalProperties: false,
          },
          createdAt: {
            bsonType: 'date',
            description: 'Account creation timestamp',
          },
          updatedAt: {
            bsonType: 'date',
            description: 'Last update timestamp',
          },
        },
        additionalProperties: false,
      },
    },
  });
  // Create new indexes for users collection
  await Promise.all([
    // Unique index on email
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    // Index for role-based queries
    db.collection('users').createIndex({ roles: 1, status: 1 }),
    // Index for status queries
    db.collection('users').createIndex({ status: 1, createdAt: -1 }),
    // Index for email verification
    db.collection('users').createIndex({ isEmailVerified: 1, status: 1 }),
    // Index for login tracking
    db.collection('users').createIndex({ email: 1, status: 1, lockedUntil: 1 }),
    // Text index for search
    db.collection('users').createIndex(
      {
        firstName: 'text',
        lastName: 'text',
        email: 'text',
      },
      {
        name: 'user_search_index',
        weights: {
          firstName: 10,
          lastName: 10,
          email: 5,
        },
      }
    ),
  ]);
  // Migrate existing user data if any exists
  const existingUsers = await db.collection('users').find({}).toArray();
  for (const user of existingUsers) {
    const updateData = {};
    // Add missing required fields with defaults
    if (!user.firstName && user.username) {
      updateData.firstName = user.username.split(' ')[0] || 'User';
    }
    if (!user.lastName) {
      updateData.lastName = user.username?.split(' ').slice(1).join(' ') || 'User';
    }
    if (!user.roles) {
      updateData.roles = ['USER'];
    }
    if (!user.permissions) {
      updateData.permissions = [];
    }
    if (!user.status) {
      updateData.status = 'ACTIVE';
    }
    if (user.isEmailVerified === undefined) {
      updateData.isEmailVerified = false;
    }
    if (!user.updatedAt) {
      updateData.updatedAt = user.createdAt || new Date();
    }
    // Remove deprecated fields
    const unsetData = {};
    if (user.username !== undefined) {
      unsetData.username = '';
    }
    // Apply updates if needed
    if (Object.keys(updateData).length > 0 || Object.keys(unsetData).length > 0) {
      const updateQuery = {};
      if (Object.keys(updateData).length > 0) {
        updateQuery.$set = updateData;
      }
      if (Object.keys(unsetData).length > 0) {
        updateQuery.$unset = unsetData;
      }
      await db.collection('users').updateOne({ _id: user._id }, updateQuery);
    }
  }
  console.log('Users collection schema updated and data migrated successfully');
}
export async function down(db) {
  // Revert to the original schema (basic version)
  await db.command({
    collMod: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'username', 'passwordHash'],
        properties: {
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
          username: {
            bsonType: 'string',
            minLength: 3,
            maxLength: 30,
          },
          passwordHash: {
            bsonType: 'string',
          },
          createdAt: {
            bsonType: 'date',
          },
          updatedAt: {
            bsonType: 'date',
          },
        },
      },
    },
  });
  // Drop the new indexes (keep only the original ones)
  await Promise.all([
    db
      .collection('users')
      .dropIndex('email_1')
      .catch(() => {}),
    db
      .collection('users')
      .dropIndex('roles_1_status_1')
      .catch(() => {}),
    db
      .collection('users')
      .dropIndex('status_1_createdAt_-1')
      .catch(() => {}),
    db
      .collection('users')
      .dropIndex('isEmailVerified_1_status_1')
      .catch(() => {}),
    db
      .collection('users')
      .dropIndex('email_1_status_1_lockedUntil_1')
      .catch(() => {}),
    db
      .collection('users')
      .dropIndex('user_search_index')
      .catch(() => {}),
  ]);
  console.log('Users collection schema reverted successfully');
}
//# sourceMappingURL=20250607000001-update-users-schema.js.map
