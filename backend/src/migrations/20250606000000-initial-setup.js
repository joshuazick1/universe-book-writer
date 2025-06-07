export async function up(db) {
  // Create collections with schema validation
  await Promise.all([
    // Users collection
    db.createCollection('users', {
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
    }),
    // Universes collection
    db.createCollection('universes', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'description', 'creatorId', 'createdAt', 'updatedAt'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              bsonType: 'string',
              maxLength: 2000,
            },
            creatorId: {
              bsonType: 'objectId',
            },
            locations: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['name', 'description'],
                properties: {
                  name: {
                    bsonType: 'string',
                    minLength: 1,
                    maxLength: 100,
                  },
                  description: {
                    bsonType: 'string',
                    maxLength: 2000,
                  },
                  coordinates: {
                    bsonType: 'object',
                    additionalProperties: { bsonType: 'number' },
                  },
                  metadata: {
                    bsonType: 'object',
                  },
                },
              },
            },
            timelines: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['name', 'events'],
                properties: {
                  name: {
                    bsonType: 'string',
                    minLength: 1,
                    maxLength: 100,
                  },
                  events: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'object',
                      required: ['id', 'date', 'description'],
                      properties: {
                        id: {
                          bsonType: 'string',
                        },
                        date: {
                          bsonType: 'string',
                        },
                        description: {
                          bsonType: 'string',
                          maxLength: 2000,
                        },
                      },
                    },
                  },
                },
              },
            },
            metadata: {
              bsonType: 'object',
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
    }),
    // Characters collection
    db.createCollection('characters', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'universeId'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 1,
              maxLength: 100,
            },
            universeId: {
              bsonType: 'objectId',
            },
            description: {
              bsonType: 'string',
              maxLength: 2000,
            },
            attributes: {
              bsonType: 'object',
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
    }),
    // Books collection
    db.createCollection('books', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'universeId', 'authorId'],
          properties: {
            title: {
              bsonType: 'string',
              minLength: 1,
              maxLength: 200,
            },
            universeId: {
              bsonType: 'objectId',
            },
            authorId: {
              bsonType: 'objectId',
            },
            synopsis: {
              bsonType: 'string',
              maxLength: 2000,
            },
            status: {
              enum: ['draft', 'in-progress', 'review', 'published'],
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
    }),
  ]);
  // Create indexes
  await Promise.all([
    // Users indexes
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
    // Universes indexes
    db.collection('universes').createIndex({ name: 1 }, { unique: true }),
    db.collection('universes').createIndex({ creatorId: 1 }),
    // Characters indexes
    db.collection('characters').createIndex({ universeId: 1 }),
    db.collection('characters').createIndex({ name: 1, universeId: 1 }),
    // Books indexes
    db.collection('books').createIndex({ universeId: 1 }),
    db.collection('books').createIndex({ authorId: 1 }),
    db.collection('books').createIndex({ title: 1, universeId: 1 }),
  ]);
}
export async function down(db) {
  // Drop collections in reverse order
  await Promise.all([
    db.collection('books').drop(),
    db.collection('characters').drop(),
    db.collection('universes').drop(),
    db.collection('users').drop(),
  ]);
}
//# sourceMappingURL=20250606000000-initial-setup.js.map
