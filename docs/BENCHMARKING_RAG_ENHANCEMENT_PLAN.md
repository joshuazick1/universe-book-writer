# Benchmarking System RAG Enhancement Plan

## Overview
This document outlines the enhancements needed to the current `BenchmarkingManager` system to support the Graph-RAG functionality and enable automatic detection of missing benchmark scores for intelligent test queuing.

---

## Current State Analysis

### What Works Well ✅
- **Queue-based benchmarking**: Modern workflow system with job dependencies
- **RAG Integration**: `updateRAGSystem()` method creates `ai-model` nodes
- **Comprehensive metrics**: Cold/warm performance, quality benchmarks, server latency
- **Model type detection**: Automatic detection of embedding vs text-generation models
- **Fallback logic**: Legacy benchmarking for non-queue scenarios

### Limitations ❌
- **Single node type**: Only creates `ai-model` nodes, missing `ai-server` and `model-performance`
- **No graph metadata**: No community membership or relationship data
- **No missing score detection**: No automatic discovery of gaps in benchmark coverage
- **Limited aggregation**: Performance data not properly aggregated across servers
- **No community scoring**: No capability clustering or model family detection

---

## Required Enhancements

### 1. **Enhanced Node Creation** (Graph-RAG Ready)

#### **A. Create Separate Node Types**
Current: Only `ai-model` nodes
Enhanced: Create all three node types with proper relationships

```typescript
// Current updateRAGSystem() creates only ai-model
await ensureNode({
  type: 'ai-model',
  title: result.modelId,
  metadata: { ... }
});

// Enhanced: Create ai-server, ai-model, and model-performance nodes
await this.createGraphRAGNodes(result);
```

#### **B. Add Graph Metadata**
```typescript
private async createGraphRAGNodes(result: ModelQualityBenchmarks): Promise<void> {
  // 1. Create/update ai-server nodes for each server
  for (const serverId of Object.keys(result.serverLatencyMetrics)) {
    await this.ensureAIServerNode(serverId, result);
  }
  
  // 2. Create/update model-performance nodes for each server-model combination
  for (const serverId of Object.keys(result.serverLatencyMetrics)) {
    await this.ensureModelPerformanceNode(serverId, result.modelId, result);
  }
  
  // 3. Create/update aggregated ai-model node with community data
  await this.ensureAIModelNode(result);
}
```

### 2. **Community Detection Integration**

#### **A. Model Family Detection**
```typescript
private detectModelFamily(modelId: string): string {
  const modelLower = modelId.toLowerCase();
  
  if (modelLower.includes('llama')) return 'llama';
  if (modelLower.includes('mistral')) return 'mistral';
  if (modelLower.includes('qwen')) return 'qwen';
  if (modelLower.includes('phi')) return 'phi';
  if (modelLower.includes('gemma')) return 'gemma';
  if (modelLower.includes('codellama')) return 'codellama';
  if (modelLower.includes('deepseek')) return 'deepseek';
  
  return 'other';
}
```

#### **B. Capability Clustering**
```typescript
private detectCapabilityCluster(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): string {
  const scores = Object.entries(benchmarks);
  
  // Creative writing cluster
  const creativeScores = scores.filter(([type]) => 
    ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building'].includes(type)
  ).map(([, score]) => score.score);
  
  // Technical cluster  
  const technicalScores = scores.filter(([type]) =>
    ['typescript-quality', 'task-planning', 'json-assembly'].includes(type)
  ).map(([, score]) => score.score);
  
  const avgCreative = creativeScores.length > 0 ? 
    creativeScores.reduce((a, b) => a + b, 0) / creativeScores.length : 0;
  const avgTechnical = technicalScores.length > 0 ?
    technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length : 0;
    
  if (avgCreative > avgTechnical && avgCreative > 0.7) return 'creative-writing';
  if (avgTechnical > avgCreative && avgTechnical > 0.7) return 'technical-analysis';
  if (Math.abs(avgCreative - avgTechnical) < 0.1) return 'general-purpose';
  
  return 'specialized';
}
```

#### **C. Performance Tier Classification**
```typescript
private detectPerformanceTier(
  serverLatencies: Record<string, number>,
  qualityScores: Record<BenchmarkType, QualityBenchmarkScore>
): string {
  const avgLatency = Object.values(serverLatencies).reduce((a, b) => a + b, 0) / Object.values(serverLatencies).length;
  const avgQuality = Object.values(qualityScores).reduce((a, b) => a + b.score, 0) / Object.values(qualityScores).length;
  
  if (avgLatency < 1000 && avgQuality > 0.8) return 'high-performance';
  if (avgLatency < 3000 && avgQuality > 0.6) return 'medium-performance';
  return 'budget-tier';
}
```

### 3. **Missing Score Detection Service**

#### **A. RAG Query Service**
```typescript
interface MissingBenchmarkService {
  findModelPerformanceNodesWithMissingScores(): Promise<Array<{
    nodeId: string;
    serverId: string;
    modelId: string;
    missingBenchmarks: BenchmarkType[];
    lastTested?: string;
    priority: 'high' | 'medium' | 'low';
  }>>;
  
  findServersNeedingHealthChecks(): Promise<Array<{
    serverId: string;
    lastHealthCheck?: string;
    consecutiveFailures: number;
  }>>;
  
  findModelsNeedingAggregation(): Promise<Array<{
    modelId: string;
    serverCount: number;
    lastAggregated?: string;
  }>>;
}
```

#### **B. Automatic Benchmark Queuing**
```typescript
class AutomaticBenchmarkScheduler {
  constructor(
    private benchmarkingManager: BenchmarkingManager,
    private missingScoreService: MissingBenchmarkService
  ) {}
  
  async scheduleAutomaticBenchmarks(): Promise<void> {
    // 1. Find nodes with missing scores
    const missingNodes = await this.missingScoreService.findModelPerformanceNodesWithMissingScores();
    
    // 2. Prioritize by importance and age
    const prioritizedNodes = this.prioritizeNodes(missingNodes);
    
    // 3. Queue benchmarks for top priority nodes
    for (const node of prioritizedNodes.slice(0, 10)) { // Limit to 10 at a time
      await this.queueBenchmarkJob(node);
    }
  }
  
  private prioritizeNodes(nodes: Array<any>): Array<any> {
    return nodes.sort((a, b) => {
      // Priority scoring: high=3, medium=2, low=1
      const priorityScore = { high: 3, medium: 2, low: 1 };
      
      // Age scoring: older = higher priority
      const ageScore = (node: any) => {
        if (!node.lastTested) return 1000; // Never tested = highest priority
        const daysSince = (Date.now() - new Date(node.lastTested).getTime()) / (1000 * 60 * 60 * 24);
        return Math.min(100, daysSince); // Cap at 100 days
      };
      
      const scoreA = priorityScore[a.priority] + ageScore(a);
      const scoreB = priorityScore[b.priority] + ageScore(b);
      
      return scoreB - scoreA; // Higher score = higher priority
    });
  }
}
```

### 4. **Enhanced updateRAGSystem Method**

```typescript
private async updateRAGSystem(result: ModelQualityBenchmarks): Promise<void> {
  try {
    // 1. Create enhanced ai-server nodes
    await this.createAIServerNodes(result);
    
    // 2. Create model-performance nodes for each server-model combination  
    await this.createModelPerformanceNodes(result);
    
    // 3. Create/update aggregated ai-model node with community data
    await this.createAggregatedAIModelNode(result);
    
    // 4. Update community relationships (if enough data exists)
    await this.updateCommunityRelationships(result.modelId);
    
    console.log('[BenchmarkingManager] Updated RAG system with enhanced graph nodes');
  } catch (err) {
    console.warn('[BenchmarkingManager] Failed to update RAG system:', err);
  }
}

private async createAIServerNodes(result: ModelQualityBenchmarks): Promise<void> {
  for (const [serverId, metrics] of Object.entries(result.serverLatencyMetrics)) {
    const serverType = serverId.includes('localhost') ? 'ollama' : 'ollama'; // Default to ollama
    
    await ensureNode({
      type: 'ai-server',
      title: serverId,
      metadata: {
        serverId,
        baseUrl: serverId,
        serverType,
        
        // Health from metrics
        serverHealth: {
          isHealthy: metrics.healthScore > 0.5,
          lastHealthCheck: new Date().toISOString(),
          responseTimeMs: metrics.tagsLatency || 9999,
          consecutiveFailures: metrics.healthScore > 0.5 ? 0 : 1
        },
        
        // Available models (get from orchestrator if available)
        availableModels: [result.modelId], // At minimum, this model
        
        // Graph-RAG enhancements
        communityMembership: {
          serverCluster: this.detectServerCluster(serverId),
          performanceTier: this.detectServerPerformanceTier(metrics),
          capabilityGroup: 'general' // Default, can be enhanced with more data
        },
        
        graphMetadata: {
          averageResponseTime: metrics.tagsLatency || 9999,
          reliabilityScore: metrics.healthScore,
          connectivityScore: 0.5 // Default, enhanced when comparing with other servers
        },
        
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

private async createModelPerformanceNodes(result: ModelQualityBenchmarks): Promise<void> {
  for (const [serverId, coldPerf] of Object.entries(result.serverColdPerformance || {})) {
    const warmPerf = result.serverWarmPerformance?.[serverId];
    
    await ensureNode({
      type: 'model-performance',
      title: `${result.modelId} on ${serverId}`,
      metadata: {
        serverId,
        modelName: result.modelId,
        
        // Performance metrics
        coldPerformance: coldPerf,
        warmPerformance: warmPerf || {},
        
        // Quality benchmarks
        benchmarks: result.benchmarks,
        
        // Reliability (derive from success of benchmarks)
        reliability: {
          successRate: Object.keys(result.benchmarks).length > 0 ? 0.95 : 0.0,
          errorRate: Object.keys(result.benchmarks).length > 0 ? 0.05 : 1.0,
          avgErrorRecoveryTime: 0
        },
        
        // Graph-RAG enhancements
        communityMembership: {
          performanceCluster: this.detectPerformanceTier(result.serverLatencies, result.benchmarks),
          optimalWorkload: this.detectCapabilityCluster(result.benchmarks)
        },
        
        lastTested: new Date().toISOString(),
        testCount: 1
      }
    });
  }
}

private async createAggregatedAIModelNode(result: ModelQualityBenchmarks): Promise<void> {
  const serverIds = Object.keys(result.serverLatencyMetrics || {});
  
  // Aggregate performance across servers
  const aggregatedMetrics = this.aggregatePerformanceMetrics(result);
  const qualityProfile = this.createQualityProfile(result.benchmarks);
  
  await ensureNode({
    type: 'ai-model',
    title: result.modelId,
    metadata: {
      modelId: result.modelId,
      modelType: this.detectModelType(result.modelId), // 'text-generation' | 'embedding'
      availableServers: serverIds,
      
      // Aggregated performance
      aggregatedMetrics,
      qualityProfile,
      
      // Model selection metadata
      recommendedUseCases: this.generateRecommendedUseCases(result.benchmarks),
      promptCompatibility: this.calculatePromptCompatibility(result.benchmarks),
      
      // Graph-RAG enhancements
      communityMembership: {
        modelFamily: this.detectModelFamily(result.modelId),
        capabilityCluster: this.detectCapabilityCluster(result.benchmarks),
        communityRank: 0.5 // Default, updated during community analysis
      },
      
      graphMetadata: {
        hierarchyLevel: this.calculateHierarchyLevel(result.benchmarks),
        semanticEmbedding: await this.generateModelEmbedding(result)
      },
      
      // Legacy compatibility
      benchmarks: result.benchmarks,
      serverLatencies: result.serverLatencies,
      serverLatencyDetails: result.serverLatencyDetails,
      serverThroughput: result.serverThroughput,
      
      lastBenchmarked: new Date().toISOString(),
      benchmarkCount: Object.keys(result.benchmarks).length
    }
  });
}
```

---

## Implementation Phases

### Phase 1: Enhanced Node Creation ⏳
**Timeline**: 1-2 weeks
- [ ] Enhance `updateRAGSystem()` to create separate `ai-server`, `ai-model`, and `model-performance` nodes
- [ ] Add basic community detection (model family, performance tier, capability cluster)
- [ ] Test with existing benchmark data

### Phase 2: Missing Score Detection Service ⏳  
**Timeline**: 1 week
- [ ] Create `MissingBenchmarkService` to query RAG for incomplete nodes
- [ ] Implement automatic benchmark scheduling
- [ ] Add priority scoring for benchmark jobs

### Phase 3: Graph Relationship Enhancement ⏳
**Timeline**: 2 weeks  
- [ ] Implement relationship detection between nodes
- [ ] Add community-based scoring and recommendations
- [ ] Enhanced model selection using graph data

### Phase 4: Integration & Testing ⏳
**Timeline**: 1 week
- [ ] Integration testing with orchestrator
- [ ] Performance testing with large benchmark datasets
- [ ] Documentation and monitoring

---

## Benefits

### **Immediate Value**
1. **Better Node Organization**: Separate concerns for servers, models, and performance combinations
2. **Automatic Gap Detection**: No more manual tracking of missing benchmarks
3. **Intelligent Queuing**: Priority-based benchmark scheduling
4. **Community Insights**: Understand model families and capabilities automatically

### **Long-term Value**  
1. **Graph-based Model Selection**: Use relationships for smarter recommendations
2. **Predictive Analytics**: Understand performance patterns across your infrastructure
3. **Scalable Architecture**: Support for growing numbers of servers and models
4. **Data-driven Decisions**: Evidence-based model deployment and retirement

---

## Success Metrics

1. **Coverage**: % of model-server combinations with complete benchmark scores
2. **Freshness**: Average age of benchmark data across the system
3. **Accuracy**: Quality of community detection and relationship identification
4. **Performance**: Benchmark scheduling efficiency and queue optimization
5. **Selection Quality**: Improvement in model selection accuracy using graph data
