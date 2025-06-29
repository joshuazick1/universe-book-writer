/**
 * Custom TypeScript Migration Runner
 * 
 * Handles running TypeScript migrations for the Universe Book Writer backend.
 * Uses MongoDB native driver and provides logging and error handling.
 */

import { MongoClient, Db } from 'mongodb';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    databaseName: process.env.MONGODB_DB_NAME || 'universe_book_writer'
  },
  migrationsDir: path.join(__dirname, '..', 'src', 'migrations'),
  changelogCollection: 'migration_changelog'
};

interface MigrationRecord {
  version: string;
  description: string;
  appliedAt: Date;
  success: boolean;
  error?: string;
}

interface Migration {
  version: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

class MigrationRunner {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(config.mongodb.url);
      await this.client.connect();
      this.db = this.client.db(config.mongodb.databaseName);
      console.log(`Connected to database: ${config.mongodb.databaseName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    if (!this.db) throw new Error('Database not connected');
    
    const records = await this.db
      .collection<MigrationRecord>(config.changelogCollection)
      .find({ success: true })
      .sort({ appliedAt: 1 })
      .toArray();
    
    return records.map(record => record.version);
  }

  async recordMigration(version: string, description: string, success: boolean, error?: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    await this.db.collection<MigrationRecord>(config.changelogCollection).insertOne({
      version,
      description,
      appliedAt: new Date(),
      success,
      error
    });
  }

  async loadMigrations(): Promise<Migration[]> {
    const migrationFiles = await readdir(config.migrationsDir);
    const tsFiles = migrationFiles
      .filter(file => file.endsWith('.ts'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of tsFiles) {
      try {
        const filePath = path.join(config.migrationsDir, file);
        const migrationModule = await import(filePath);
        
        const version = file.replace('.ts', '');
        const migration: Migration = {
          version,
          description: migrationModule.migrationInfo?.description || version,
          up: migrationModule.up,
          down: migrationModule.down
        };
        
        migrations.push(migration);
        console.log(`Loaded migration: ${version} - ${migration.description}`);
      } catch (error) {
        console.error(`Failed to load migration ${file}:`, error);
        throw error;
      }
    }

    return migrations;
  }

  async runUp(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    console.log('Running migrations up...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration: ${migration.version} - ${migration.description}`);
        await migration.up(this.db);
        await this.recordMigration(migration.version, migration.description, true);
        console.log(`✅ Successfully applied: ${migration.version}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to apply migration ${migration.version}:`, error);
        await this.recordMigration(migration.version, migration.description, false, errorMessage);
        throw error;
      }
    }

    console.log('All migrations completed successfully!');
  }

  async runDown(targetVersion?: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    console.log('Running migrations down...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();
    
    let migrationsToRevert = allMigrations.filter(
      migration => appliedMigrations.includes(migration.version)
    ).reverse(); // Reverse order for rollback

    if (targetVersion) {
      const targetIndex = migrationsToRevert.findIndex(m => m.version === targetVersion);
      if (targetIndex === -1) {
        throw new Error(`Target migration version ${targetVersion} not found`);
      }
      migrationsToRevert = migrationsToRevert.slice(0, targetIndex + 1);
    } else {
      // Only revert the last migration if no target specified
      migrationsToRevert = migrationsToRevert.slice(0, 1);
    }

    if (migrationsToRevert.length === 0) {
      console.log('No migrations to revert');
      return;
    }

    console.log(`Found ${migrationsToRevert.length} migrations to revert`);

    for (const migration of migrationsToRevert) {
      try {
        console.log(`Reverting migration: ${migration.version} - ${migration.description}`);
        await migration.down(this.db);
        
        // Remove from changelog
        await this.db.collection(config.changelogCollection).deleteMany({
          version: migration.version
        });
        
        console.log(`✅ Successfully reverted: ${migration.version}`);
      } catch (error) {
        console.error(`❌ Failed to revert migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log('Migration rollback completed successfully!');
  }

  async getStatus(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    console.log('Migration Status:');
    console.log('================');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();
    
    console.log(`Database: ${config.mongodb.databaseName}`);
    console.log(`Total migrations: ${allMigrations.length}`);
    console.log(`Applied migrations: ${appliedMigrations.length}`);
    console.log(`Pending migrations: ${allMigrations.length - appliedMigrations.length}`);
    console.log('');
    
    console.log('Migration Details:');
    console.log('------------------');
    
    for (const migration of allMigrations) {
      const isApplied = appliedMigrations.includes(migration.version);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`${status} | ${migration.version} - ${migration.description}`);
    }
    
    // Show recent migration history
    const recentRecords = await this.db
      .collection<MigrationRecord>(config.changelogCollection)
      .find()
      .sort({ appliedAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentRecords.length > 0) {
      console.log('');
      console.log('Recent Migration History:');
      console.log('------------------------');
      
      for (const record of recentRecords) {
        const status = record.success ? '✅' : '❌';
        const date = record.appliedAt.toISOString().split('T')[0];
        const time = record.appliedAt.toISOString().split('T')[1].split('.')[0];
        console.log(`${status} ${record.version} | ${date} ${time} | ${record.description}`);
        if (!record.success && record.error) {
          console.log(`   Error: ${record.error}`);
        }
      }
    }
  }
}

async function main() {
  const command = process.argv[2];
  const targetVersion = process.argv[3];

  if (!command || !['up', 'down', 'status'].includes(command)) {
    console.error('Usage: node migrate-runner.js <up|down|status> [target-version]');
    console.error('');
    console.error('Commands:');
    console.error('  up               - Apply all pending migrations');
    console.error('  down             - Revert the last migration');
    console.error('  down <version>   - Revert to specific migration version');
    console.error('  status           - Show migration status');
    process.exit(1);
  }

  const runner = new MigrationRunner();

  try {
    await runner.connect();

    switch (command) {
      case 'up':
        await runner.runUp();
        break;
      case 'down':
        await runner.runDown(targetVersion);
        break;
      case 'status':
        await runner.getStatus();
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
