#!/usr/bin/env node
/**
 * Comprehensive Database Search Script
 * 
 * Searches through all MongoDB databases and collections to find where
 * the nodes with missing nodeType are actually stored.
 */

import { MongoClient } from 'mongodb';

interface CollectionInfo {
    database: string;
    collection: string;
    totalDocs: number;
    sampleDoc?: any;
    nodeTypeStats?: Record<string, number>;
    hasNodeTypeField?: boolean;
    hasTypeField?: boolean;
}

async function searchAllDatabases(): Promise<CollectionInfo[]> {
    const client = new MongoClient('mongodb://localhost:27017');
    const results: CollectionInfo[] = [];

    try {
        await client.connect();
        console.log('🔍 Connected to MongoDB, searching all databases...\n');

        // Get list of all databases
        const adminDb = client.db().admin();
        const databases = await adminDb.listDatabases();

        console.log(`Found ${databases.databases.length} databases:`);
        databases.databases.forEach(db => {
            const sizeInfo = db.sizeOnDisk ? `(${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)` : '';
            console.log(`  - ${db.name} ${sizeInfo}`);
        });
        console.log();

        // Search each database
        for (const dbInfo of databases.databases) {
            const dbName = dbInfo.name;

            // Skip system databases
            if (['admin', 'config', 'local'].includes(dbName)) {
                continue;
            }

            console.log(`🔍 Searching database: ${dbName}`);
            const db = client.db(dbName);

            try {
                // Get all collections in this database
                const collections = await db.listCollections().toArray();

                for (const collInfo of collections) {
                    const collName = collInfo.name;
                    const collection = db.collection(collName);

                    try {
                        // Get total document count
                        const totalDocs = await collection.countDocuments();

                        if (totalDocs === 0) {
                            continue; // Skip empty collections
                        }

                        console.log(`  📁 ${collName}: ${totalDocs} documents`);

                        // Get a sample document to analyze structure
                        const sampleDoc = await collection.findOne();

                        // Check if this collection has node-like documents
                        const hasNodeTypeField = sampleDoc && 'nodeType' in sampleDoc;
                        const hasTypeField = sampleDoc && 'type' in sampleDoc;
                        const hasNodeId = sampleDoc && ('nodeId' in sampleDoc || 'id' in sampleDoc);
                        const hasTitle = sampleDoc && 'title' in sampleDoc;

                        // If this looks like a node collection, analyze it further
                        let nodeTypeStats: Record<string, number> | undefined;

                        if (hasNodeTypeField || hasTypeField || (hasNodeId && hasTitle)) {
                            console.log(`    🎯 Potential node collection detected!`);

                            // Analyze nodeType distribution
                            if (hasNodeTypeField) {
                                const typeAggregation = await collection.aggregate([
                                    {
                                        $group: {
                                            _id: '$nodeType',
                                            count: { $sum: 1 }
                                        }
                                    },
                                    { $sort: { count: -1 } }
                                ]).toArray();

                                nodeTypeStats = {};
                                typeAggregation.forEach(item => {
                                    nodeTypeStats![item._id || 'null/empty'] = item.count;
                                });

                                console.log(`    📊 nodeType distribution:`, nodeTypeStats);
                            }

                            // Check for missing nodeType
                            if (hasNodeTypeField) {
                                const missingNodeType = await collection.countDocuments({
                                    $or: [
                                        { nodeType: { $exists: false } },
                                        { nodeType: null },
                                        { nodeType: '' }
                                    ]
                                });

                                if (missingNodeType > 0) {
                                    console.log(`    ⚠️  ${missingNodeType} documents with missing/empty nodeType`);
                                }
                            }

                            // Check for type field if nodeType doesn't exist
                            if (!hasNodeTypeField && hasTypeField) {
                                const typeAggregation = await collection.aggregate([
                                    {
                                        $group: {
                                            _id: '$type',
                                            count: { $sum: 1 }
                                        }
                                    },
                                    { $sort: { count: -1 } }
                                ]).toArray();

                                const typeStats: Record<string, number> = {};
                                typeAggregation.forEach(item => {
                                    typeStats[item._id || 'null/empty'] = item.count;
                                });

                                console.log(`    📊 type field distribution:`, typeStats);
                            }
                        }

                        results.push({
                            database: dbName,
                            collection: collName,
                            totalDocs,
                            sampleDoc,
                            nodeTypeStats,
                            hasNodeTypeField: hasNodeTypeField || false,
                            hasTypeField: hasTypeField || false
                        });

                    } catch (error) {
                        console.log(`    ❌ Error analyzing ${collName}:`, error);
                    }
                }
            } catch (error) {
                console.log(`  ❌ Error accessing database ${dbName}:`, error);
            }

            console.log(); // Add spacing between databases
        }

        return results;

    } finally {
        await client.close();
    }
}

async function findLargestNodeCollections(results: CollectionInfo[]): Promise<void> {
    console.log('\n🎯 ANALYSIS: Largest Collections (potential node stores)\n');

    // Sort by document count and show top collections
    const sorted = results
        .filter(r => r.totalDocs > 0)
        .sort((a, b) => b.totalDocs - a.totalDocs)
        .slice(0, 10);

    console.log('Top 10 largest collections:');
    sorted.forEach((item, index) => {
        console.log(`${index + 1}. ${item.database}.${item.collection}: ${item.totalDocs} docs`);

        if (item.hasNodeTypeField || item.hasTypeField) {
            console.log(`   🎯 Has node fields! nodeType: ${item.hasNodeTypeField}, type: ${item.hasTypeField}`);
        }

        if (item.nodeTypeStats) {
            const emptyNodeTypes = item.nodeTypeStats['null/empty'] || 0;
            if (emptyNodeTypes > 0) {
                console.log(`   ⚠️  ${emptyNodeTypes} documents with missing nodeType`);
            }
        }

        if (item.sampleDoc) {
            const keys = Object.keys(item.sampleDoc).slice(0, 8);
            console.log(`   📋 Sample fields: ${keys.join(', ')}${keys.length === 8 ? '...' : ''}`);
        }
        console.log();
    });
}

async function findNodeTypeIssues(results: CollectionInfo[]): Promise<void> {
    console.log('\n⚠️  ANALYSIS: Collections with Missing NodeType Issues\n');

    const problematic = results.filter(r =>
        r.nodeTypeStats && r.nodeTypeStats['null/empty'] > 0
    );

    if (problematic.length === 0) {
        console.log('✅ No collections found with missing nodeType issues');
        return;
    }

    problematic.forEach(item => {
        const emptyCount = item.nodeTypeStats!['null/empty'];
        const totalCount = item.totalDocs;
        const percentage = ((emptyCount / totalCount) * 100).toFixed(1);

        console.log(`❌ ${item.database}.${item.collection}:`);
        console.log(`   ${emptyCount}/${totalCount} documents (${percentage}%) with missing nodeType`);

        if (item.nodeTypeStats) {
            console.log('   Distribution:', item.nodeTypeStats);
        }
        console.log();
    });
}

async function main() {
    console.log('🚀 Starting comprehensive database search...\n');

    try {
        const results = await searchAllDatabases();

        await findLargestNodeCollections(results);
        await findNodeTypeIssues(results);

        // Summary
        const totalCollections = results.length;
        const totalDocs = results.reduce((sum, r) => sum + r.totalDocs, 0);
        const nodeCollections = results.filter(r => r.hasNodeTypeField || r.hasTypeField).length;

        console.log('\n📊 SUMMARY:');
        console.log(`   Total collections scanned: ${totalCollections}`);
        console.log(`   Total documents found: ${totalDocs}`);
        console.log(`   Collections with node-like fields: ${nodeCollections}`);

        console.log('\n💡 Next steps:');
        console.log('   1. Check the largest collections for your missing nodes');
        console.log('   2. Look for collections with both "type" and missing "nodeType" fields');
        console.log('   3. The backend API might be using a different collection name');

    } catch (error) {
        console.error('❌ Error during database search:', error);
        process.exit(1);
    }
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1]);

if (isMain) {
    main();
}
