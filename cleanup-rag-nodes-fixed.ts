#!/usr/bin/env node
/**
 * Fixed Cleanup Script for RAG Nodes in verseforge_rag_dev
 * 
 * Now that we found the correct database, this script will:
 * 1. Analyze the actual node distribution
 * 2. Fix the nodeType field mapping 
 * 3. Remove duplicate nodes if any exist
 */

import { MongoClient } from 'mongodb';

interface NodeStats {
    total: number;
    byType: Record<string, number>;
    byNodeType: Record<string, number>;
    missingNodeType: number;
    duplicateIDs: Array<{ id: string, count: number }>;
}

async function analyzeRagNodes(): Promise<NodeStats> {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('verseforge_rag_dev');
        const collection = db.collection('rag_nodes');

        console.log('🔍 Analyzing RAG nodes in verseforge_rag_dev...');

        // Get total count
        const total = await collection.countDocuments();

        // Group by type field (RAG system field)
        const typeAggregation = await collection.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        // Group by nodeType field (Backend API field)
        const nodeTypeAggregation = await collection.aggregate([
            {
                $group: {
                    _id: '$nodeType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        // Count nodes without nodeType
        const missingNodeType = await collection.countDocuments({
            $or: [
                { nodeType: { $exists: false } },
                { nodeType: null },
                { nodeType: '' }
            ]
        });

        // Find duplicate logical IDs (not the generated _id)
        const duplicateAggregation = await collection.aggregate([
            {
                $group: {
                    _id: '$id',
                    count: { $sum: 1 },
                    docs: { $push: '$_id' }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        const byType: Record<string, number> = {};
        typeAggregation.forEach(item => {
            byType[item._id || 'null'] = item.count;
        });

        const byNodeType: Record<string, number> = {};
        nodeTypeAggregation.forEach(item => {
            byNodeType[item._id || 'null'] = item.count;
        });

        const duplicateIDs = duplicateAggregation.map(item => ({
            id: item._id,
            count: item.count
        }));

        return {
            total,
            byType,
            byNodeType,
            missingNodeType,
            duplicateIDs
        };

    } finally {
        await client.close();
    }
}

async function fixNodeTypeMapping(dryRun: boolean = true): Promise<number> {
    const client = new MongoClient('mongodb://localhost:27017');
    let updatedCount = 0;

    try {
        await client.connect();
        const db = client.db('verseforge_rag_dev');
        const collection = db.collection('rag_nodes');

        console.log(dryRun ? '🧪 DRY RUN: Checking nodeType mapping fixes...' : '🔧 Fixing nodeType field mapping...');

        // Find nodes with type but missing nodeType
        const nodesToFix = await collection.find({
            type: { $exists: true, $nin: [null, ''] },
            $or: [
                { nodeType: { $exists: false } },
                { nodeType: null },
                { nodeType: '' }
            ]
        }).toArray();

        console.log(`Found ${nodesToFix.length} nodes needing nodeType mapping`);

        if (!dryRun && nodesToFix.length > 0) {
            // Update nodes to set nodeType = type
            const bulkOps = nodesToFix.map(node => ({
                updateOne: {
                    filter: { _id: node._id },
                    update: { $set: { nodeType: node.type } }
                }
            }));

            const result = await collection.bulkWrite(bulkOps);
            updatedCount = result.modifiedCount;
            console.log(`✅ Updated ${updatedCount} nodes with nodeType field`);
        } else {
            updatedCount = nodesToFix.length;
            if (dryRun) {
                console.log(`Would update ${updatedCount} nodes to set nodeType = type`);

                // Show some examples
                const examples = nodesToFix.slice(0, 5);
                console.log('\nExamples of fixes that would be applied:');
                examples.forEach(node => {
                    console.log(`  ${node.id}: type="${node.type}" -> nodeType="${node.type}"`);
                });
            }
        }

        return updatedCount;

    } finally {
        await client.close();
    }
}

async function removeDuplicateNodes(dryRun: boolean = true): Promise<number> {
    const client = new MongoClient('mongodb://localhost:27017');
    let deletedCount = 0;

    try {
        await client.connect();
        const db = client.db('verseforge_rag_dev');
        const collection = db.collection('rag_nodes');

        console.log(dryRun ? '🧪 DRY RUN: Checking for duplicate nodes...' : '🗑️  Removing duplicate nodes...');

        // Find duplicate logical IDs
        const duplicateGroups = await collection.aggregate([
            {
                $group: {
                    _id: '$id',
                    docs: { $push: { _id: '$_id', created: '$timestamps.created' } },
                    count: { $sum: 1 }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Found ${duplicateGroups.length} groups of duplicate nodes`);

        for (const group of duplicateGroups) {
            // Sort by creation date and keep the newest, delete the rest
            const sortedDocs = group.docs.sort((a: any, b: any) => {
                const aDate = a.created ? new Date(a.created).getTime() : 0;
                const bDate = b.created ? new Date(b.created).getTime() : 0;
                return bDate - aDate;
            });

            const toDelete = sortedDocs.slice(1); // Keep first (newest), delete rest

            if (!dryRun && toDelete.length > 0) {
                const deleteIds = toDelete.map((doc: any) => doc._id);
                const result = await collection.deleteMany({
                    _id: { $in: deleteIds }
                });
                deletedCount += result.deletedCount;
            } else {
                deletedCount += toDelete.length;
                if (dryRun && toDelete.length > 0) {
                    console.log(`  Group "${group._id}": ${toDelete.length} duplicates would be removed`);
                }
            }
        }

        return deletedCount;

    } finally {
        await client.close();
    }
}

async function main() {
    console.log('🚀 Starting RAG Node Analysis & Cleanup (verseforge_rag_dev)\n');

    try {
        // Step 1: Analyze current state
        const stats = await analyzeRagNodes();

        console.log('📊 Current Node Statistics:');
        console.log(`   Total nodes: ${stats.total}`);
        console.log(`   Nodes with missing nodeType: ${stats.missingNodeType}`);

        console.log('\n📋 Nodes by RAG type field:');
        Object.entries(stats.byType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

        console.log('\n📋 Nodes by backend nodeType field:');
        Object.entries(stats.byNodeType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

        if (stats.duplicateIDs.length > 0) {
            console.log('\n🔁 Duplicate logical IDs found:');
            stats.duplicateIDs.slice(0, 5).forEach(dup => {
                console.log(`   ${dup.id}: ${dup.count} copies`);
            });
            if (stats.duplicateIDs.length > 5) {
                console.log(`   ... and ${stats.duplicateIDs.length - 5} more`);
            }
        }

        // Step 2: Dry run fixes
        console.log('\n🔧 Proposed Fixes:');
        const wouldUpdate = await fixNodeTypeMapping(true);
        const wouldDelete = await removeDuplicateNodes(true);

        console.log(`\n📋 Summary of proposed changes:`);
        console.log(`   - Update ${wouldUpdate} nodes with proper nodeType mapping`);
        console.log(`   - Remove ${wouldDelete} duplicate nodes`);
        console.log(`   - Expected final count: ${stats.total - wouldDelete} nodes`);

        // Step 3: Execute fixes if requested
        if (process.argv.includes('--execute')) {
            console.log('\n⚠️  EXECUTING FIXES (--execute flag detected)');

            const actuallyUpdated = await fixNodeTypeMapping(false);
            const actuallyDeleted = await removeDuplicateNodes(false);

            console.log(`✅ Cleanup completed:`);
            console.log(`   - Updated ${actuallyUpdated} nodes with nodeType mapping`);
            console.log(`   - Deleted ${actuallyDeleted} duplicate nodes`);

            // Re-analyze after cleanup
            const newStats = await analyzeRagNodes();
            console.log(`📈 Final counts:`);
            console.log(`   - Total nodes: ${newStats.total}`);
            console.log(`   - Missing nodeType: ${newStats.missingNodeType}`);
        } else {
            console.log('\n💡 To execute fixes, run with --execute flag');
            console.log('   Example: npx tsx cleanup-rag-nodes-fixed.ts --execute');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1]);

if (isMain) {
    main();
}
