/**
 * Migration: Create Universe Management Collections
 *
 * Creates the necessary MongoDB collections and indexes for the universe management system
 * including support for plugin data preservation and real-time synchronization.
 */
export async function up(db) {
    console.log('Creating universe management collections...');
    // Create universes collection
    await db.createCollection('universes', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: [
                    'id',
                    'name',
                    'description',
                    'owner_id',
                    'plugin_config',
                    'settings',
                    'sync_token',
                    'created_at',
                    'updated_at'
                ],
                properties: {
                    id: {
                        bsonType: 'string',
                        description: 'Unique universe identifier'
                    },
                    name: {
                        bsonType: 'string',
                        minLength: 1,
                        maxLength: 255,
                        description: 'Universe name'
                    },
                    description: {
                        bsonType: 'string',
                        maxLength: 2000,
                        description: 'Universe description'
                    },
                    owner_id: {
                        bsonType: 'string',
                        description: 'Owner user ID'
                    },
                    plugin_config: {
                        bsonType: 'object',
                        required: ['active_plugin', 'plugin_version', 'sub_universe', 'canon_compliance'],
                        properties: {
                            active_plugin: {
                                bsonType: 'string',
                                description: 'Active plugin identifier'
                            },
                            plugin_version: {
                                bsonType: 'string',
                                description: 'Plugin version'
                            },
                            sub_universe: {
                                bsonType: 'string',
                                description: 'Sub-universe identifier'
                            },
                            canon_compliance: {
                                bsonType: 'string',
                                enum: ['strict', 'flexible', 'custom'],
                                description: 'Canon compliance level'
                            },
                            theme_config: {
                                bsonType: 'object',
                                description: 'Theme configuration'
                            }
                        }
                    },
                    settings: {
                        bsonType: 'object',
                        required: ['is_private', 'allow_collaboration', 'collaboration_permissions', 'sync_settings', 'validation_settings'],
                        properties: {
                            is_private: {
                                bsonType: 'bool',
                                description: 'Is universe private'
                            },
                            allow_collaboration: {
                                bsonType: 'bool',
                                description: 'Allow collaboration'
                            },
                            collaboration_permissions: {
                                bsonType: 'object',
                                description: 'Collaboration permissions'
                            },
                            sync_settings: {
                                bsonType: 'object',
                                description: 'Synchronization settings'
                            },
                            validation_settings: {
                                bsonType: 'object',
                                description: 'Validation settings'
                            }
                        }
                    },
                    plugin_data_store: {
                        bsonType: 'object',
                        description: 'Plugin data storage'
                    },
                    orphaned_plugin_data: {
                        bsonType: 'array',
                        description: 'Orphaned plugin data'
                    },
                    sync_token: {
                        bsonType: 'string',
                        description: 'Synchronization token'
                    },
                    created_at: {
                        bsonType: 'date',
                        description: 'Creation timestamp'
                    },
                    updated_at: {
                        bsonType: 'date',
                        description: 'Last update timestamp'
                    }
                }
            }
        }
    });
    // Create universe_sync_events collection for real-time synchronization
    await db.createCollection('universe_sync_events', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['event_type', 'universe_id', 'user_id', 'timestamp', 'sync_token'],
                properties: {
                    event_type: {
                        bsonType: 'string',
                        enum: ['create', 'update', 'delete', 'plugin_change'],
                        description: 'Type of sync event'
                    },
                    universe_id: {
                        bsonType: 'string',
                        description: 'Universe identifier'
                    },
                    user_id: {
                        bsonType: 'string',
                        description: 'User who triggered the event'
                    },
                    timestamp: {
                        bsonType: 'date',
                        description: 'Event timestamp'
                    },
                    changes: {
                        bsonType: 'array',
                        description: 'Array of changes'
                    },
                    sync_token: {
                        bsonType: 'string',
                        description: 'Synchronization token'
                    }
                }
            }
        }
    });
    // Create universe_collaborators collection
    await db.createCollection('universe_collaborators', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['universe_id', 'user_id', 'role', 'added_date'],
                properties: {
                    universe_id: {
                        bsonType: 'string',
                        description: 'Universe identifier'
                    },
                    user_id: {
                        bsonType: 'string',
                        description: 'Collaborator user ID'
                    },
                    role: {
                        bsonType: 'string',
                        enum: ['viewer', 'editor', 'manager', 'owner'],
                        description: 'Collaboration role'
                    },
                    added_date: {
                        bsonType: 'date',
                        description: 'Date when collaborator was added'
                    },
                    added_by: {
                        bsonType: 'string',
                        description: 'User who added the collaborator'
                    },
                    last_activity: {
                        bsonType: 'date',
                        description: 'Last activity timestamp'
                    },
                    permissions: {
                        bsonType: 'array',
                        description: 'Specific permissions'
                    }
                }
            }
        }
    });
    // Create plugin_data_preservation collection for backup/recovery
    await db.createCollection('plugin_data_preservation', {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['universe_id', 'plugin_id', 'preserved_date', 'data'],
                properties: {
                    universe_id: {
                        bsonType: 'string',
                        description: 'Universe identifier'
                    },
                    plugin_id: {
                        bsonType: 'string',
                        description: 'Plugin identifier'
                    },
                    plugin_name: {
                        bsonType: 'string',
                        description: 'Plugin name'
                    },
                    plugin_version: {
                        bsonType: 'string',
                        description: 'Plugin version'
                    },
                    preserved_date: {
                        bsonType: 'date',
                        description: 'Preservation timestamp'
                    },
                    preservation_reason: {
                        bsonType: 'string',
                        description: 'Reason for preservation'
                    },
                    data: {
                        bsonType: 'object',
                        description: 'Preserved plugin data'
                    },
                    recovery_metadata: {
                        bsonType: 'object',
                        description: 'Recovery metadata'
                    }
                }
            }
        }
    });
    // Create indexes for universes collection
    await db.collection('universes').createIndexes([
        {
            key: { id: 1 },
            unique: true,
            name: 'idx_universes_id'
        },
        {
            key: { owner_id: 1 },
            name: 'idx_universes_owner_id'
        },
        {
            key: { 'plugin_config.active_plugin': 1 },
            name: 'idx_universes_active_plugin'
        },
        {
            key: { 'plugin_config.sub_universe': 1 },
            name: 'idx_universes_sub_universe'
        },
        {
            key: { name: 1, owner_id: 1 },
            unique: true,
            name: 'idx_universes_name_owner_unique'
        },
        {
            key: { created_at: -1 },
            name: 'idx_universes_created_at_desc'
        },
        {
            key: { updated_at: -1 },
            name: 'idx_universes_updated_at_desc'
        },
        {
            key: { sync_token: 1 },
            name: 'idx_universes_sync_token'
        },
        {
            key: { 'settings.is_private': 1 },
            name: 'idx_universes_is_private'
        },
        {
            key: { name: 'text', description: 'text' },
            name: 'idx_universes_text_search'
        }
    ]);
    // Create indexes for universe_sync_events collection
    await db.collection('universe_sync_events').createIndexes([
        {
            key: { universe_id: 1, timestamp: -1 },
            name: 'idx_sync_events_universe_timestamp'
        },
        {
            key: { user_id: 1, timestamp: -1 },
            name: 'idx_sync_events_user_timestamp'
        },
        {
            key: { event_type: 1 },
            name: 'idx_sync_events_type'
        },
        {
            key: { sync_token: 1 },
            name: 'idx_sync_events_sync_token'
        },
        {
            key: { timestamp: 1 },
            expireAfterSeconds: 2592000, // 30 days
            name: 'idx_sync_events_ttl'
        }
    ]);
    // Create indexes for universe_collaborators collection
    await db.collection('universe_collaborators').createIndexes([
        {
            key: { universe_id: 1, user_id: 1 },
            unique: true,
            name: 'idx_collaborators_universe_user_unique'
        },
        {
            key: { universe_id: 1 },
            name: 'idx_collaborators_universe_id'
        },
        {
            key: { user_id: 1 },
            name: 'idx_collaborators_user_id'
        },
        {
            key: { role: 1 },
            name: 'idx_collaborators_role'
        },
        {
            key: { last_activity: -1 },
            name: 'idx_collaborators_last_activity'
        }
    ]);
    // Create indexes for plugin_data_preservation collection
    await db.collection('plugin_data_preservation').createIndexes([
        {
            key: { universe_id: 1, plugin_id: 1 },
            name: 'idx_preservation_universe_plugin'
        },
        {
            key: { universe_id: 1 },
            name: 'idx_preservation_universe_id'
        },
        {
            key: { plugin_id: 1 },
            name: 'idx_preservation_plugin_id'
        },
        {
            key: { preserved_date: -1 },
            name: 'idx_preservation_date'
        },
        {
            key: { preserved_date: 1 },
            expireAfterSeconds: 31536000, // 1 year
            name: 'idx_preservation_ttl'
        }
    ]);
    console.log('Universe management collections created successfully');
}
export async function down(db) {
    console.log('Dropping universe management collections...');
    // Drop collections
    await db.collection('universes').drop();
    await db.collection('universe_sync_events').drop();
    await db.collection('universe_collaborators').drop();
    await db.collection('plugin_data_preservation').drop();
    console.log('Universe management collections dropped successfully');
}
// Migration metadata
export const migrationInfo = {
    version: '20250620000000',
    description: 'Create Universe Management Collections',
    author: 'System',
    created_at: new Date('2025-06-20'),
    dependencies: ['20250608000000-add-locations-organizations.ts']
};
//# sourceMappingURL=20250620000000-create-universe-collections.js.map