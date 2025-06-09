/**
 * Test script to verify the Road to the Stars seeding data
 * 
 * This script connects to the database and runs verification checks
 * to ensure all data was seeded correctly.
 */

import { MongoClient } from 'mongodb';

interface VerificationResult {
  collection: string;
  expected: number;
  actual: number;
  passed: boolean;
  details?: string[];
}

/**
 * Run verification checks on seeded data
 */
export async function verifyRoadToStarsSeeding(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/universe-book-writer');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Verifying "The Road to the Stars" seeding data...\n');
    
    const results: VerificationResult[] = [];
    
    // Verify collections exist and have expected counts
    results.push(await verifyCollection(db, 'users', 1, 'Should have author user'));
    results.push(await verifyCollection(db, 'universes', 1, 'Should have United Republic of Planets universe'));
    results.push(await verifyCollection(db, 'characters', 11, 'Should have all main characters'));
    results.push(await verifyCollection(db, 'locations', 8, 'Should have all story locations'));
    results.push(await verifyCollection(db, 'organizations', 6, 'Should have all organizations'));
    results.push(await verifyCollection(db, 'books', 1, 'Should have The Road to the Stars book'));
    
    // Verify specific data integrity
    results.push(await verifyUniverse(db));
    results.push(await verifyCharacters(db));
    results.push(await verifyLocations(db));
    results.push(await verifyBook(db));
    results.push(await verifyRelationships(db));
    
    // Print results
    console.log('📊 Verification Results:\n');
    let totalPassed = 0;
    let totalTests = results.length;
    
    for (const result of results) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.collection}: ${result.actual}/${result.expected} ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (result.details && result.details.length > 0) {
        result.details.forEach(detail => console.log(`   - ${detail}`));
      }
      
      if (result.passed) totalPassed++;
    }
    
    console.log(`\n🎯 Overall Results: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All verification tests passed! Seeding was successful.');
    } else {
      console.log('⚠️  Some verification tests failed. Please check the data.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Verify collection count
 */
async function verifyCollection(db: any, collectionName: string, expectedCount: number, description: string): Promise<VerificationResult> {
  const actualCount = await db.collection(collectionName).countDocuments();
  
  return {
    collection: collectionName,
    expected: expectedCount,
    actual: actualCount,
    passed: actualCount === expectedCount,
    details: actualCount !== expectedCount ? [description] : undefined,
  };
}

/**
 * Verify universe data
 */
async function verifyUniverse(db: any): Promise<VerificationResult> {
  const universe = await db.collection('universes').findOne({name: 'United Republic of Planets'});
  const details: string[] = [];
  let passed = true;
  
  if (!universe) {
    passed = false;
    details.push('United Republic of Planets universe not found');
  } else {
    if (!universe.description.includes('Star Trek-inspired')) {
      details.push('Universe description missing key content');
      passed = false;
    }
    
    if (!universe.timelines || universe.timelines.length === 0) {
      details.push('Universe missing timeline data');
      passed = false;
    } else {
      const mainTimeline = universe.timelines.find((t: any) => t.name === 'Main Timeline');
      if (!mainTimeline || mainTimeline.events.length < 4) {
        details.push('Main timeline missing or incomplete');
        passed = false;
      }
    }
  }
  
  return {
    collection: 'universe-validation',
    expected: 1,
    actual: passed ? 1 : 0,
    passed,
    details,
  };
}

/**
 * Verify character data
 */
async function verifyCharacters(db: any): Promise<VerificationResult> {
  const characters = await db.collection('characters').find({}).toArray();
  const details: string[] = [];
  let passed = true;
  
  // Check for key characters
  const keyCharacters = [
    'James Calloway',
    'Thara zh\'Shiron', 
    'Jorrek Ven',
    'Sovek',
    'The Narrator'
  ];
  
  for (const name of keyCharacters) {
    const char = characters.find((c: any) => c.name === name);
    if (!char) {
      details.push(`Missing character: ${name}`);
      passed = false;
    } else {
      // Verify character has required fields
      if (!char.species && name !== 'The Narrator') {
        details.push(`${name} missing species`);
        passed = false;
      }
      if (!char.assignment && name !== 'The Narrator') {
        details.push(`${name} missing assignment`);
        passed = false;
      }
    }
  }
  
  // Verify species distribution
  const speciesCounts = characters.reduce((acc: any, char: any) => {
    const species = char.species || 'Unknown';
    acc[species] = (acc[species] || 0) + 1;
    return acc;
  }, {});
  
  const expectedSpecies = ['Human', 'Vulcan', 'Andorian', 'Tellarite'];
  for (const species of expectedSpecies) {
    if (!speciesCounts[species]) {
      details.push(`Missing characters of species: ${species}`);
      passed = false;
    }
  }
  
  return {
    collection: 'character-validation',
    expected: 1,
    actual: passed ? 1 : 0,
    passed,
    details,
  };
}

/**
 * Verify location data
 */
async function verifyLocations(db: any): Promise<VerificationResult> {
  const locations = await db.collection('locations').find({}).toArray();
  const details: string[] = [];
  let passed = true;
  
  // Check for key locations
  const keyLocations = [
    'USS Vash\'Tel',
    'Vulcan',
    'Galactic Republic Starfleet Academy',
    'P\'Jem Monastery'
  ];
  
  for (const name of keyLocations) {
    const loc = locations.find((l: any) => l.name === name);
    if (!loc) {
      details.push(`Missing location: ${name}`);
      passed = false;
    }
  }
  
  // Verify ship details
  const vashtel = locations.find((l: any) => l.name === 'USS Vash\'Tel');
  if (vashtel) {
    if (!vashtel.metadata || !vashtel.metadata.design) {
      details.push('Vash\'Tel missing design metadata');
      passed = false;
    }
  }
  
  return {
    collection: 'location-validation',
    expected: 1,
    actual: passed ? 1 : 0,
    passed,
    details,
  };
}

/**
 * Verify book data
 */
async function verifyBook(db: any): Promise<VerificationResult> {
  const book = await db.collection('books').findOne({title: 'The Road to the Stars'});
  const details: string[] = [];
  let passed = true;
  
  if (!book) {
    passed = false;
    details.push('The Road to the Stars book not found');
  } else {
    if (!book.chapters || book.chapters.length !== 5) {
      details.push(`Expected 5 chapters, found ${book.chapters?.length || 0}`);
      passed = false;
    }
    
    if (!book.synopsis || book.synopsis.length < 100) {
      details.push('Book synopsis missing or too short');
      passed = false;
    }
    
    // Check chapter content
    if (book.chapters) {
      for (let i = 0; i < book.chapters.length; i++) {
        const chapter = book.chapters[i];
        if (!chapter.title || !chapter.content) {
          details.push(`Chapter ${i + 1} missing title or content`);
          passed = false;
        }
        if (!chapter.characters || chapter.characters.length === 0) {
          details.push(`Chapter ${i + 1} missing character references`);
          passed = false;
        }
      }
    }
  }
  
  return {
    collection: 'book-validation',
    expected: 1,
    actual: passed ? 1 : 0,
    passed,
    details,
  };
}

/**
 * Verify relationship data
 */
async function verifyRelationships(db: any): Promise<VerificationResult> {
  const characters = await db.collection('characters').find({}).toArray();
  const details: string[] = [];
  let passed = true;
  
  // Check that James Calloway has relationship with Thara zh'Shiron
  const calloway = characters.find((c: any) => c.name === 'James Calloway');
  if (calloway && calloway.relationships) {
    const hasFirstOfficer = calloway.relationships.some((r: any) => r.type === 'first_officer');
    if (!hasFirstOfficer) {
      details.push('James Calloway missing first officer relationship');
      passed = false;
    }
  } else {
    details.push('James Calloway missing relationships');
    passed = false;
  }
  
  // Check for some relationship types
  const relationshipTypes = characters
    .flatMap((c: any) => c.relationships || [])
    .map((r: any) => r.type);
  
  if (!relationshipTypes.includes('commanding_officer')) {
    details.push('Missing commanding_officer relationship type');
    passed = false;
  }
  
  return {
    collection: 'relationship-validation',
    expected: 1,
    actual: passed ? 1 : 0,
    passed,
    details,
  };
}

/**
 * Main execution function
 */
if (require.main === module) {
  verifyRoadToStarsSeeding()
    .then(() => {
      console.log('\n✅ Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error);
      process.exit(1);
    });
}
