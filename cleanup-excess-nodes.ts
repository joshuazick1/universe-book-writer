#!/usr/bin/env node
/**
 * Cleanup Script for Excess RAG Nodes
 * 
 * This script addresses the issue where thousands of nodes were created
 * without proper nodeType values due to a bug in the ModelPerformanceRAG service.
 */

import { MongoClient } from 'mongodb';

interface NodeStats {
    total: number;
    byType: Record<string, number>;
    withoutNodeType: number;
    duplicatePatterns: Record<string, number>;
}

async function analyzeNodes(): Promise<NodeStats> {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('universe_book_writer'); // Use the correct database
        const collection = db.collection('rag_nodes');

        console.log('🔍 Analyzing node distribution...');

        // Get total count
        const total = await collection.countDocuments();

        // Group by type field (from RAG nodes)
        const typeAggregation = await collection.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        // Count nodes without nodeType (backend field)
        const withoutNodeType = await collection.countDocuments({
            $or: [
                { nodeType: { $exists: false } },
                { nodeType: null },
                { nodeType: '' }
            ]
        });

        // Find duplicate patterns by checking ID prefixes
        const duplicateAggregation = await collection.aggregate([
            {
                $group: {
                    _id: { $substr: ['$id', 0, 20] }, // First 20 chars of ID
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        const byType: Record<string, number> = {};
        typeAggregation.forEach(item => {
            byType[item._id || 'null'] = item.count;
        });

        const duplicatePatterns: Record<string, number> = {};
        duplicateAggregation.forEach(item => {
            duplicatePatterns[item._id] = item.count;
        });

        return {
            total,
            byType,
            withoutNodeType,
            duplicatePatterns
        };

    } finally {
        await client.close();
    }
}

async function cleanupDuplicateNodes(dryRun: boolean = true): Promise<number> {
    const client = new MongoClient('mongodb://localhost:27017');
    let deletedCount = 0;

    try {
        await client.connect();
        const db = client.db('universe_book_writer'); // Use the correct database
        const collection = db.collection('rag_nodes');

        console.log(dryRun ? '🧪 DRY RUN: Analyzing what would be deleted...' : '🗑️  Cleaning up duplicate nodes...');

        // Find nodes with duplicate logical IDs (model:, server:, performance: patterns)
        const duplicateGroups = await collection.aggregate([
            {
                $match: {
                    id: { $regex: /^(model:|server:|performance:)/ }
                }
            },
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
            const sortedDocs = group.docs.sort((a: any, b: any) =>
                new Date(b.created).getTime() - new Date(a.created).getTime()
            );

            const toDelete = sortedDocs.slice(1); // Keep first (newest), delete rest

            if (!dryRun && toDelete.length > 0) {
                const deleteIds = toDelete.map((doc: any) => doc._id);
                const result = await collection.deleteMany({
                    _id: { $in: deleteIds }
                });
                deletedCount += result.deletedCount;
            } else {
                deletedCount += toDelete.length;
            }
        }

        // Also clean up nodes without proper type information
        if (!dryRun) {
            const emptyTypeResult = await collection.deleteMany({
                $or: [
                    { type: { $exists: false } },
                    { type: null },
                    { type: '' }
                ]
            });
            deletedCount += emptyTypeResult.deletedCount;
            console.log(`Deleted ${emptyTypeResult.deletedCount} nodes with missing type field`);
        } else {
            const emptyTypeCount = await collection.countDocuments({
                $or: [
                    { type: { $exists: false } },
                    { type: null },
                    { type: '' }
                ]
            });
            deletedCount += emptyTypeCount;
            console.log(`Would delete ${emptyTypeCount} nodes with missing type field`);
        }

        return deletedCount;

    } finally {
        await client.close();
    }
}

async function main() {
    console.log('🚀 Starting RAG Node Cleanup Analysis\n');

    try {
        // Step 1: Analyze current state
        const stats = await analyzeNodes();

        console.log('📊 Current Node Statistics:');
        console.log(`   Total nodes: ${stats.total}`);
        console.log(`   Nodes without nodeType: ${stats.withoutNodeType}`);
        console.log('\n📋 Nodes by type:');
        Object.entries(stats.byType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

        if (Object.keys(stats.duplicatePatterns).length > 0) {
            console.log('\n🔁 Potential duplicate patterns:');
            Object.entries(stats.duplicatePatterns).forEach(([pattern, count]) => {
                console.log(`   ${pattern}...: ${count} nodes`);
            });
        }

        // Step 2: Dry run cleanup
        const wouldDelete = await cleanupDuplicateNodes(true);
        console.log(`\n🧪 Cleanup would remove ${wouldDelete} duplicate/invalid nodes`);

        // Step 3: Ask for confirmation for actual cleanup
        if (process.argv.includes('--execute')) {
            console.log('\n⚠️  EXECUTING CLEANUP (--execute flag detected)');
            const actuallyDeleted = await cleanupDuplicateNodes(false);
            console.log(`✅ Cleanup completed: ${actuallyDeleted} nodes deleted`);

            // Re-analyze after cleanup
            const newStats = await analyzeNodes();
            console.log(`📈 Final count: ${newStats.total} nodes remaining`);
        } else {
            console.log('\n💡 To execute cleanup, run with --execute flag');
            console.log('   Example: npx tsx cleanup-excess-nodes.ts --execute');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run main function if this file is executed directly
main();
