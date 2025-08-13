# RAG System Rewrite Plan

## Overview
This document outlines the plan to rewrite the Retrieval-Augmented Generation (RAG) system to enhance its utility for both logical analysis and AI analysis. The current system successfully separates book-related nodes (universe, book, chapter) from system nodes (ai-model, ai-server, model-performance) but needs structural improvements for intelligent model selection.

---

## Current State Analysis

### Existing Architecture
The current RAG system uses `shared/node/nodeService.ts` with `ensureNode()` that:
- **Separates Collections**: System nodes (`ai-model`, `ai-server`, `model-performance`) are stored in `system_nodes` collection, while content nodes go to the main `nodes` collection
- **Working Universe/Book Pipeline**: The universe → book → chapter pipeline is fully functional via `ragNodeRepository.ts`
- **Benchmark Integration**: The `BenchmarkingManager` calls `updateRAGSystem()` which uses `ensureNode()` to store AI model benchmarks

### Current Node Types
**Content Nodes** (stored in `nodes` collection):
- `universe`, `book`, `chapter`, `scene`, `character`, `location`, `item`, `note`, `plugin-data`

**System Nodes** (stored in `system_nodes` collection):  
- `ai-model`, `ai-server`, `model-performance`

---

## Objectives

1. **Enhance System Node Organization**:
   - Improve the structure and relationships between AI server, model, and performance nodes.
   - Create logical hierarchies for better analysis and querying.

2. **Enable Intelligent Model Selection**:
   - Structure data to support prompt-based model selection.
   - Aggregate performance metrics for decision-making algorithms.

3. **Maintain Content/System Separation**:
   - Keep book-related content separate from AI infrastructure data.
   - Ensure clean boundaries between user content and system metrics.

---

## Enhanced System Node Types (Realistic Implementation)

### 1. **AI-Server Node** (Realistic - Ollama API Based)
- **Purpose**: Represent the operational state and capabilities of an AI server.
- **Storage**: `system_nodes` collection
- **Data Structure**:
  ```typescript
  {
    type: 'ai-server',
    title: string,                    // Server URL or identifier
    metadata: {
      serverId: string,               // Unique server identifier
      baseUrl: string,                // Server base URL
      serverType: 'ollama' | 'openai-compatible', // API compatibility type
      
      // Available from Ollama /api/tags
      availableModels: string[],      // Currently available models
      serverHealth: {
        isHealthy: boolean,           // Response from /api/tags successful
        lastHealthCheck: string,      // Timestamp of last check
        responseTimeMs: number,       // /api/tags response time
        consecutiveFailures: number   // Failed health check count
      },
      
      // Inferred/configured capabilities
      capabilities: {
        maxConcurrency: number,       // Configured max concurrent requests (default 4)
        estimatedMemory?: string,     // Inferred from model availability patterns
        serverRegion?: string         // Inferred from URL or configured
      },
      
      // Graph-RAG enhancements (realistic)
      communityMembership: {
        serverCluster: string,        // Based on URL domain/IP patterns
        capabilityGroup: string,      // Based on shared model availability
        performanceTier: string       // Based on response time clustering
      },
      graphMetadata: {
        sharedModels: string[],       // Models shared with other servers
        uniqueModels: string[],       // Models only on this server
        connectivityScore: number,    // 0-1 based on model overlap with other servers
        averageResponseTime: number,  // Rolling average response time
        reliabilityScore: number      // Success rate over time
      },
      
      lastUpdated: string
    }
  }
  ```
        loadBalancingGroup: string    // Load balancing community
      },
      
      lastUpdated: string
    }
  }
  ```

### 2. **AI-Model Node** (Enhanced)
- **Purpose**: Represent model capabilities and aggregated performance across all servers.
- **Storage**: `system_nodes` collection
- **Data Structure**:
  ```typescript
  {
    type: 'ai-model',
    title: string,                    // Model name/identifier
    metadata: {
      modelId: string,
      modelType: 'text-generation' | 'embedding' | 'multimodal',
      availableServers: string[],     // Servers hosting this model
      
      // Aggregated performance metrics
      aggregatedMetrics: {
        bestTokensPerSecond: number,
        averageLatency: number,
        bestServer: string,           // Server with best performance
        worstServer: string,          // Server with worst performance
        consistencyScore: number      // Variance across servers
      },
      
      // Quality benchmark aggregations
      qualityProfile: {
        overallScore: number,
        strengthAreas: BenchmarkType[],     // Best performing benchmark types
        weaknessAreas: BenchmarkType[],     // Worst performing benchmark types
        bookWritingScore: number,           // Specific to book writing tasks
        technicalScore: number,             // Code/technical tasks
        creativeScore: number               // Creative writing tasks
      },
      
      // Model selection metadata
      recommendedUseCases: string[],        // When to use this model
      promptCompatibility: {
        shortPrompts: number,               // Score 0-1
        longPrompts: number,                // Score 0-1  
        technicalPrompts: number,           // Score 0-1
        creativePrompts: number             // Score 0-1
      },
      
      // Graph-RAG enhancements
      communityMembership: {
        modelFamily: string,          // e.g., "llama", "gpt", "claude"
        capabilityCluster: string,    // e.g., "creative-writing", "coding"
        similarModels: string[],      // Models with similar capabilities
        communityRank: number         // Ranking within capability community
      },
      graphMetadata: {
        semanticEmbedding: number[],  // Model capability embedding
        modelRelationships: Array<{
          relatedModelId: string,
          relationshipType: 'similar' | 'complementary' | 'alternative',
          strength: number            // 0-1 relationship strength
        }>,
        hierarchyLevel: number,       // Level in model hierarchy (quality-based)
        parentModels: string[],       // Models this is derived from
        childModels: string[]         // Models derived from this
      },
      
      lastBenchmarked: string,
      benchmarkCount: number
    }
  }
  ```

### 3. **Model-Performance Node** (Enhanced)
- **Purpose**: Store detailed performance metrics for specific model-server combinations.
- **Storage**: `system_nodes` collection  
- **Unique Key**: `serverId` + `modelName` combination
- **Data Structure**:
  ```typescript
  {
    type: 'model-performance',
    title: string,                    // "modelName on serverUrl"
    metadata: {
      serverId: string,
      modelName: string,
      
      // Performance metrics
      coldPerformance: {
        timeToFirstToken: number,
        tokensPerSecond: number,
        totalResponseTime: number,
        loadingOverhead: number
      },
      
      warmPerformance: {
        timeToFirstToken: number,
        tokensPerSecond: number,
        averageResponseTime: number,
        consistencyScore: number
      },
      
      // Quality benchmarks (detailed results)
      benchmarks: Record<BenchmarkType, {
        score: number,
        rubric: string,
        timestamp: string,
        prompt?: string,
        responseTime?: number
      }>,
      
      // Reliability metrics
      reliability: {
        successRate: number,          // % of successful requests
        errorRate: number,            // % of failed requests
        avgErrorRecoveryTime: number  // Time to recover from errors
      },
      
      // Graph-RAG enhancements
      communityMembership: {
        performanceCluster: string,   // e.g., "high-performance", "budget-tier"
        optimalWorkload: string,      // e.g., "creative", "technical", "mixed"
        peerComparisons: Array<{
          peerModelServer: string,
          relativePerformance: number, // -1 to 1 (worse to better)
          comparisonMetric: string     // "latency", "quality", "reliability"
        }>
      },
      graphMetadata: {
        performanceEmbedding: number[], // Vector of performance characteristics
        edges: Array<{
          targetNodeId: string,        // Connected performance node
          edgeType: 'similar_performance' | 'alternative_option' | 'upgrade_path' | 'fallback_option',
          weight: number,              // Edge strength 0-1
          metadata: {
            contextualRelevance: string, // When this connection is relevant
            performanceDelta: number     // Performance difference
          }
        }>
      },
      
      lastTested: string,
      testCount: number
    }
  }
  ```

### 4. **Community-Summary Node** (New - Microsoft GraphRAG Inspired)
- **Purpose**: Store hierarchical community summaries for Graph-RAG functionality.
- **Storage**: `system_nodes` collection
- **Data Structure**:
  ```typescript
  {
    type: 'community-summary',
    title: string,                    // "Community {id} - {level}"
    metadata: {
      communityId: string,            // Unique community identifier
      level: number,                  // Hierarchy level (0 = leaf, higher = more abstract)
      parentCommunityId?: string,     // Parent community in hierarchy
      childCommunityIds: string[],    // Child communities
      
      // Community content
      summary: {
        brief: string,                // Short community description
        detailed: string,             // Comprehensive community analysis
        keyThemes: string[],          // Main themes in this community
        relevantTopics: string[]      // Topics this community addresses well
      },
      
      // Member nodes
      memberNodes: Array<{
        nodeId: string,
        nodeType: 'ai-model' | 'ai-server' | 'model-performance',
        centralityScore: number,      // How central this node is to community
        contributionType: string      // How it contributes to community theme
      }>,
      
      // Community characteristics
      characteristics: {
        primaryCapability: string,    // Main capability of this community
        strengthAreas: BenchmarkType[], // What this community excels at
        weaknessAreas: BenchmarkType[], // What this community struggles with
        typicalUseCases: string[],    // When to use nodes from this community
        performanceProfile: {
          avgLatency: number,
          avgQuality: number,
          avgReliability: number
        }
      },
      
      // Graph-RAG metadata
      graphMetadata: {
        clusteringAlgorithm: 'leiden' | 'louvain' | 'spectral',
        modularity: number,           // Community modularity score
        internalConnectivity: number, // How well connected nodes are internally
        externalConnectivity: number, // How connected to other communities
        communityEmbedding: number[], // Semantic embedding of community summary
        lastRecomputed: string        // When community was last recalculated
      },
      
      lastUpdated: string
    }
  }
  ```

---

## Graph-RAG Edge Relationships (Microsoft GraphRAG Inspired)

### Edge Types for System Nodes

#### **AI-Server to AI-Server Edges**
- `geographic_proximity` - Servers in same data center/region
- `load_balancing_group` - Servers in same load balancing pool  
- `capability_similarity` - Servers with similar hardware/software capabilities
- `failover_relationship` - Primary/backup server relationships
- `network_latency` - Network connectivity and latency between servers

#### **AI-Model to AI-Model Edges**  
- `model_family` - Models from same base architecture (e.g., Llama family)
- `capability_similarity` - Models with similar benchmark performance profiles
- `use_case_overlap` - Models suitable for similar tasks/prompts
- `quality_hierarchy` - Better/worse performance relationships
- `complementary_capabilities` - Models that work well together for different aspects
- `alternative_option` - Comparable models for same use case
- `derived_from` - Model fine-tuned or derived from another model

#### **Model-Performance to Model-Performance Edges**
- `performance_similarity` - Similar performance characteristics
- `server_alternatives` - Same model on different servers
- `upgrade_path` - Better performing alternatives 
- `fallback_option` - Backup options when primary fails
- `cost_vs_performance` - Trade-off relationships
- `workload_optimization` - Optimized for similar workload types

#### **Cross-Type Edges**
- `ai-server` → `ai-model`: `hosts_model` - Server hosts this model
- `ai-model` → `model-performance`: `performance_instance` - Performance data for model
- `ai-server` → `model-performance`: `server_performance` - Server's performance data
- `community-summary` → `*`: `community_member` - Node belongs to community

### Hierarchical Community Structure

#### **Community Detection Algorithm: Leiden**
Following Microsoft's GraphRAG approach using the Leiden algorithm for hierarchical community detection:

```typescript
interface CommunityDetectionConfig {
  algorithm: 'leiden',
  parameters: {
    resolution: number,        // Higher = more granular communities
    randomness: number,        // Controls determinism vs exploration
    maxIterations: number,     // Convergence limit
    minCommunitySize: number,  // Minimum nodes per community
    maxCommunitySize: number   // Maximum nodes per leaf community
  },
  hierarchyLevels: {
    level0: 'individual_nodes',     // Raw nodes
    level1: 'performance_clusters', // Similar performance characteristics  
    level2: 'capability_groups',    // Similar capabilities/use cases
    level3: 'technology_families',  // Model families and server types
    level4: 'strategic_categories'  // High-level AI infrastructure categories
  }
}
```

#### **Community Summary Generation**
- **Level 0**: Individual node descriptions
- **Level 1**: Performance cluster summaries (e.g., "High-performance creative writing models")
- **Level 2**: Capability group summaries (e.g., "Code generation and technical assistance")
- **Level 3**: Technology family summaries (e.g., "Llama-based models across all servers")
- **Level 4**: Strategic category summaries (e.g., "Enterprise AI infrastructure for content creation")

---

## Graph-RAG Query Capabilities

### Global Search (Community-Based)
- **Query Type**: Broad analysis across entire AI infrastructure
- **Method**: Query community summaries at appropriate hierarchy level
- **Use Cases**:
  - "What are our best models for book writing?"
  - "Which server clusters are most reliable?"
  - "What capabilities do we have for technical documentation?"
  
### Local Search (Entity-Focused)
- **Query Type**: Specific entity with contextual relationships
- **Method**: Navigate entity's immediate connections and examine related claims
- **Use Cases**:
  - "What are the best alternatives to model X on server Y?"
  - "Which models complement Llama-2-70B for creative tasks?"
  - "What's the upgrade path from this model-server combination?"

### Hybrid Search (Multi-Level)
- **Query Type**: Combine community insights with specific entity details
- **Method**: Start with community-level analysis, drill down to specific entities
- **Use Cases**:
  - "Find the best creative writing setup and provide specific recommendations"
  - "Analyze our coding capabilities and suggest optimal model-server pairs"
  - "What's our disaster recovery strategy for the primary AI infrastructure?"

---

## Enhanced Data Flow and Relationships

### Current Working Flow (Book Content) - Unchanged
1. **Universe Creation**: `POST /api/universes` → `createUniverse()` → `ensureNode()` → stored in `nodes` collection
2. **Book Creation**: `POST /api/universes/{id}/books` → `createBook()` → embedded in universe document with embeddings
3. **Chapter Creation**: `POST /api/books/{id}/chapters` → `createChapter()` → embedded in book with position ordering
4. **Content Retrieval**: Fully functional with proper API endpoints and data structure

### Enhanced System Flow (AI Infrastructure + Graph-RAG) - Realistic Implementation

#### **1. Server Registration & Discovery** (Ollama API Limited)
- **Current Reality**: Ollama only provides `/api/tags` endpoint for health/model discovery
- **Available Data**: Server URL, health status (boolean), available models list, response time
- **Implementation**:
  - `updateAllStatus()` already calls `/api/tags` on each server
  - **Graph Enhancement**: Create `server_proximity` edges based on URL patterns (same domain/IP range)
  - **Graph Enhancement**: Create `capability_similarity` edges based on shared model overlap
  - **Graph Enhancement**: Create `load_balancing_group` edges for servers with identical model sets

#### **2. Model Discovery** (Ollama API Based)
- **Current Reality**: Models discovered via `/api/tags` response parsing
- **Available Data**: Model names, which servers host each model
- **Implementation**:
  - `getModelMap()` already aggregates models across servers
  - **Graph Enhancement**: Create `model_family` edges by parsing model name patterns (llama, mistral, etc.)
  - **Graph Enhancement**: Create `alternative_option` edges for models available on multiple servers
  - **Graph Enhancement**: Create `capability_similarity` edges based on model name similarity scoring

#### **3. Benchmark Execution** (Current BenchmarkingManager)
- **Current Reality**: `BenchmarkingManager.updateRAGSystem()` already creates performance data
- **Available Data**: Latency, throughput, quality scores, success rates
- **Implementation**:
  - Enhance existing `model-performance` node creation with graph metadata
  - **Graph Enhancement**: Create `performance_similarity` edges based on benchmark score clusters
  - **Graph Enhancement**: Create `upgrade_path` edges from lower to higher performing combinations
  - **Graph Enhancement**: Create `fallback_option` edges for same model on different servers

#### **4. Community Detection & Summarization** (New - Feasible)
- **Implementation Approach**: Use existing data patterns for community detection
- **Server Communities**: Group by shared models, response time clusters, geographic indicators
- **Model Communities**: Group by name families, performance profiles, quality scores
- **Performance Communities**: Group by latency bands, quality tiers, reliability scores

#### **5. Queue System Integration** (Current Architecture)
- **Current Reality**: Orchestrator has `tryRequestWithFailover()` and `getBestServerForModel()`
- **Queue Components**: 
  - `backend/core/types/queue.ts` - Job definitions
  - `backend/infrastructure/queue/queueSelection.ts` - Queue logic
  - `ai-server/src/routes/queue.ts` - Queue endpoints
- **Graph Enhancement**: Use community insights to improve server selection logic
- **Implementation**: Enhance `getBestServerForModel()` to consider graph relationships

#### **6. Intelligent Model Selection Enhancement** (Feasible)
- **Current Logic**: Least connections → lowest latency → benchmark scores
- **Graph Enhancements**:
  - Consider community membership for fallback options
  - Use relationship edges to find alternative servers/models
  - Leverage performance similarity for load balancing decisions

---

## Implementation Phases (Updated - Realistic Approach)

### Phase 1: Enhanced Node Schema Foundation ✅
- [x] Document current working content pipeline (universe/book/chapter)
- [x] Research Microsoft GraphRAG implementation patterns
- [x] Plan realistic implementation based on Ollama API limitations

### Phase 2: Enhanced System Node Creation (Realistic)
**Dependencies**: Ollama `/api/tags` endpoint, existing orchestrator patterns
- [ ] Enhance `ensureNode()` calls in orchestrator to include graph metadata
- [ ] Update `updateAllStatus()` to create richer `ai-server` nodes with community hints
- [ ] Enhance `BenchmarkingManager.updateRAGSystem()` to create graph-enabled `model-performance` nodes
- [ ] Create basic community detection based on model overlap and performance clustering

### Phase 3: Orchestrator Integration (Queue System Enhancement)
**Dependencies**: Phase 2 enhanced nodes, existing queue infrastructure
- [ ] Enhance `getBestServerForModel()` to consider graph relationships
- [ ] Update `tryRequestWithFailover()` to use community-based fallback logic
- [ ] Integrate community insights into queue selection algorithms
- [ ] Add graph-based server similarity scoring for load balancing

### Phase 4: Realistic Community Detection 
**Dependencies**: Phase 2 & 3 completion, MongoDB aggregation queries
- [ ] Implement basic clustering based on:
  - [ ] Server model overlap (capability similarity)
  - [ ] Performance tier clustering (latency/reliability bands)  
  - [ ] Model family detection (name pattern matching)
- [ ] Create lightweight community summaries without LLM dependency
- [ ] Add community membership metadata to existing nodes

### Phase 5: Graph-Enhanced Selection Logic
**Dependencies**: Phase 4 community infrastructure
- [ ] Enhance model selection with relationship awareness
- [ ] Implement graph-based alternative suggestions
- [ ] Add community-informed load balancing
- [ ] Create fallback chains using graph traversal

### Phase 6: Testing and Integration
**Dependencies**: All previous phases
- [ ] Test enhanced orchestrator with realistic server loads
- [ ] Validate community detection accuracy with actual server/model data
- [ ] Performance test graph-enhanced selection algorithms
- [ ] Create monitoring for graph-based recommendations

---

## Realistic Technical Implementation

### Ollama API Constraints and Workarounds

#### **Available Ollama Endpoints**:
- `GET /api/tags` - List available models (only reliable health/discovery endpoint)
- `POST /api/generate` - Generate responses (performance measurement during actual use)
- Additional endpoints like `/api/version`, `/api/ps` may not be universally available

#### **Current Orchestrator Integration Points**:
```typescript
// Already implemented in orchestrator.ts
updateAllStatus()           // Calls /api/tags for health/model discovery
getBestServerForModel()     // Selects server based on health, concurrency, benchmarks  
tryRequestWithFailover()    // Implements failover logic with error handling
benchmarkManager           // Creates performance data for RAG system
```

#### **Realistic Graph Enhancements**:
1. **Server Clustering**: Based on URL patterns, shared model sets, response time bands
2. **Model Families**: Inferred from model name patterns (llama-*, mistral-*, etc.)
3. **Performance Tiers**: Clustered by benchmark results into high/medium/low performance groups
4. **Community Detection**: Simple clustering algorithms instead of complex Leiden implementation

### Queue System Integration Strategy

#### **Existing Queue Infrastructure**:
- `backend/core/types/queue.ts` - Job type definitions
- `backend/infrastructure/queue/queueSelection.ts` - Selection logic
- `ai-server/src/routes/queue.ts` - Queue endpoints

#### **Graph Enhancement Approach**:
```typescript
// Enhanced getBestServerForModel() with community awareness
getBestServerForModel(model: string, context?: {
  taskType?: 'creative' | 'technical' | 'analysis',
  priority?: 'low' | 'normal' | 'high',
  fallbackPreferences?: 'performance' | 'reliability' | 'availability'
}): AIServer | undefined {
  // 1. Get basic candidates (existing logic)
  const candidates = this.getHealthyCandidates(model);
  
  // 2. Apply graph-based scoring (new)
  const scoredCandidates = this.applyGraphScoring(candidates, context);
  
  // 3. Consider community relationships for load balancing (new)
  return this.selectWithCommunityAwareness(scoredCandidates);
}
```

---

## Technical Implementation Details

### Leiden Algorithm Integration
Following Microsoft's GraphRAG implementation:

```typescript
interface LeidenImplementation {
  // Core algorithm parameters
  resolution: number,           // Community granularity control
  randomness: number,          // Exploration vs exploitation balance
  maxIterations: number,       // Convergence limit
  
  // Community size constraints
  minCommunitySize: number,    // Prevent singleton communities
  maxCommunitySize: number,    // Ensure hierarchy depth
  
  // Hierarchical processing
  hierarchyLevels: number,     // Number of hierarchy levels (5)
  summarizationPrompts: {      // LLM prompts for each level
    level1: string,            // Performance cluster summaries
    level2: string,            // Capability group summaries
    level3: string,            // Technology family summaries
    level4: string             // Strategic category summaries
  }
}
```

### Graph Storage Schema (MongoDB)
```typescript
// Enhanced system node with graph metadata
interface SystemNodeWithGraph extends SystemNode {
  // Community membership across hierarchy levels
  communities: {
    level1: string,            // Performance cluster ID
    level2: string,            // Capability group ID  
    level3: string,            // Technology family ID
    level4: string             // Strategic category ID
  },
  
  // Graph connectivity
  edges: {
    outgoing: Array<{
      targetId: string,
      edgeType: string,
      weight: number,
      metadata: Record<string, any>
    }>,
    incoming: Array<{
      sourceId: string,
      edgeType: string,
      weight: number,
      metadata: Record<string, any>
    }>
  },
  
  // Graph analytics
  graphMetrics: {
    centrality: number,        // Node importance in graph
    clustering: number,        // Local clustering coefficient
    degree: number            // Total edge count
  }
}

// New community summary node type
interface CommunityNode {
  nodeId: string,
  type: 'community-summary',
  communityId: string,
  hierarchyLevel: number,      // 1-4 (level 0 is individual nodes)
  summary: string,             // LLM-generated community description
  memberCount: number,
  members: string[],           // Node IDs in this community
  parentCommunity?: string,    // Higher level community
  childCommunities: string[],  // Lower level communities
  
  // Standard node fields
  embedding?: number[],
  createdAt: Date,
  updatedAt: Date
}
```

### Performance Optimization Strategy
- **Incremental Updates**: Only recalculate communities when significant changes occur
- **Caching**: Cache community summaries and frequently accessed graph paths
- **Lazy Loading**: Load community details only when needed for queries
- **Parallel Processing**: Process community detection and summarization in parallel
- **Index Optimization**: Create MongoDB indexes for efficient graph traversal

---

## Success Metrics and Validation

### Graph-RAG Quality Metrics
- **Community Coherence**: Measure semantic similarity within communities
- **Hierarchy Effectiveness**: Validate that higher levels provide meaningful abstractions
- **Edge Accuracy**: Verify that relationships accurately represent real-world connections
- **Query Performance**: Response time for global, local, and hybrid searches
- **Selection Improvement**: Better model selection accuracy using graph insights

### Testing Strategy
- **Unit Tests**: Individual components (community detection, edge management, query systems)
- **Integration Tests**: End-to-end graph-RAG workflows
- **Performance Tests**: Large-scale graph operations and query response times
- **Accuracy Tests**: Validate community detection and summarization quality
- **Real-world Testing**: Use actual model selection scenarios to validate improvements

---

## API Endpoints (New/Enhanced)

### System Node Queries
- `GET /api/rag/ai-servers` - List all AI servers with health status
- `GET /api/rag/ai-models` - List all models with aggregated performance  
- `GET /api/rag/model-performance` - Detailed performance metrics by model-server
- `GET /api/rag/analytics` - Enhanced analytics with new node structure

### Intelligent Model Selection
- `POST /api/rag/recommend-model` - Get model recommendation based on prompt analysis
- `GET /api/rag/models/best-for/{task-type}` - Get best models for specific task types
- `GET /api/rag/servers/best-for-model/{model-id}` - Get best servers for a specific model

### Health and Monitoring  
- `POST /api/rag/servers/health-check` - Update server health status
- `GET /api/rag/system-status` - Overall system health dashboard data

---

## Migration Strategy

### Backward Compatibility
- **No Breaking Changes**: Existing universe/book/chapter APIs remain unchanged
- **Gradual Enhancement**: System nodes are enhanced without affecting content nodes
- **Legacy Support**: Existing benchmark data is migrated to new structure

### Data Migration Steps
1. **Identify Existing System Nodes**: Query `system_nodes` collection for current data
2. **Transform Data Structure**: Convert existing benchmark data to enhanced schema
3. **Aggregate Historical Data**: Roll up existing performance data into model summaries
4. **Validate Migration**: Ensure all existing functionality continues to work

---

## Benefits of Enhanced Design

### For Logical Analysis
- **Clear Hierarchies**: Server → Model → Performance relationships enable drill-down analysis
- **Aggregated Metrics**: Model-level summaries provide quick comparison capabilities
- **Historical Tracking**: Time-series data for performance trends and reliability analysis

### For AI Analysis
- **Prompt-Model Matching**: Structured compatibility scores enable intelligent selection
- **Performance Prediction**: Historical data supports ML-based performance forecasting
- **Adaptive Learning**: System can learn from usage patterns and optimize recommendations

### For System Operations
- **Health Monitoring**: Real-time server health and performance tracking
- **Capacity Planning**: Understanding server capabilities and model resource requirements
- **Fault Tolerance**: Identifying backup servers and fallback models for reliability

---

## Future Enhancements

### Advanced Analytics
- **Performance Trending**: Track performance changes over time
- **Usage Analytics**: Understand which models are used for which types of prompts
- **Capacity Optimization**: Recommend server scaling based on demand patterns

### Machine Learning Integration
- **Prompt Classification**: Automatically categorize user prompts for better model selection
- **Performance Prediction**: Predict model performance based on prompt characteristics
- **Adaptive Recommendations**: Learn from user feedback to improve model selection

### Real-Time Optimization
- **Dynamic Load Balancing**: Real-time server selection based on current load
- **Auto-Failover**: Automatic fallback to backup servers when primary servers fail
- **Performance Alerts**: Proactive monitoring and alerting for performance degradation

---

## Summary

I've updated the RAG rewrite plan to be much more realistic based on your current Ollama API constraints and existing orchestrator architecture. Here are the key changes:

### **Realistic Constraints Acknowledged**:

1. **Ollama API Limitations**: 
   - Only `/api/tags` is reliably available for health checks and model discovery
   - No direct access to server hardware metrics, geographic location, or detailed capabilities
   - Server registration is limited to what the orchestrator can infer from API responses

2. **Current Architecture Preserved**:
   - Enhanced existing `updateAllStatus()`, `getBestServerForModel()`, and `tryRequestWithFailover()` methods
   - Leveraged existing queue system (`backend/core/types/queue.ts`, `queueSelection.ts`)
   - Built upon current `BenchmarkingManager.updateRAGSystem()` integration

3. **Practical Graph Enhancements**:
   - **Server communities** based on shared model sets and response time clustering
   - **Model families** inferred from naming patterns (llama-*, mistral-*, etc.)
   - **Performance tiers** based on actual benchmark results
   - **Simple clustering** instead of complex Leiden algorithm

### **Implementable Enhancements**:

1. **Enhanced Node Creation**: Enrich existing `ensureNode()` calls with realistic graph metadata
2. **Community Detection**: Use model overlap and performance clustering for basic community identification  
3. **Queue Integration**: Enhance `getBestServerForModel()` with community-aware scoring
4. **Fallback Logic**: Use graph relationships for intelligent server/model alternatives

### **Benefits While Staying Realistic**:

- **Better Model Selection**: Community insights help choose optimal server/model combinations
- **Intelligent Fallbacks**: Graph relationships provide better backup options when primary choices fail
- **Load Balancing**: Community membership helps distribute load across similar servers
- **Performance Optimization**: Leverage actual benchmark data for smarter routing decisions

The plan now focuses on achievable improvements that work within your Ollama API constraints while still providing significant value for model selection and infrastructure management. The graph-RAG concepts are simplified but still provide intelligent relationship-based decision making for your orchestrator and queue systems.
