# Usage Tracking Integration Guide

## Overview

The enhanced `ModelPerformanceRAGService` now includes comprehensive usage tracking functionality that records every time the orchestrator chooses a model/server combination. This enables detailed analytics, trend analysis, and optimization insights.

## Key Features

### 1. Real-time Usage Tracking
- **Method**: `incrementUsageTally(serverId, modelName, requestMetadata?)`
- **Purpose**: Called every time the orchestrator selects a model/server for inference
- **Data Captured**:
  - Request timestamp
  - Task type (e.g., 'text-generation', 'code-generation', 'reasoning')
  - Request size ('small', 'medium', 'large')
  - Priority level ('low', 'normal', 'high')
  - User context
  - Request ID for correlation

### 2. Time-Range Analytics
- **Method**: `getUsageStatsByTimeRange(timeRange, filters?)`
- **Features**:
  - Filter by date range (any custom period)
  - Optional filters by server, model, task type, or priority
  - Returns aggregated statistics and time-series data
  - Task type breakdowns and server/model distributions

### 3. Automatic Frequency Calculations
- **Real-time metrics**: last 24h, 7d, 30d usage counts
- **Peak day tracking**: highest single-day usage
- **Usage patterns**: most common task types, request sizes, priorities
- **Smart tagging**: automatic categorization based on usage levels

## Integration Steps

### Step 1: Orchestrator Integration

When the orchestrator chooses a model/server combination, call the usage tracking method:

```typescript
// In your AI Orchestrator
async selectModelForTask(taskType: string, requirements: any) {
    // Your existing model selection logic
    const selectedServer = this.selectBestServer(requirements);
    const selectedModel = this.selectBestModel(selectedServer, taskType);
    
    // NEW: Track the selection
    await this.performanceRAGService.incrementUsageTally(
        selectedServer.id,
        selectedModel,
        {
            requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userContext: request.userId || 'anonymous',
            taskType: taskType,
            requestSize: this.categorizeRequestSize(request),
            priority: request.priority || 'normal'
        }
    );
    
    return { server: selectedServer, model: selectedModel };
}
```

### Step 2: Analytics Dashboard Integration

Create analytics endpoints using the time-range filtering:

```typescript
// Analytics API endpoints
app.get('/api/analytics/usage/daily', async (req, res) => {
    const stats = await performanceRAGService.getUsageStatsByTimeRange({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
    });
    res.json(stats);
});

app.get('/api/analytics/usage/weekly', async (req, res) => {
    const stats = await performanceRAGService.getUsageStatsByTimeRange({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
    }, {
        taskType: req.query.taskType,
        serverId: req.query.serverId
    });
    res.json(stats);
});

app.get('/api/analytics/usage/model/:modelName', async (req, res) => {
    const stats = await performanceRAGService.getUsageStatsByTimeRange({
        startDate: new Date(req.query.startDate),
        endDate: new Date(req.query.endDate)
    }, {
        modelName: req.params.modelName
    });
    res.json(stats);
});
```

### Step 3: Monitoring and Alerts

Use the analytics for automated monitoring:

```typescript
// Usage monitoring service
class UsageMonitor {
    async checkUnusualPatterns() {
        const last24h = await performanceRAGService.getUsageStatsByTimeRange({
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: new Date()
        });
        
        // Check for unusual spikes
        const avgDailyRequests = last24h.totalRequests;
        const recentHour = await performanceRAGService.getUsageStatsByTimeRange({
            startDate: new Date(Date.now() - 60 * 60 * 1000),
            endDate: new Date()
        });
        
        if (recentHour.totalRequests > avgDailyRequests * 0.5) {
            this.sendAlert('High usage detected in last hour');
        }
        
        // Check for failed model selections
        const lowUsageModels = last24h.topCombinations.filter(combo => 
            combo.requestCount === 0
        );
        
        if (lowUsageModels.length > 0) {
            this.sendAlert('Some models have not been used recently');
        }
    }
}
```

## Data Structure

### Usage History Entry
```typescript
{
    timestamp: Date,
    requestId: string,
    userContext: string,
    taskType: string,
    requestSize: 'small' | 'medium' | 'large',
    priority: 'low' | 'normal' | 'high'
}
```

### Performance Node Attributes (Enhanced)
```typescript
{
    serverId: string,
    modelName: string,
    totalUsageCount: number,
    usageHistory: UsageHistoryEntry[],
    lastUsed: Date,
    usageFrequency: {
        last24h: number,
        last7d: number,
        last30d: number,
        averagePerDay: number,
        peakDay: number
    },
    usagePatterns: {
        taskTypes: Record<string, number>,
        mostCommonTaskType: string,
        requestSizeDistribution: Record<string, number>,
        priorityDistribution: Record<string, number>
    }
}
```

### Time-Range Statistics Response
```typescript
{
    totalRequests: number,
    uniqueCombinations: number,
    topCombinations: Array<{
        serverId: string,
        serverUrl: string,
        modelName: string,
        requestCount: number,
        averageRequestsPerDay: number,
        taskTypeBreakdown: Record<string, number>
    }>,
    timeSeriesData: Array<{
        date: string,
        requestCount: number,
        uniqueCombinations: number
    }>,
    taskTypeStats: Record<string, number>,
    serverStats: Record<string, number>,
    modelStats: Record<string, number>
}
```

## Usage Patterns and Analytics

### Example Queries

1. **Most Popular Models This Week**:
   ```typescript
   const weeklyStats = await getUsageStatsByTimeRange({
       startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
       endDate: new Date()
   });
   console.log('Top models:', weeklyStats.modelStats);
   ```

2. **Code Generation Task Analysis**:
   ```typescript
   const codeStats = await getUsageStatsByTimeRange({
       startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
       endDate: new Date()
   }, { taskType: 'code-generation' });
   ```

3. **Server Load Distribution**:
   ```typescript
   const serverLoad = await getUsageStatsByTimeRange({
       startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
       endDate: new Date()
   });
   console.log('Server distribution:', serverLoad.serverStats);
   ```

### Optimization Insights

The usage tracking enables several optimization strategies:

1. **Load Balancing**: Identify overloaded servers and redistribute models
2. **Model Retirement**: Find unused models that can be safely removed
3. **Capacity Planning**: Predict future resource needs based on trends
4. **Performance Correlation**: Link usage patterns to performance metrics
5. **User Behavior Analysis**: Understand how different task types are used

## Performance Considerations

- **Storage**: Usage history is limited to 1000 entries per model/server combination
- **Indexing**: The system automatically indexes by timestamp, task type, and server/model
- **Cleanup**: Old usage data older than configured retention period is automatically removed
- **Caching**: Frequently accessed statistics are cached for improved performance

## Monitoring and Maintenance

### Health Checks
```typescript
// Check if usage tracking is working
const recentUsage = await getUsageStatsByTimeRange({
    startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    endDate: new Date()
});

if (recentUsage.totalRequests === 0) {
    console.warn('No usage recorded in the last hour - check orchestrator integration');
}
```

### Data Validation
```typescript
// Validate usage data integrity
const allTimeStats = await getUsageStatsByTimeRange({
    startDate: new Date(0),
    endDate: new Date()
});

console.log(`Total tracked requests: ${allTimeStats.totalRequests}`);
console.log(`Active combinations: ${allTimeStats.uniqueCombinations}`);
```

This enhanced usage tracking system provides the foundation for intelligent AI orchestration, enabling data-driven decisions about model deployment, server allocation, and performance optimization.
