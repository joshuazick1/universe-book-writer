# RAG (Retrieval-Augmented Generation) System

The RAG system is the knowledge graph and context assembly foundation for the Multi-Universe Book Series Writing Assistant. It provides intelligent content retrieval, multi-layer summarization, and context-aware assistance for writers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG System Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   API Layer │    │ Context     │    │ Encryption  │     │
│  │  (Routes)   │◄──►│ Assembly    │◄──►│ Services    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Storage   │    │ Knowledge   │    │   Plugin    │     │
│  │  Services   │◄──►│   Graph     │◄──►│  Hooks      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Hybrid Storage Backend                   │   │
│  │  ┌─────────────┐           ┌─────────────┐        │   │
│  │  │ RAG Backend │◄─────────►│ DB Index    │        │   │
│  │  │(Authoritative)         │(Performance) │        │   │
│  │  └─────────────┘           └─────────────┘        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 🌐 Multi-Layer Context Assembly
- **Distance-based summarization**: More detailed content for closer relationships
- **Token budget optimization**: Automatic content prioritization within LLM limits
- **Relevance scoring**: Smart ranking of context importance
- **Path tracking**: Understanding how nodes relate through the knowledge graph

### 🔐 Modular Encryption System
- **Hierarchical key management**: Universe → Node/Relationship → Content hierarchy
- **Multiple encryption strategies**: AES-GCM, ChaCha20-Poly1305 support
- **Content classification**: Public, private, sensitive, restricted levels
- **Searchable encryption**: Encrypted content that remains queryable

### 🔌 Plugin-Extensible Architecture
- **Universe-specific logic**: Star Trek, Star Wars, custom universes via plugins
- **Type system extensions**: Custom node and relationship types
- **Validation hooks**: Universe-specific content validation
- **Theme integration**: Visual customization per universe

### 🏢 Hybrid Storage Strategy
- **Authoritative RAG backend**: Primary source of truth for graph data
- **Performance database index**: Fast lookups and filtering
- **Automatic synchronization**: Write-through caching with consistency
- **Flexible backends**: Support for multiple vector databases and storage systems

## Implementation Status

### ✅ Completed Components

#### Core Types (`src/rag/core/types.ts`)
- Complete RAG node and relationship type definitions
- Context request/response interfaces
- Search and filter specifications
- Plugin integration types
- Encryption metadata types

#### Node Management (`src/rag/core/node.ts`)
- Node creation, validation, and updates
- Automatic summarization generation
- Timeline and metadata management
- Content versioning support

#### Relationship Management (`src/rag/core/relationship.ts`)
- Relationship creation and validation
- Bidirectional relationship support
- Strength-based connections
- Plugin-specific relationship types

#### Encryption Services (`src/rag/encryption/`)
- **Base Encryption Service**: Pluggable encryption strategies
- **RAG Encryption Services**: Specialized encryption for nodes, relationships, timelines, vectors
- **Hierarchical Key Management**: Universe-based key derivation
- **Content Classification**: Automatic sensitivity detection

#### Context Assembly (`src/rag/services/context-assembly.service.ts`)
- Multi-layer graph traversal with distance limits
- Automatic summarization based on context distance
- Token budget management and optimization
- Relevance scoring and content prioritization
- Cache management for performance

#### Storage Services (`src/rag/services/storage.service.ts`)
- Hybrid storage interface with write-through caching
- Fast database indexing for performance
- Search and filtering capabilities
- Universe-partitioned data management

#### API Routes (`src/rag/routes/rag.routes.ts`)
- RESTful endpoints for nodes and relationships
- Context assembly endpoints
- Search and discovery APIs
- Universe management endpoints
- Health checks and status monitoring

### 🚧 Pending Implementation

#### Storage Backends
- MongoDB adapter implementation
- Vector database adapters (FAISS, Pinecone, Weaviate)
- File system backend for development
- Redis caching layer

#### Plugin System
- Plugin SDK and interface definitions
- Universe-specific plugin implementations
- Theme and customization system
- Plugin lifecycle management

#### Advanced Features
- Real-time collaboration integration
- Timeline visualization components
- Advanced search algorithms
- ML-powered content suggestions

## Quick Start

### Installation

```bash
cd ai-server
npm install
```

### Basic Usage

```typescript
import { 
    RAGStorageService, 
    RAGContextAssemblyService, 
    createRAGRouter 
} from './src/rag/index.js';

// Create storage service (requires backend implementation)
const storageService = new RAGStorageService(ragBackend, dbIndex);

// Create context assembly service
const contextService = new RAGContextAssemblyService(storageService);

// Create API router
const ragRouter = createRAGRouter(storageService, contextService);

// Mount in Express app
app.use('/api/rag', ragRouter);
```

### API Examples

#### Create a Character Node
```bash
POST /api/rag/nodes
{
  "type": "character",
  "content": {
    "description": "Wise Jedi Master with green skin and ancient wisdom",
    "attributes": {
      "species": "Unknown",
      "homeworld": "Dagobah",
      "lightsaber": "green"
    }
  },
  "metadata": {
    "universeId": "star-wars",
    "title": "Yoda"
  }
}
```

#### Get Context for Writing
```bash
POST /api/rag/context
{
  "focalNodeId": "yoda-character-id",
  "maxDistance": 3,
  "maxTokens": 4000,
  "strategy": "comprehensive"
}
```

#### Search Knowledge Graph
```bash
POST /api/rag/search
{
  "query": "Force-sensitive characters",
  "filters": {
    "universeId": "star-wars",
    "nodeTypes": ["character"]
  },
  "userId": "writer-id"
}
```

## Configuration

### Environment Variables
```bash
# Encryption settings
RAG_ENCRYPTION_ENABLED=true
RAG_MASTER_KEY=your-encryption-key
RAG_KEY_DERIVATION_SALT=your-salt

# Storage settings
RAG_MONGODB_URL=mongodb://localhost:27017/rag-db
RAG_VECTOR_DB_TYPE=faiss
RAG_VECTOR_DB_PATH=/path/to/vector/index

# Performance settings
RAG_CACHE_SIZE=1000
RAG_CACHE_TTL=300000
RAG_MAX_CONTEXT_TOKENS=8000
```

### Plugin Configuration
```json
{
  "plugins": [
    {
      "name": "star-wars-plugin",
      "enabled": true,
      "config": {
        "timeline": "BBY/ABY",
        "forceSystem": true
      }
    }
  ]
}
```

## Development

### Running Tests
```bash
npm run test:ai-server
npm run test:coverage
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Performance Considerations

- **Caching Strategy**: Context assembly results are cached for 5 minutes by default
- **Token Budget**: Automatic content truncation to stay within LLM token limits
- **Lazy Loading**: Node content loaded on-demand during context assembly
- **Index Optimization**: Database indexes for fast universe and tag filtering
- **Batch Operations**: Bulk node/relationship operations for efficiency

## Security

- **Encryption at Rest**: All sensitive content encrypted with AES-GCM
- **Key Hierarchy**: Universe-scoped keys prevent cross-contamination
- **Access Control**: User-based permissions on nodes and relationships
- **Audit Trail**: All operations logged for security monitoring

## Future Enhancements

- **Vector Similarity Search**: Semantic search using embeddings
- **Auto-summarization**: AI-powered content summarization
- **Relationship Inference**: ML-based relationship discovery
- **Collaborative Editing**: Real-time multi-user knowledge graph editing
- **Version Control**: Git-like versioning for content changes
- **Export/Import**: Knowledge graph backup and migration tools

## Support

For questions and issues related to the RAG system:

1. Check the [API documentation](./api-docs.md)
2. Review [test examples](../../tests/rag/)
3. See [troubleshooting guide](./troubleshooting.md)
4. File issues in the project repository
