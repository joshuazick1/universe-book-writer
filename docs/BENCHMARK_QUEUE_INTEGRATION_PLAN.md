# Benchmark Queue Integration Plan

## Overview

With the Universal Queue System now implemented, this document outlines the specific changes needed to integrate the benchmarking system with the new queue architecture. The goal is to replace the existing fragmented benchmark orchestration with a clean, dependency-aware queue-based approach.

## Current Benchmark System Analysis

### Existing Components
1. **`ai-server/benchmarking/BenchmarkingManager.ts`** - High-level benchmark orchestration
2. **`ai-server/benchmarking/benchmarkRunner.ts`** - Individual benchmark execution
3. **`ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts`** - Complex workflow orchestration (BACKUP)
4. **`ai-server/benchmarking/queueWorker.ts`** - Old queue worker implementation (BACKUP)
5. **`ai-server/benchmarking/benchmarkUtils.ts`** - Utility functions for benchmarks
6. **`ai-server/src/controllers/benchmarkManualController.ts`** - API endpoints

### Issues with Current System
- **Manual dependency management** - Cold → Warm → Quality dependencies handled with ad-hoc logic
- **No intelligent scheduling** - All jobs treated equally regardless of priority
- **Server affinity problems** - Benchmarks can run on wrong servers
- **No failure recovery** - If one benchmark fails, entire chain breaks
- **Complex state tracking** - Manual status management across multiple files

## Integration Strategy

### Phase 1: Queue Integration (Week 1)

#### 1.1. Update BenchmarkingManager

**File: `ai-server/benchmarking/BenchmarkingManager.ts`**

Replace manual orchestration with queue-based submission:

```typescript
// Replace existing runBenchmarksForModel method
export class BenchmarkingManager implements IBenchmarkingManager {
    constructor(
        private readonly queueService: UniversalQueueService,
        private readonly jobBuilder: JobBuilder
    ) {}

    async runBenchmarksForModel(
        modelId: string, 
        types: readonly BenchmarkType[]
    ): Promise<ModelQualityBenchmarks> {
        // Create benchmark workflow with dependencies
        const jobs = await this.createBenchmarkWorkflow(modelId, types);
        
        // Submit workflow to queue
        const results = await this.queueService.submitWorkflow(jobs);
        
        // Wait for completion and aggregate results
        return await this.aggregateResults(results);
    }

    private async createBenchmarkWorkflow(
        modelId: string, 
        types: readonly BenchmarkType[]
    ): Promise<UniversalJob[]> {
        const jobs: UniversalJob[] = [];
        const workflowId = `benchmark-${modelId}-${Date.now()}`;
        
        // Get available servers for this model
        const servers = await getServersForModel(modelId);
        
        for (const serverId of servers) {
            const serverJobs = await this.createServerBenchmarkChain(
                workflowId, serverId, modelId, types
            );
            jobs.push(...serverJobs);
        }
        
        return jobs;
    }

    private async createServerBenchmarkChain(
        workflowId: string,
        serverId: ServerId,
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<UniversalJob[]> {
        const jobs: UniversalJob[] = [];
        
        // Step 1: Cold latency (must be first)
        const coldLatencyJob = this.jobBuilder
            .create(JobType.COLD_LATENCY, { modelId, prompt: BENCHMARK_PROMPTS.LATENCY })
            .withTaskType(TaskType.QUESTION_ANSWERING)
            .withModel(modelId)
            .withPriority(JobPriority.HIGH)
            .withConstraints({
                serverAffinity: serverId,
                requiresModel: modelId,
                canSteal: false,
                stealable: false
            })
            .withMetadata({
                workflowId,
                serverId,
                benchmarkType: 'cold-latency'
            })
            .build();
        
        jobs.push(coldLatencyJob);
        let lastJobId = coldLatencyJob.id;
        
        // Step 2: Warm latencies (depends on cold)
        for (let i = 0; i < 3; i++) {
            const warmLatencyJob = this.jobBuilder
                .create(JobType.WARM_LATENCY, { modelId, prompt: BENCHMARK_PROMPTS.LATENCY })
                .withTaskType(TaskType.QUESTION_ANSWERING)
                .withModel(modelId)
                .withPriority(JobPriority.HIGH)
                .withDependencies([lastJobId])
                .withConstraints({
                    serverAffinity: serverId,
                    requiresModel: modelId,
                    canSteal: false,
                    stealable: false
                })
                .withMetadata({
                    workflowId,
                    serverId,
                    benchmarkType: 'warm-latency',
                    iteration: i + 1
                })
                .build();
            
            jobs.push(warmLatencyJob);
        }
        
        // Step 3: Quality benchmarks (depends on cold latency)
        for (const benchmarkType of types) {
            const qualityJob = this.jobBuilder
                .create(JobType.QUALITY_BENCHMARK, { 
                    modelId, 
                    benchmarkType,
                    prompt: BENCHMARK_PROMPTS[benchmarkType] 
                })
                .withTaskType(this.mapBenchmarkToTaskType(benchmarkType))
                .withModel(modelId)
                .withPriority(JobPriority.NORMAL)
                .withDependencies([coldLatencyJob.id])
                .withConstraints({
                    serverAffinity: serverId,
                    requiresModel: modelId,
                    canSteal: false,
                    stealable: false
                })
                .withMetadata({
                    workflowId,
                    serverId,
                    benchmarkType: benchmarkType
                })
                .build();
            
            jobs.push(qualityJob);
        }
        
        return jobs;
    }
}
```

#### 1.2. Create Benchmark Job Executors

**New File: `ai-server/src/executors/benchmark-executor.ts`**

```typescript
/**
 * Benchmark-specific job executors that integrate with the queue system
 */
import { JobExecutor } from '../services/universal-queue.service.js';
import { benchmarkTypeMap } from '../../benchmarking/benchmarkUtils.js';

export class BenchmarkJobExecutor implements JobExecutor {
    async execute(job: UniversalJob): Promise<JobExecutionResult> {
        const startTime = Date.now();
        
        try {
            let result: any;
            
            switch (job.type) {
                case JobType.COLD_LATENCY:
                    result = await this.executeColdLatency(job);
                    break;
                    
                case JobType.WARM_LATENCY:
                    result = await this.executeWarmLatency(job);
                    break;
                    
                case JobType.QUALITY_BENCHMARK:
                    result = await this.executeQualityBenchmark(job);
                    break;
                    
                default:
                    throw new Error(`Unsupported benchmark job type: ${job.type}`);
            }
            
            return {
                jobId: job.id,
                success: true,
                result,
                executionTimeMs: Date.now() - startTime,
                serverId: job.constraints.serverAffinity!
            };
            
        } catch (error) {
            return {
                jobId: job.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
                serverId: job.constraints.serverAffinity!
            };
        }
    }

    private async executeColdLatency(job: UniversalJob): Promise<any> {
        const { modelId, prompt } = job.payload;
        const serverId = job.constraints.serverAffinity!;
        
        // Ensure model is not loaded (cold start)
        await this.ensureModelUnloaded(serverId, modelId);
        
        // Measure latency
        const startTime = performance.now();
        const response = await callModelAPI(serverId, modelId, prompt);
        const latencyMs = performance.now() - startTime;
        
        return {
            latencyMs,
            response,
            modelId,
            serverId,
            timestamp: new Date().toISOString()
        };
    }

    private async executeWarmLatency(job: UniversalJob): Promise<any> {
        const { modelId, prompt } = job.payload;
        const serverId = job.constraints.serverAffinity!;
        
        // Model should already be loaded from previous calls
        const startTime = performance.now();
        const response = await callModelAPI(serverId, modelId, prompt);
        const latencyMs = performance.now() - startTime;
        
        return {
            latencyMs,
            response,
            modelId,
            serverId,
            iteration: job.metadata.iteration,
            timestamp: new Date().toISOString()
        };
    }

    private async executeQualityBenchmark(job: UniversalJob): Promise<any> {
        const { modelId, benchmarkType, prompt } = job.payload;
        const serverId = job.constraints.serverAffinity!;
        
        // Use existing benchmark utilities
        const benchmarkFn = benchmarkTypeMap[benchmarkType];
        if (!benchmarkFn) {
            throw new Error(`Unknown benchmark type: ${benchmarkType}`);
        }
        
        const score = await benchmarkFn(modelId, serverId, prompt);
        
        return {
            benchmarkType,
            score,
            modelId,
            serverId,
            timestamp: new Date().toISOString()
        };
    }
}
```

#### 1.3. Update Manual Benchmark Controller

**File: `ai-server/src/controllers/benchmarkManualController.ts`**

Replace direct orchestration calls with queue submissions:

```typescript
export class BenchmarkManualController {
    constructor(
        private readonly queueService: UniversalQueueService,
        private readonly benchmarkManager: BenchmarkingManager
    ) {}

    async runManualBenchmarks(request: ManualBenchmarkRequest): Promise<ManualBenchmarkResponse> {
        const { modelId, serverIds, benchmarkTypes } = request;
        
        try {
            // Use BenchmarkingManager with queue integration
            const results = await this.benchmarkManager.runBenchmarksForModel(
                modelId, 
                benchmarkTypes
            );
            
            return {
                success: true,
                workflowId: results.workflowId,
                scheduledJobs: results.jobIds,
                estimatedCompletionTime: results.estimatedCompletionTime
            };
            
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async getBenchmarkStatus(workflowId: string): Promise<BenchmarkStatusResponse> {
        // Query queue service for workflow status
        const jobs = await this.queueService.getWorkflowJobs(workflowId);
        
        const status = {
            workflowId,
            totalJobs: jobs.length,
            completed: jobs.filter(j => j.status === 'completed').length,
            running: jobs.filter(j => j.status === 'running').length,
            failed: jobs.filter(j => j.status === 'failed').length,
            pending: jobs.filter(j => j.status === 'pending').length
        };
        
        return status;
    }
}
```

### Phase 2: Remove Legacy Components (Week 1)

#### 2.1. Files to Delete

1. **`ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts`** ✅ (Already in backup)
2. **`ai-server/benchmarking/queueWorker.ts`** ✅ (Already in backup)

#### 2.2. Files to Update

**File: `ai-server/benchmarking/benchmarkUtils.ts`**
- Keep utility functions (they're still useful)
- Remove any queue-specific logic
- Focus on pure benchmark execution functions

### Phase 3: Enhanced Features (Week 2)

#### 3.1. Intelligent Model Selection for Benchmarks

```typescript
// Add to BenchmarkingManager
private mapBenchmarkToTaskType(benchmarkType: BenchmarkType): TaskType {
    switch (benchmarkType) {
        case BenchmarkType.JSON_ASSEMBLY:
            return TaskType.JSON_GENERATION;
        case BenchmarkType.CREATIVE_WRITING:
            return TaskType.CREATIVE_WRITING;
        case BenchmarkType.TYPESCRIPT_QUALITY:
            return TaskType.CODE_GENERATION;
        case BenchmarkType.TASK_PLANNING:
            return TaskType.DATA_ANALYSIS;
        default:
            return TaskType.QUESTION_ANSWERING;
    }
}
```

#### 3.2. Benchmark Result Aggregation

**New File: `ai-server/src/services/benchmark-aggregation.service.ts`**

```typescript
export class BenchmarkAggregationService {
    async aggregateWorkflowResults(
        workflowId: string
    ): Promise<ModelQualityBenchmarks> {
        const jobs = await this.queueService.getWorkflowJobs(workflowId);
        const completedJobs = jobs.filter(j => j.status === 'completed');
        
        // Group by server
        const serverResults = this.groupJobsByServer(completedJobs);
        
        // Aggregate latency results
        const latencyResults = this.aggregateLatencyResults(serverResults);
        
        // Aggregate quality results
        const qualityResults = this.aggregateQualityResults(serverResults);
        
        return {
            modelId: jobs[0]?.modelId,
            latencyBenchmarks: latencyResults,
            qualityBenchmarks: qualityResults,
            timestamp: new Date().toISOString(),
            workflowId
        };
    }

    private aggregateLatencyResults(serverResults: Map<string, any[]>): LatencyBenchmarks {
        const results: LatencyBenchmarks = {
            coldLatency: [],
            warmLatency: []
        };
        
        for (const [serverId, jobs] of serverResults) {
            const coldJobs = jobs.filter(j => j.type === JobType.COLD_LATENCY);
            const warmJobs = jobs.filter(j => j.type === JobType.WARM_LATENCY);
            
            if (coldJobs.length > 0) {
                results.coldLatency.push({
                    serverId,
                    latencyMs: coldJobs[0].result.latencyMs,
                    timestamp: coldJobs[0].result.timestamp
                });
            }
            
            if (warmJobs.length > 0) {
                const avgLatency = warmJobs.reduce(
                    (sum, job) => sum + job.result.latencyMs, 0
                ) / warmJobs.length;
                
                results.warmLatency.push({
                    serverId,
                    avgLatencyMs: avgLatency,
                    samples: warmJobs.length,
                    timestamp: warmJobs[0].result.timestamp
                });
            }
        }
        
        return results;
    }
}
```

#### 3.3. Benchmark Performance Tracking

Integrate with the existing model performance tracking:

```typescript
// Update UniversalQueueService.completeJob to track benchmark data
if (job.category === JobCategory.BENCHMARK && result.success) {
    await this.updateBenchmarkPerformanceData(job, result);
}

private async updateBenchmarkPerformanceData(
    job: UniversalJob, 
    result: JobExecutionResult
): Promise<void> {
    const benchmarkData: ModelBenchmarks = {
        modelId: job.modelId,
        taskType: job.constraints.modelRequirements?.taskType || TaskType.QUESTION_ANSWERING,
        avgLatencyMs: result.executionTimeMs,
        qualityScore: this.extractQualityScore(result),
        serverId: result.serverId,
        lastUpdated: new Date()
    };
    
    await this.benchmarkData.recordBenchmarkResult(benchmarkData);
}
```

## Implementation Priority

### Week 1: Core Integration ✅ 
1. ✅ Universal Queue System implemented
2. ✅ Update `BenchmarkingManager.ts` to use queue
3. ✅ Create `BenchmarkJobExecutor`
4. ✅ Update `benchmarkRunner.ts` with queue compatibility
5. 🎯 Update `benchmarkManualController.ts`
6. 🎯 Remove legacy orchestration files

### Week 2: Enhanced Features
1. Add intelligent model selection for benchmarks
2. Implement benchmark result aggregation service
3. Add benchmark performance tracking
4. Add workflow status monitoring
5. Add failure recovery and retry logic

## Migration Strategy

### Step 1: Preparation
- Backup existing benchmark files ✅ (Already done)
- Ensure Universal Queue System is fully tested ✅

### Step 2: Gradual Replacement
- Start with `BenchmarkingManager` integration
- Update manual controller endpoints
- Test with small benchmark workflows
- Gradually phase out legacy orchestration

### Step 3: Testing
- Test cold → warm → quality dependency chains
- Test server affinity constraints
- Test failure scenarios and recovery
- Test concurrent benchmark workflows

### Step 4: Cleanup
- Remove backup files after successful migration
- Update documentation
- Update API documentation

## Expected Benefits

### Performance Improvements
- **Parallel execution** across servers with proper dependencies
- **Intelligent scheduling** based on server performance
- **Resource optimization** through load balancing
- **Faster failure recovery** with retry mechanisms

### Maintainability Improvements
- **Single queue system** for all job types
- **Clean dependency management** with topological sorting
- **Centralized job tracking** and status monitoring
- **Simplified error handling** and debugging

### Scalability Improvements
- **Server affinity** ensures benchmarks run on correct servers
- **Job stealing** for better resource utilization (where appropriate)
- **Workflow orchestration** handles complex benchmark chains
- **Performance tracking** improves future scheduling decisions

## Success Criteria

### Functional Requirements
- ✅ All existing benchmark types continue to work
- ✅ Dependencies are properly enforced (cold → warm → quality)
- ✅ Server affinity is respected for benchmark accuracy
- ✅ Results are aggregated and stored correctly
- ✅ API endpoints maintain backward compatibility

### Performance Requirements
- 🎯 30% reduction in benchmark orchestration overhead
- 🎯 50% faster parallel execution across servers
- 🎯 90% reduction in failed benchmarks due to improper scheduling
- 🎯 Real-time status monitoring for benchmark workflows

### Operational Requirements
- 🎯 Zero-downtime migration from legacy system
- 🎯 Complete observability of benchmark workflows
- 🎯 Automatic recovery from server failures
- 🎯 Consistent benchmark data quality

This plan provides a clean migration path from the current fragmented benchmark orchestration to a robust, queue-based system that leverages all the intelligent features of the Universal Queue System.
