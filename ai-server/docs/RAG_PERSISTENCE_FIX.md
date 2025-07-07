# RAG Data Persistence Configuration

## Problem Fixed
The RAG database was previously using in-memory storage for development, which meant all universes and characters were lost when the AI server restarted. This has been fixed by configuring the development environment to use persistent MongoDB storage.

## Current Configuration

### Development Environment (Default)
- **Storage**: MongoDB (persistent)
- **Database**: `verseforge_rag_dev`
- **Connection**: `mongodb://localhost:27017`
- **Persistence**: ✅ Data survives server restarts

### Production Environment  
- **Storage**: MongoDB (persistent)
- **Database**: `verseforge_rag`
- **Connection**: `mongodb://localhost:27017` (or `RAG_MONGODB_URI` env var)
- **Persistence**: ✅ Data survives server restarts

### Testing Environment
- **Storage**: In-memory (fast, not persistent)
- **Use case**: Unit tests, temporary testing
- **Persistence**: ❌ Data cleared on restart

## Environment Variables

You can configure the RAG storage using these environment variables:

```bash
# MongoDB connection string for RAG system
RAG_MONGODB_URI=mongodb://localhost:27017

# Set environment mode
NODE_ENV=development  # Uses verseforge_rag_dev database
NODE_ENV=production   # Uses verseforge_rag database  
NODE_ENV=test        # Uses in-memory storage
```

## File Location
Configuration is in: `ai-server/src/rag/adapters/index.ts`

## Testing Persistence

1. Start the AI server: `npm run dev`
2. Populate sample data: `POST /api/chat/populate-sample-data`
3. Verify data exists: `GET /api/chat/universes`
4. Restart the server
5. Verify data still exists: `GET /api/chat/universes`

## Character Chat Workflow

Now the complete workflow works with persistence:

1. **Create Universe** → Stored in MongoDB RAG database
2. **Create Character** → Stored in MongoDB RAG database  
3. **Navigate to Chat** → Lists real universes/characters from database
4. **Server Restart** → All data persists ✅
5. **Continue Chatting** → Same universes/characters available

## Database Collections

RAG data is stored in MongoDB collections:
- `rag_nodes` - Stores universes, characters, and other entities
- `rag_relationships` - Stores connections between entities
- `rag_metadata` - Stores system metadata

## Migration Notes

- Existing in-memory data was lost during this change
- Users may need to repopulate sample data once
- Production deployments should set `RAG_MONGODB_URI` environment variable
