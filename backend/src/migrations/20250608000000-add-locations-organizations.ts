import type { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Create locations collection
  await db.createCollection('locations', {
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
          type: {
            bsonType: 'string',
            maxLength: 100,
          },
          classification: {
            bsonType: 'string',
            maxLength: 100,
          },
          system: {
            bsonType: 'string',
            maxLength: 100,
          },
          sector: {
            bsonType: 'string',
            maxLength: 50,
          },
          parentLocation: {
            bsonType: 'objectId',
          },
          coordinates: {
            bsonType: 'object',
            properties: {
              x: { bsonType: 'number' },
              y: { bsonType: 'number' },
              z: { bsonType: 'number' },
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
  });

  // Create organizations collection
  await db.createCollection('organizations', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'description', 'type', 'universeId'],
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
          type: {
            bsonType: 'string',
            enum: [
              'Government Alliance',
              'Military/Exploration', 
              'Government',
              'Military',
              'Criminal Organization',
              'Political Faction',
              'Corporate',
              'Religious',
              'Academic',
              'Other'
            ],
          },
          universeId: {
            bsonType: 'objectId',
          },
          leadership: {
            bsonType: 'array',
            items: {
              bsonType: 'objectId',
            },
          },
          members: {
            bsonType: 'array',
            items: {
              bsonType: 'objectId',
            },
          },
          headquarters: {
            bsonType: 'objectId',
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
  });

  // Create indexes for locations
  await Promise.all([
    db.collection('locations').createIndex({ universeId: 1 }),
    db.collection('locations').createIndex({ name: 1, universeId: 1 }),
    db.collection('locations').createIndex({ type: 1 }),
    db.collection('locations').createIndex({ sector: 1 }),
    db.collection('locations').createIndex({ parentLocation: 1 }),
  ]);

  // Create indexes for organizations
  await Promise.all([
    db.collection('organizations').createIndex({ universeId: 1 }),
    db.collection('organizations').createIndex({ name: 1, universeId: 1 }),
    db.collection('organizations').createIndex({ type: 1 }),
    db.collection('organizations').createIndex({ leadership: 1 }),
    db.collection('organizations').createIndex({ members: 1 }),
  ]);
}

export async function down(db: Db): Promise<void> {
  // Drop collections in reverse order
  await Promise.all([
    db.collection('organizations').drop(),
    db.collection('locations').drop(),
  ]);
}
