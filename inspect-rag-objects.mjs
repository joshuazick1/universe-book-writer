import { MongoClient } from 'mongodb';

async function inspectRAG() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();

    const db = client.db('universe_book_writer');
    const collections = await db.listCollections().toArray();

    console.log('=== Available Collections ===');
    collections.forEach(col => console.log(`- ${col.name}`));

    // Check for RAG-related collections
    const ragCollections = collections.filter(col =>
        col.name.includes('rag') ||
        col.name.includes('nodes') ||
        col.name.includes('relationships') ||
        col.name.includes('embeddings')
    );

    console.log('\n=== RAG-Related Collections ===');
    for (const col of ragCollections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`\n${col.name}: ${count} documents`);

        // Sample a few documents to see structure
        const samples = await db.collection(col.name).find().limit(3).toArray();
        if (samples.length > 0) {
            console.log(`  Sample document keys:`, Object.keys(samples[0]));
            if (samples[0].type) {
                const types = await db.collection(col.name).distinct('type');
                console.log(`  Types found:`, types);
            }
            if (samples[0].nodeType) {
                const nodeTypes = await db.collection(col.name).distinct('nodeType');
                console.log(`  Node types:`, nodeTypes);
            }
            if (samples[0].category) {
                const categories = await db.collection(col.name).distinct('category');
                console.log(`  Categories:`, categories);
            }

            // Show a sample document (truncated)
            console.log(`  Sample document:`, JSON.stringify(samples[0], null, 2).substring(0, 300) + '...');
        }
    }

    // Check for specific problematic objects
    console.log('\n=== Checking for Custom/Legacy Objects ===');

    for (const col of ragCollections) {
        const collection = db.collection(col.name);

        // Look for objects that don't match expected RAG patterns
        const customObjects = await collection.find({
            $or: [
                { type: { $nin: ['model_performance', 'usage_stat', 'insight'] } },
                { nodeType: { $nin: ['model_performance', 'usage_stat', 'insight'] } },
                { category: { $exists: true, $nin: ['performance', 'usage', 'model'] } },
                { logicalId: { $exists: false } },
                { embedding: { $exists: false } }
            ]
        }).limit(10).toArray();

        if (customObjects.length > 0) {
            console.log(`\n  Custom/Legacy objects in ${col.name}:`);
            customObjects.forEach((obj, i) => {
                console.log(`    ${i + 1}. ID: ${obj._id}, Type: ${obj.type || obj.nodeType || 'unknown'}`);
                if (obj.logicalId) console.log(`       LogicalId: ${obj.logicalId}`);
                if (obj.category) console.log(`       Category: ${obj.category}`);
            });
        }
    }

    await client.close();
}

inspectRAG().catch(console.error);
