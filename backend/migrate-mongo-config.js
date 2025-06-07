// Migration configuration file
const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    databaseName: process.env.MONGODB_DB_NAME || 'universe_book_writer',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    },
  },
  migrationsDir: 'src/migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
  moduleSystem: 'esm',
};

module.exports = config;
