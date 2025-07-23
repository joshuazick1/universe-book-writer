# RAG Encrypted Update System

## Overview

The RAG Encrypted Update System provides comprehensive encryption and tracking for all updates to private content in the RAG knowledge graph. This system ensures that sensitive content changes are protected while maintaining full audit trails and version history capabilities.

## Key Features

### 🔐 Automatic Encryption
- **Private Content Detection**: Automatically identifies content flagged as private/sensitive
- **Hierarchical Encryption**: Uses universe-scoped key hierarchies for optimal security
- **Selective Encryption**: Only encrypts updates to content marked as private
- **Integrity Protection**: Hash verification for all encrypted updates

### 📚 Version History
- **Complete Audit Trail**: Every change to private content is tracked and encrypted
- **Rollback Capabilities**: Secure rollback to any previous version
- **Change Granularity**: Track field-level changes with diff information
- **Batch Operations**: Atomic transactions for multiple related updates

### 🚀 Performance Optimized
- **Encryption Time Tracking**: Monitor performance impact of encryption
- **Storage Optimization**: Efficient storage of encrypted update history
- **Index-Based Queries**: Fast access to update history through database indexes
- **Cleanup Policies**: Automated cleanup of old updates based on retention policies

## Architecture

### Core Components

1. **RAGUpdateEncryptionService**: Handles encryption/decryption of update data
2. **RAGUpdateStorageService**: Manages persistent storage and retrieval
3. **RAGStorageService**: Integrated update tracking in main storage operations
4. **Update API Routes**: RESTful endpoints for managing update history

### Data Flow

```
Private Content Update → Encryption → Storage → Indexing → API Access
                   ↓
              Audit Trail → Version History → Rollback Capability
```

### Encryption Strategy

- **Update-Level Keys**: Each update gets its own derived encryption key
- **Batch-Level Keys**: Batch operations use shared batch encryption keys
- **Content Classification**: Automatic detection of sensitivity levels
- **Access Control**: User-based permissions for viewing encrypted history

## API Endpoints

### Update History

```http
GET /api/rag/updates/history/:nodeId
```
Get complete update history for a specific node.

**Parameters:**
- `nodeId`: ID of the node to get history for
- `limit`: Maximum number of updates to return (default: 50)

**Response:**
```json
{
  "nodeId": "node-123",
  "history": [
    {
      "id": "update-456",
      "operation": "update",
      "version": 3,
      "timestamp": "2025-07-02T10:30:00Z",
      "description": "Updated character description",
      "isPrivate": true,
      "changes": {
        "modifiedFields": ["content.description"],
        "previousValues": {...},
        "newValues": {...}
      }
    }
  ],
  "total": 5
}
```

### Universe History Query

```http
GET /api/rag/updates/universe/:universeId
```
Query update history across an entire universe with filtering.

**Query Parameters:**
- `user_id`: Filter by specific user
- `start_date`, `end_date`: Time range filter
- `operations`: Comma-separated list of operations (create,update,delete,restore)
- `private_only`: Show only private/encrypted updates
- `limit`, `offset`: Pagination
- `sort_by`, `sort_order`: Sorting options

### Node Rollback

```http
POST /api/rag/updates/rollback/:nodeId
```
Rollback a node to a previous version.

**Request Body:**
```json
{
  "targetVersion": 2,
  "reason": "Reverted accidental deletion of key plot point"
}
```

### Batch Transactions

```http
POST /api/rag/updates/transaction
```
Create an atomic transaction for multiple updates.

**Request Body:**
```json
{
  "universeId": "universe-123",
  "description": "Major character arc revision"
}
```

### Update Statistics

```http
GET /api/rag/updates/statistics/:universeId
```
Get comprehensive statistics about updates in a universe.

**Response:**
```json
{
  "universeId": "universe-123",
  "statistics": {
    "totalUpdates": 1250,
    "encryptedUpdates": 487,
    "updatesByOperation": {
      "create": 300,
      "update": 850,
      "delete": 75,
      "restore": 25
    },
    "avgUpdatesPerDay": 12.5,
    "storageStats": {
      "totalSize": 52428800,
      "encryptedSize": 23068672
    }
  }
}
```

### Cleanup Operations

```http
POST /api/rag/updates/cleanup/:universeId
```
Clean up old updates based on retention policy.

**Request Body:**
```json
{
  "retentionPolicy": {
    "maxAge": 365,
    "maxVersionsPerNode": 100,
    "keepMajorVersions": true
  }
}
```

## Usage Examples

### Basic Update Tracking

```typescript
import { RAGStorageService, RAGUpdateStorageService } from '@/rag';

// Store a node with automatic update tracking
await ragStorage.storeNode(
  privateNode, 
  'user-123', 
  'Created new private character'
);

// Update with tracking
await ragStorage.updateNode(
  updatedNode, 
  'user-123', 
  'Updated character backstory'
);
```

### Encrypted Transactions

```typescript
// Create atomic transaction
const transaction = await updateStorage.createUpdateTransaction(
  'universe-123',
  'user-456',
  'Major story revision'
);

// Add multiple updates
transaction.addUpdate(update1);
transaction.addUpdate(update2);
transaction.addUpdate(update3);

// Commit all changes atomically
await transaction.commit();
```

### Version History & Rollback

```typescript
// Get complete history
const history = await updateStorage.getNodeHistory('character-789');

// Rollback to specific version
const rolledBack = await updateStorage.rollbackNode(
  'character-789',
  5, // target version
  'user-123',
  'Reverted experimental changes'
);
```

## Security Considerations

### Encryption Standards
- **AES-256-GCM**: Standard encryption for most private updates
- **ChaCha20-Poly1305**: High-security encryption for restricted content
- **Key Derivation**: PBKDF2 with universe-specific salts
- **Integrity**: SHA-256 hashes for all encrypted content

### Access Control
- **User Isolation**: Users can only access their own updates by default
- **Universe Permissions**: Configurable permissions at universe level
- **Encrypted Content**: Automatic access denial for users without decryption keys
- **Audit Logging**: All access attempts are logged for security review

### Performance Impact
- **Encryption Overhead**: ~10-20ms additional latency for private updates
- **Storage Overhead**: ~30-40% increase in storage for encrypted updates
- **Index Performance**: Database indexes maintain fast query performance
- **Cleanup Automation**: Configurable retention policies prevent storage bloat

## Configuration

### Environment Variables

```bash
# Encryption settings
RAG_ENCRYPTION_ENABLED=true
RAG_MASTER_KEY=your-secure-master-key
RAG_KEY_DERIVATION_SALT=your-salt

# Update retention
RAG_UPDATE_RETENTION_DAYS=365
RAG_MAX_VERSIONS_PER_NODE=100
RAG_CLEANUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM

# Performance settings
RAG_UPDATE_BATCH_SIZE=100
RAG_ENCRYPTION_TIMEOUT=30000
```

### Storage Configuration

```typescript
const updateStorage = new RAGUpdateStorageService(
  updateBackend,    // MongoDB or other storage backend
  updateIndex,      // Database index for fast queries
  updateEncryption  // Encryption service
);

const ragStorage = new RAGStorageService(
  ragBackend,
  dbIndex,
  updateStorage,    // Optional: enables update tracking
  updateEncryption  // Optional: enables automatic encryption
);
```

## Development & Testing

### Running Tests

```bash
# Run all update encryption tests
npm run test:rag-updates

# Test specific encryption scenarios
npm run test -- --grep "private content encryption"

# Performance benchmarks
npm run test:rag-performance
```

### Debug Logging

```typescript
// Enable detailed logging
process.env.RAG_UPDATE_DEBUG = 'true';

// Log encryption performance
process.env.RAG_ENCRYPTION_TIMING = 'true';
```

## Troubleshooting

### Common Issues

1. **Decryption Failures**
   - Check master key configuration
   - Verify user has access to universe keys
   - Confirm update integrity hashes

2. **Performance Issues**
   - Monitor encryption timing logs
   - Check database index performance
   - Review cleanup policy effectiveness

3. **Storage Growth**
   - Implement regular cleanup schedules
   - Monitor retention policy compliance
   - Consider compression for old updates

### Monitoring

```typescript
// Get update statistics
const stats = await updateStorage.getUpdateStatistics('universe-123');

// Monitor encryption performance
const metrics = stats.storageStats;
console.log('Encryption overhead:', metrics.encryptedSize / metrics.totalSize);
```

## Future Enhancements

- **Homomorphic Encryption**: Enable search on encrypted content
- **Cross-Universe Updates**: Encrypted updates across shared content
- **Collaborative Decryption**: Multi-party key management
- **Compression**: Reduce storage overhead for large updates
- **Streaming Updates**: Real-time encrypted update propagation

## Related Documentation

- [RAG Encryption Architecture](../encryption/README.md)
- [RAG Storage Service](../services/README.md)
- [API Authentication](../../auth/README.md)
- [Performance Monitoring](../../monitoring/README.md)
