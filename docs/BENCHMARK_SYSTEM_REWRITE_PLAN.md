# AI Benchmarking System Complete Rewrite Plan

## Executive Summary

The current benchmarking system is fundamentally flawed and must be completely rebuilt from the ground up. This document outlines a comprehensive plan to trash the existing system and implement a clean, maintainable, and scalable architecture that follows modern distributed systems principles.

## Critical Issues with Current System

### 1. **Architectural Chaos**
- **Multiple overlapping queue systems**: We have at least 3 different queueing mechanisms:
  - `ai-server/src/queueSystem.ts` (in-memory, ad-hoc)
  - `backend/infrastructure/queue/bullmqQueue.ts` (BullMQ-based, proper distributed queue)
  - Custom benchmark orchestration with manual Promise.all coordination
- **No clear separation of concerns**: Business logic mixed with infrastructure concerns
- **Circular dependencies**: Files importing each other in complex webs
- **Inconsistent data models**: Different interfaces for the same concepts across modules

### 2. **Code Quality Disasters**
- **Massive files**: `orchestrateEnhancedBenchmarks.ts` is unreadable and unmaintainable
- **Copy-paste programming**: Similar logic duplicated across multiple files
- **No proper error handling**: Jobs fail silently or with cryptic errors
- **Mock/placeholder code in production**: Comments like "TODO: Implement actual server call"
- **Inconsistent naming**: Job, Task, Entry, Request used interchangeably

### 3. **Technical Debt Overwhelming**
- **In-memory state everywhere**: No persistence, restarts lose all state
- **No proper testing**: Complex orchestration logic with minimal test coverage
- **Performance anti-patterns**: Polling loops, excessive object creation, memory leaks
- **No observability**: Can't debug what's happening in the system

### 4. **Business Logic Problems**
- **Unclear job dependencies**: Cold/warm/quality dependencies managed with brittle ad-hoc logic
- **No failure recovery**: If any step fails, entire benchmark chain breaks
- **No proper prioritization**: All jobs treated equally regardless of importance
- **No resource management**: Can overwhelm servers with concurrent requests

## New Architecture Vision

### Core Principles
1. **Single Source of Truth**: One queue system, one job model, one orchestrator
2. **Clean Architecture**: Clear layers with proper dependency injection
3. **Event-Driven**: Asynchronous, reactive system design
4. **Fault Tolerant**: Graceful degradation and recovery
5. **Observable**: Full tracing, metrics, and debugging capabilities
6. **Testable**: Every component unit and integration tested

### System Components

#### 1. **Intelligent Multi-Queue Orchestration System**

The queue system is the heart of the orchestrator, handling ALL AI operations including:
- **Inference calls** (Ollama, OpenAI compatible)
- **Benchmark jobs** (cold latency, warm latency, quality tests)
- **RAG pipeline jobs** (chunking, summarization, entity extraction, embedding)
- **Health checks** and **model discovery**

```typescript
// Universal job interface - handles all types of AI work
interface UniversalJob {
  readonly id: JobId;
  readonly type: JobType;
  readonly category: JobCategory;
  readonly modelId: string;
  readonly priority: JobPriority;
  readonly dependencies: readonly JobId[];
  readonly constraints: JobConstraints;
  readonly payload: JobPayload;
  readonly metadata: JobMetadata;
  readonly timeout: TimeoutConfig;
  readonly retryPolicy: RetryPolicy;
}

// Job categories for different orchestration strategies
enum JobCategory {
  INFERENCE = 'inference',           // Regular AI calls - can be load balanced
  BENCHMARK = 'benchmark',           // Must run on specific servers
  RAG_PIPELINE = 'rag-pipeline',     // Complex dependency chains
  HEALTH_CHECK = 'health-check',     // System maintenance
  EMBEDDING = 'embedding'            // Vector operations
}

// All job types in the system - covers ALL Ollama and OpenAI endpoints
enum JobType {
  // Ollama API endpoints (load balanced)
  OLLAMA_GENERATE = 'ollama-generate',           // /api/generate
  OLLAMA_CHAT = 'ollama-chat',                   // /api/chat
  OLLAMA_EMBEDDINGS = 'ollama-embeddings',       // /api/embeddings
  OLLAMA_PULL = 'ollama-pull',                   // /api/pull
  OLLAMA_PUSH = 'ollama-push',                   // /api/push
  OLLAMA_CREATE = 'ollama-create',               // /api/create
  OLLAMA_DELETE = 'ollama-delete',               // /api/delete
  OLLAMA_COPY = 'ollama-copy',                   // /api/copy
  OLLAMA_SHOW = 'ollama-show',                   // /api/show
  OLLAMA_TAGS = 'ollama-tags',                   // /api/tags
  OLLAMA_PS = 'ollama-ps',                       // /api/ps
  
  // OpenAI Compatible endpoints (load balanced)
  OPENAI_CHAT_COMPLETIONS = 'openai-chat-completions',     // /v1/chat/completions
  OPENAI_COMPLETIONS = 'openai-completions',               // /v1/completions
  OPENAI_EMBEDDINGS = 'openai-embeddings',                 // /v1/embeddings
  OPENAI_MODELS = 'openai-models',                         // /v1/models
  
  // Specialized inference jobs
  TEXT_GENERATION = 'text-generation',
  CODE_COMPLETION = 'code-completion',
  JSON_COMPLETION = 'json-completion',
  STRUCTURED_OUTPUT = 'structured-output',
  FUNCTION_CALLING = 'function-calling',
  
  // Benchmark jobs (server-specific)
  COLD_LATENCY = 'cold-latency',
  WARM_LATENCY = 'warm-latency',
  QUALITY_BENCHMARK = 'quality-benchmark',
  EMBEDDING_BENCHMARK = 'embedding-benchmark',
  
  // RAG pipeline jobs (dependency chains)
  TEXT_CHUNKING = 'text-chunking',
  SUMMARIZATION = 'summarization',
  ENTITY_EXTRACTION = 'entity-extraction',
  EMBEDDING_GENERATION = 'embedding-generation',
  VECTOR_SEARCH = 'vector-search',
  
  // System jobs
  SERVER_HEALTH_CHECK = 'server-health-check',
  MODEL_DISCOVERY = 'model-discovery',
  MODEL_MANAGEMENT = 'model-management'
}

// Job constraints determine scheduling behavior
interface JobConstraints {
  readonly serverAffinity?: ServerId;      // Must run on specific server
  readonly excludeServers?: ServerId[];    // Cannot run on these servers
  readonly requiresModel?: string;         // Specific model required (optional)
  readonly preferredModels?: string[];     // Preferred models for task type
  readonly modelRequirements?: ModelRequirements; // Task-specific model criteria
  readonly canSteal: boolean;              // Allows job stealing
  readonly stealable: boolean;             // Can be stolen by faster servers
  readonly maxConcurrency?: number;        // Limit concurrent instances
  readonly resourceRequirements?: ResourceRequirements;
}

// Model requirements for intelligent model selection
interface ModelRequirements {
  readonly taskType: TaskType;             // Type of task for model optimization
  readonly minQualityScore?: number;       // Minimum quality threshold
  readonly maxLatencyMs?: number;          // Maximum acceptable latency
  readonly preferAccuracy?: boolean;       // Prioritize accuracy over speed
  readonly preferSpeed?: boolean;          // Prioritize speed over accuracy
  readonly contextLength?: number;         // Required context window size
  readonly outputFormat?: OutputFormat;    // Required output format capabilities
  readonly specialFeatures?: string[];     // Special model features needed
}

// Task types for model optimization
enum TaskType {
  CREATIVE_WRITING = 'creative-writing',
  TECHNICAL_WRITING = 'technical-writing',
  CODE_GENERATION = 'code-generation',
  CODE_REVIEW = 'code-review',
  DATA_ANALYSIS = 'data-analysis',
  QUESTION_ANSWERING = 'question-answering',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  CONVERSATION = 'conversation',
  FUNCTION_CALLING = 'function-calling',
  JSON_GENERATION = 'json-generation',
  EMBEDDING_GENERATION = 'embedding-generation',
  CLASSIFICATION = 'classification',
  SENTIMENT_ANALYSIS = 'sentiment-analysis'
}

// Output format requirements
enum OutputFormat {
  PLAIN_TEXT = 'plain-text',
  MARKDOWN = 'markdown',
  JSON = 'json',
  XML = 'xml',
  CODE = 'code',
  STRUCTURED_DATA = 'structured-data'
}
```

#### 2. **Per-Server Queue Architecture**

```typescript
// Each server has its own queue for optimal load distribution
interface ServerQueue {
  readonly serverId: ServerId;
  readonly queueName: string;
  readonly jobs: Map<JobId, UniversalJob>;
  readonly inFlight: Set<JobId>;
  readonly capacity: ServerCapacity;
  readonly performance: PerformanceMetrics;
}

interface ServerCapacity {
  readonly maxConcurrentJobs: number;
  readonly currentLoad: number;
  readonly availableModels: string[];
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly gpuUsage?: number;
}

interface PerformanceMetrics {
  readonly avgResponseTime: number;
  readonly successRate: number;
  readonly throughput: number;
  readonly modelLoadTimes: Map<string, number>;
  readonly recentErrors: ErrorSummary[];
}
```

#### 3. **Intelligent Job Assignment Engine**

```typescript
class IntelligentJobScheduler {
  private readonly serverQueues: Map<ServerId, ServerQueue>;
  private readonly performanceTracker: PerformanceTracker;
  private readonly dependencyResolver: DependencyResolver;
  private readonly modelSelector: IntelligentModelSelector;
  
  async scheduleJob(job: UniversalJob): Promise<ScheduleResult> {
    // Step 1: Intelligent model selection based on task requirements
    const optimizedJob = await this.modelSelector.optimizeJobModel(job);
    
    // Step 2: Determine scheduling strategy based on job category
    const strategy = this.getSchedulingStrategy(optimizedJob.category);
    
    // Step 3: Find eligible servers with optimal model
    const eligibleServers = await this.findEligibleServers(optimizedJob);
    
    // Step 4: Rank servers by performance for this job type and model
    const rankedServers = await this.rankServersByPerformance(
      eligibleServers, 
      optimizedJob
    );
    
    // Step 5: Schedule with appropriate strategy
    return await strategy.schedule(optimizedJob, rankedServers);
  }
  
  private getSchedulingStrategy(category: JobCategory): SchedulingStrategy {
    switch (category) {
      case JobCategory.INFERENCE:
        return new LoadBalancedScheduling(); // Can steal jobs
      case JobCategory.BENCHMARK:
        return new ServerAffinityScheduling(); // Server-specific
      case JobCategory.RAG_PIPELINE:
        return new DependencyAwareScheduling(); // Respect dependencies
      default:
        return new DefaultScheduling();
    }
  }
}
```

#### 3.5. **Intelligent Model Selection Engine**

```typescript
/**
 * AI-powered model selection based on task type, performance benchmarks, and requirements
 */
class IntelligentModelSelector {
  private readonly benchmarkData: BenchmarkDataService;
  private readonly modelRegistry: ModelRegistryService;
  private readonly performancePredictor: ModelPerformancePredictor;
  
  /**
   * Optimize model selection for a job based on task requirements and performance data
   */
  async optimizeJobModel(job: UniversalJob): Promise<UniversalJob> {
    // If specific model is required, use it
    if (job.constraints.requiresModel) {
      return job;
    }
    
    // Get task requirements
    const requirements = job.constraints.modelRequirements;
    if (!requirements) {
      return job; // No optimization needed
    }
    
    // Find optimal model for task type
    const optimalModel = await this.findOptimalModel(requirements);
    
    // Update job with optimal model
    return {
      ...job,
      modelId: optimalModel.id,
      constraints: {
        ...job.constraints,
        requiresModel: optimalModel.id
      }
    };
  }
  
  /**
   * Find the optimal model based on task requirements and benchmark data
   */
  private async findOptimalModel(requirements: ModelRequirements): Promise<ModelInfo> {
    // Get all available models
    const availableModels = await this.modelRegistry.getAvailableModels();
    
    // Filter models by basic requirements
    const eligibleModels = availableModels.filter(model => 
      this.meetsBasicRequirements(model, requirements)
    );
    
    // Score models based on task type and requirements
    const scoredModels = await Promise.all(
      eligibleModels.map(async model => ({
        model,
        score: await this.calculateModelScore(model, requirements)
      }))
    );
    
    // Sort by score and return best model
    scoredModels.sort((a, b) => b.score - a.score);
    
    if (scoredModels.length === 0) {
      throw new Error(`No suitable model found for task type: ${requirements.taskType}`);
    }
    
    return scoredModels[0].model;
  }
  
  /**
   * Calculate comprehensive model score based on multiple factors
   */
  private async calculateModelScore(
    model: ModelInfo, 
    requirements: ModelRequirements
  ): Promise<number> {
    const weights = this.getTaskTypeWeights(requirements.taskType);
    
    // Get benchmark data for this model and task type
    const benchmarks = await this.benchmarkData.getModelBenchmarks(
      model.id, 
      requirements.taskType
    );
    
    if (!benchmarks) {
      // Use predicted performance for unknown models
      return await this.performancePredictor.predictScore(model, requirements);
    }
    
    let score = 0;
    
    // Quality score (0-100)
    if (benchmarks.qualityScore !== undefined) {
      const qualityWeight = requirements.preferAccuracy ? weights.quality * 1.5 : weights.quality;
      score += (benchmarks.qualityScore / 100) * qualityWeight;
    }
    
    // Speed score (inverse of latency, normalized)
    if (benchmarks.avgLatencyMs !== undefined) {
      const speedScore = Math.max(0, 100 - (benchmarks.avgLatencyMs / 50)); // 50ms = 0 score
      const speedWeight = requirements.preferSpeed ? weights.speed * 1.5 : weights.speed;
      score += (speedScore / 100) * speedWeight;
    }
    
    // Context length compatibility
    if (requirements.contextLength && model.contextLength) {
      const contextScore = model.contextLength >= requirements.contextLength ? 100 : 0;
      score += (contextScore / 100) * weights.contextLength;
    }
    
    // Output format compatibility
    if (requirements.outputFormat) {
      const formatScore = model.supportedFormats?.includes(requirements.outputFormat) ? 100 : 0;
      score += (formatScore / 100) * weights.outputFormat;
    }
    
    // Special features
    if (requirements.specialFeatures) {
      const featuresScore = this.calculateFeatureCompatibility(
        model.capabilities, 
        requirements.specialFeatures
      );
      score += (featuresScore / 100) * weights.specialFeatures;
    }
    
    // Resource efficiency
    const resourceScore = this.calculateResourceEfficiency(model, benchmarks);
    score += (resourceScore / 100) * weights.resourceEfficiency;
    
    // Apply requirements constraints
    if (requirements.maxLatencyMs && benchmarks.avgLatencyMs > requirements.maxLatencyMs) {
      score *= 0.5; // Heavy penalty for exceeding latency requirements
    }
    
    if (requirements.minQualityScore && benchmarks.qualityScore < requirements.minQualityScore) {
      score *= 0.3; // Heavy penalty for not meeting quality requirements
    }
    
    return score;
  }
  
  /**
   * Get task-specific weights for scoring criteria
   */
  private getTaskTypeWeights(taskType: TaskType): ModelScoringWeights {
    const baseWeights: ModelScoringWeights = {
      quality: 25,
      speed: 25,
      contextLength: 15,
      outputFormat: 10,
      specialFeatures: 15,
      resourceEfficiency: 10
    };
    
    switch (taskType) {
      case TaskType.CREATIVE_WRITING:
        return {
          ...baseWeights,
          quality: 40,
          speed: 15,
          contextLength: 25 // Long form content needs large context
        };
        
      case TaskType.CODE_GENERATION:
        return {
          ...baseWeights,
          quality: 35,
          specialFeatures: 25, // Function calling, structured output
          outputFormat: 20
        };
        
      case TaskType.REAL_TIME_CONVERSATION:
        return {
          ...baseWeights,
          speed: 45,
          quality: 20,
          resourceEfficiency: 15
        };
        
      case TaskType.DATA_ANALYSIS:
        return {
          ...baseWeights,
          quality: 35,
          specialFeatures: 30, // Structured output, reasoning
          contextLength: 20
        };
        
      case TaskType.EMBEDDING_GENERATION:
        return {
          ...baseWeights,
          speed: 35,
          resourceEfficiency: 25,
          quality: 25
        };
        
      default:
        return baseWeights;
    }
  }
  
  /**
   * Check if model meets basic requirements
   */
  private meetsBasicRequirements(
    model: ModelInfo, 
    requirements: ModelRequirements
  ): boolean {
    // Context length check
    if (requirements.contextLength && model.contextLength < requirements.contextLength) {
      return false;
    }
    
    // Output format check
    if (requirements.outputFormat && 
        !model.supportedFormats?.includes(requirements.outputFormat)) {
      return false;
    }
    
    // Special features check
    if (requirements.specialFeatures?.some(feature => 
        !model.capabilities?.includes(feature))) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate feature compatibility score
   */
  private calculateFeatureCompatibility(
    modelCapabilities: string[] = [], 
    requiredFeatures: string[]
  ): number {
    const supported = requiredFeatures.filter(feature => 
      modelCapabilities.includes(feature)
    );
    return (supported.length / requiredFeatures.length) * 100;
  }
  
  /**
   * Calculate resource efficiency score
   */
  private calculateResourceEfficiency(
    model: ModelInfo, 
    benchmarks: ModelBenchmarks
  ): number {
    // Factor in memory usage, throughput, and energy efficiency
    let score = 50; // Base score
    
    if (benchmarks.memoryUsageMB) {
      // Lower memory usage is better
      const memoryScore = Math.max(0, 100 - (benchmarks.memoryUsageMB / 100));
      score += memoryScore * 0.3;
    }
    
    if (benchmarks.tokensPerSecond) {
      // Higher throughput is better
      const throughputScore = Math.min(100, benchmarks.tokensPerSecond * 2);
      score += throughputScore * 0.4;
    }
    
    if (benchmarks.energyEfficiency) {
      score += benchmarks.energyEfficiency * 0.3;
    }
    
    return Math.min(100, score);
  }
}

/**
 * Model scoring weights for different criteria
 */
interface ModelScoringWeights {
  readonly quality: number;
  readonly speed: number;
  readonly contextLength: number;
  readonly outputFormat: number;
  readonly specialFeatures: number;
  readonly resourceEfficiency: number;
}

/**
 * Model information with capabilities
 */
interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number;
  readonly supportedFormats?: OutputFormat[];
  readonly capabilities?: string[];
  readonly memoryRequirementMB: number;
  readonly parameterCount?: number;
}

/**
 * Benchmark data for model performance
 */
interface ModelBenchmarks {
  readonly modelId: string;
  readonly taskType: TaskType;
  readonly qualityScore?: number;        // 0-100 quality rating
  readonly avgLatencyMs?: number;        // Average response time
  readonly tokensPerSecond?: number;     // Throughput metric
  readonly memoryUsageMB?: number;       // Memory consumption
  readonly energyEfficiency?: number;    // Energy usage score
  readonly successRate?: number;         // Completion success rate
  readonly lastUpdated: Date;
}

/**
 * ML-based performance prediction for unknown model/task combinations
 */
class ModelPerformancePredictor {
  private readonly modelFeatureExtractor: ModelFeatureExtractor;
  private readonly taskComplexityAnalyzer: TaskComplexityAnalyzer;
  
  async predictScore(
    model: ModelInfo, 
    requirements: ModelRequirements
  ): Promise<number> {
    // Extract model features (parameter count, architecture type, etc.)
    const modelFeatures = await this.modelFeatureExtractor.extract(model);
    
    // Analyze task complexity
    const taskComplexity = await this.taskComplexityAnalyzer.analyze(requirements);
    
    // Use ML model to predict performance
    const prediction = await this.performancePredictionModel.predict({
      modelFeatures,
      taskComplexity,
      requirements
    });
    
    return prediction.confidenceWeightedScore;
  }
}
```

#### 4. **Job Stealing Implementation**

```typescript
interface JobStealingEngine {
  /**
   * Continuously monitors server performance and steals jobs from slower servers
   */
  startJobStealingMonitor(): void;
  
  /**
   * Attempts to steal a job from a slower server
   */
  attemptJobSteal(fastServer: ServerId, slowServer: ServerId): Promise<JobStealResult>;
}

class SmartJobStealingEngine implements JobStealingEngine {
  async attemptJobSteal(
    fastServerId: ServerId, 
    slowServerId: ServerId
  ): Promise<JobStealResult> {
    const slowQueue = this.getServerQueue(slowServerId);
    const fastServer = await this.serverRegistry.getServer(fastServerId);
    
    // Find stealable jobs that aren't server-specific
    const stealableJobs = slowQueue.jobs.values()
      .filter(job => 
        job.constraints.stealable && 
        !job.constraints.serverAffinity &&
        fastServer.availableModels.includes(job.modelId) &&
        this.canServerHandleJob(fastServer, job)
      );
    
    if (stealableJobs.length === 0) {
      return { success: false, reason: 'No stealable jobs found' };
    }
    
    // Select best job to steal (highest priority, best fit)
    const jobToSteal = this.selectBestJobToSteal(stealableJobs, fastServer);
    
    // Create duplicate job for fast server (original continues on slow server)
    const duplicateJob = this.createDuplicateJob(jobToSteal, fastServerId);
    
    // Enqueue on fast server
    await this.enqueueJob(fastServerId, duplicateJob);
    
    // Set up race condition handler (first to complete wins)
    this.setupJobRaceHandler(jobToSteal.id, duplicateJob.id);
    
    return { 
      success: true, 
      originalJobId: jobToSteal.id,
      duplicateJobId: duplicateJob.id 
    };
  }
  
  private setupJobRaceHandler(originalJobId: JobId, duplicateJobId: JobId): void {
    // When either job completes, cancel the other and use the result
    this.jobCompletionEmitter.once('job-completed', (completedJobId: JobId, result: JobResult) => {
      if (completedJobId === originalJobId || completedJobId === duplicateJobId) {
        const otherJobId = completedJobId === originalJobId ? duplicateJobId : originalJobId;
        
        // Cancel the slower job
        this.cancelJob(otherJobId);
        
        // Use the result from the faster job
        this.publishJobResult(originalJobId, result); // Always use original ID for consistency
      }
    });
  }
}
```

#### 5. **Dependency-Aware Scheduling for Complex Workflows**

```typescript
interface DependencyGraph {
  readonly nodes: Map<JobId, JobNode>;
  readonly edges: Map<JobId, Set<JobId>>;
}

interface JobNode {
  readonly job: UniversalJob;
  readonly status: JobStatus;
  readonly dependents: Set<JobId>;     // Jobs that depend on this one
  readonly dependencies: Set<JobId>;   // Jobs this one depends on
  readonly estimatedDuration: number;
  readonly criticalPath: boolean;      // Is this job on the critical path?
}

class DependencyAwareScheduler {
  /**
   * Schedules complex workflows like RAG pipelines with proper dependency management
   */
  async scheduleWorkflow(jobs: UniversalJob[]): Promise<WorkflowExecutionPlan> {
    // Build dependency graph
    const graph = this.buildDependencyGraph(jobs);
    
    // Detect critical path for priority scheduling
    const criticalPath = this.findCriticalPath(graph);
    
    // Schedule jobs level by level, respecting dependencies
    const executionPlan = this.createExecutionPlan(graph, criticalPath);
    
    return executionPlan;
  }
  
  /**
   * Example: Text-to-RAG pipeline with proper dependencies
   */
  async scheduleTextToRAGPipeline(
    textContent: string,
    serverId?: ServerId
  ): Promise<WorkflowExecutionPlan> {
    const workflowId = generateWorkflowId();
    
    // Job 1: Text chunking (no dependencies)
    const chunkingJob: UniversalJob = {
      id: `${workflowId}-chunking`,
      type: JobType.TEXT_CHUNKING,
      category: JobCategory.RAG_PIPELINE,
      modelId: 'text-processing',
      priority: JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: 'text-processing',
        canSteal: true,
        stealable: true,
        serverAffinity: serverId // Optional server affinity
      },
      payload: { text: textContent },
      // ... other properties
    };
    
    // Job 2: Summarization (depends on chunking)
    const summarizationJob: UniversalJob = {
      id: `${workflowId}-summarization`,
      type: JobType.SUMMARIZATION,
      category: JobCategory.RAG_PIPELINE,
      modelId: 'llama3.2:latest',
      priority: JobPriority.NORMAL,
      dependencies: [chunkingJob.id],
      constraints: {
        requiresModel: 'llama3.2:latest',
        canSteal: true,
        stealable: true
      },
      payload: { dependsOnJob: chunkingJob.id },
      // ... other properties
    };
    
    // Job 3: Entity extraction (depends on chunking, parallel with summarization)
    const entityExtractionJob: UniversalJob = {
      id: `${workflowId}-entity-extraction`,
      type: JobType.ENTITY_EXTRACTION,
      category: JobCategory.RAG_PIPELINE,
      modelId: 'llama3.2:latest',
      priority: JobPriority.NORMAL,
      dependencies: [chunkingJob.id],
      constraints: {
        requiresModel: 'llama3.2:latest',
        canSteal: true,
        stealable: true
      },
      payload: { dependsOnJob: chunkingJob.id },
      // ... other properties
    };
    
    // Job 4: Embedding generation (depends on summarization and entity extraction)
    const embeddingJob: UniversalJob = {
      id: `${workflowId}-embedding`,
      type: JobType.EMBEDDING_GENERATION,
      category: JobCategory.RAG_PIPELINE,
      modelId: 'all-minilm',
      priority: JobPriority.NORMAL,
      dependencies: [summarizationJob.id, entityExtractionJob.id],
      constraints: {
        requiresModel: 'all-minilm',
        canSteal: false, // Embedding jobs are expensive, don't duplicate
        stealable: true
      },
      payload: { 
        dependsOnJobs: [summarizationJob.id, entityExtractionJob.id] 
      },
      // ... other properties
    };
    
    const jobs = [chunkingJob, summarizationJob, entityExtractionJob, embeddingJob];
    return await this.scheduleWorkflow(jobs);
  }
}
```

#### 6. **Benchmark-Specific Scheduling**

```typescript
/**
 * Benchmark jobs require server affinity and strict dependency ordering
 */
class BenchmarkScheduler {
  async scheduleBenchmarkSuite(
    modelId: string,
    serverId: ServerId,
    benchmarkTypes: BenchmarkType[]
  ): Promise<BenchmarkExecutionPlan> {
    const workflowId = generateWorkflowId();
    const jobs: UniversalJob[] = [];
    
    // Step 1: Cold latency test (must be first, server-specific)
    const coldLatencyJob: UniversalJob = {
      id: `${workflowId}-cold-latency`,
      type: JobType.COLD_LATENCY,
      category: JobCategory.BENCHMARK,
      modelId,
      priority: JobPriority.HIGH,
      dependencies: [],
      constraints: {
        serverAffinity: serverId,           // MUST run on this server
        requiresModel: modelId,
        canSteal: false,                    // Cannot steal benchmark jobs
        stealable: false,                   // Cannot be stolen
        maxConcurrency: 1                   // Only one at a time
      },
      payload: { 
        benchmarkType: 'cold-latency',
        modelId,
        serverId 
      },
      // ... other properties
    };
    jobs.push(coldLatencyJob);
    
    // Step 2: Warmup tests (depend on cold latency, server-specific)
    const warmupJobs: UniversalJob[] = [];
    for (let i = 0; i < 3; i++) {
      const warmupJob: UniversalJob = {
        id: `${workflowId}-warmup-${i}`,
        type: JobType.QUALITY_BENCHMARK,
        category: JobCategory.BENCHMARK,
        modelId,
        priority: JobPriority.HIGH,
        dependencies: [coldLatencyJob.id],
        constraints: {
          serverAffinity: serverId,         // MUST run on this server
          requiresModel: modelId,
          canSteal: false,
          stealable: false,
          maxConcurrency: 1
        },
        payload: { 
          benchmarkType: benchmarkTypes[i % benchmarkTypes.length],
          isWarmup: true,
          dependsOnJob: coldLatencyJob.id
        },
        // ... other properties
      };
      warmupJobs.push(warmupJob);
      jobs.push(warmupJob);
    }
    
    // Step 3: Warm latency tests (depend on warmup, server-specific)
    const warmLatencyJobs: UniversalJob[] = [];
    for (let i = 0; i < 3; i++) {
      const warmLatencyJob: UniversalJob = {
        id: `${workflowId}-warm-latency-${i}`,
        type: JobType.WARM_LATENCY,
        category: JobCategory.BENCHMARK,
        modelId,
        priority: JobPriority.HIGH,
        dependencies: warmupJobs.map(j => j.id), // Depends on ALL warmup jobs
        constraints: {
          serverAffinity: serverId,
          requiresModel: modelId,
          canSteal: false,
          stealable: false,
          maxConcurrency: 1
        },
        payload: { 
          benchmarkType: 'warm-latency',
          prompt: `protocol-compliance-prompt-${i}`,
          dependsOnJobs: warmupJobs.map(j => j.id)
        },
        // ... other properties
      };
      warmLatencyJobs.push(warmLatencyJob);
      jobs.push(warmLatencyJob);
    }
    
    // Step 4: Quality benchmarks (can run in parallel after warmup)
    benchmarkTypes.forEach(benchmarkType => {
      const qualityJob: UniversalJob = {
        id: `${workflowId}-quality-${benchmarkType}`,
        type: JobType.QUALITY_BENCHMARK,
        category: JobCategory.BENCHMARK,
        modelId,
        priority: JobPriority.NORMAL,
        dependencies: warmupJobs.map(j => j.id),
        constraints: {
          requiresModel: modelId,
          canSteal: false,    // Don't steal benchmarks
          stealable: false,   // But this could run on any server with the model
          maxConcurrency: 2   // Allow some parallelism for quality tests
        },
        payload: { 
          benchmarkType,
          dependsOnJobs: warmupJobs.map(j => j.id)
        },
        // ... other properties
      };
      jobs.push(qualityJob);
    });
    
    return await this.dependencyScheduler.scheduleWorkflow(jobs);
  }
}
```

#### 8. **Transparent Queue Integration - Preserve Existing API Behavior**

```typescript
// New file: ai-server/src/services/queue-proxy.service.ts
/**
 * Transparent proxy that routes existing Ollama endpoints through the queue system
 * Maintains exact same API behavior while adding intelligent load balancing
 */
@Injectable()
export class QueueProxyService {
  constructor(
    private readonly queueService: UniversalQueueService,
    private readonly serverRegistry: ServerRegistry,
    private readonly httpService: HttpService
  ) {}

  /**
   * Transparent proxy for /api/generate - maintains exact Ollama API behavior
   */
  async proxyGenerate(
    request: OllamaGenerateRequest,
    headers: any
  ): Promise<OllamaGenerateResponse> {
    // Create job for intelligent placement, but maintain exact API contract
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_GENERATE,
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: true,
        stealable: true
      },
      payload: request, // Pass through exact request
      timeout: { 
        executionTimeout: this.calculateTimeout(request),
        queueTimeout: 10000 // Quick queue timeout for API calls
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'linear'
      },
      metadata: {
        apiEndpoint: '/api/generate',
        originalHeaders: headers,
        source: 'ollama-proxy'
      }
    };
    
    // Get optimal server through intelligent placement
    const optimalServer = await this.queueService.getOptimalServerForJob(job);
    
    if (!optimalServer) {
      throw new Error('No available servers for model: ' + request.model);
    }
    
    // Forward request to optimal server with exact same format
    return await this.forwardToServer(optimalServer.baseUrl + '/api/generate', request, headers);
  }

  /**
   * Transparent proxy for /api/chat - maintains exact Ollama API behavior
   */
  async proxyChat(
    request: OllamaChatRequest,
    headers: any
  ): Promise<OllamaChatResponse> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_CHAT,
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: true,
        stealable: true
      },
      payload: request,
      timeout: { 
        executionTimeout: this.calculateTimeout(request),
        queueTimeout: 10000
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'linear'
      },
      metadata: {
        apiEndpoint: '/api/chat',
        originalHeaders: headers,
        source: 'ollama-proxy'
      }
    };
    
    const optimalServer = await this.queueService.getOptimalServerForJob(job);
    
    if (!optimalServer) {
      throw new Error('No available servers for model: ' + request.model);
    }
    
    return await this.forwardToServer(optimalServer.baseUrl + '/api/chat', request, headers);
  }

  /**
   * Handle streaming responses transparently
   */
  async proxyStreamingEndpoint(
    endpoint: string,
    request: any,
    headers: any
  ): Promise<ReadableStream> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: this.getJobTypeFromEndpoint(endpoint),
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: false, // Don't steal streaming jobs
        stealable: false
      },
      payload: request,
      timeout: { 
        executionTimeout: 300000, // 5 minutes for streaming
        queueTimeout: 5000        // Quick queue for streaming
      },
      retryPolicy: {
        maxAttempts: 1, // No retries for streaming
        backoffStrategy: 'none'
      },
      metadata: {
        apiEndpoint: endpoint,
        originalHeaders: headers,
        streaming: true,
        source: 'ollama-proxy'
      }
    };
    
    const optimalServer = await this.queueService.getOptimalServerForJob(job);
    
    if (!optimalServer) {
      throw new Error('No available servers for model: ' + request.model);
    }
    
    // Forward streaming request and return the stream directly
    return await this.forwardStreamingToServer(optimalServer.baseUrl + endpoint, request, headers);
  }

  /**
   * Forward request to specific server maintaining exact API contract
   */
  private async forwardToServer(
    url: string,
    request: any,
    headers: any
  ): Promise<any> {
    try {
      const response = await this.httpService.post(url, request, {
        headers: {
          'Content-Type': 'application/json',
          ...this.filterHeaders(headers) // Only forward relevant headers
        },
        timeout: this.calculateTimeout(request)
      }).toPromise();
      
      return response.data;
    } catch (error) {
      // Log the intelligent placement decision for debugging
      console.log(`Request failed on server ${url}, could retry on different server`);
      throw error;
    }
  }

  /**
   * Forward streaming request maintaining exact stream behavior
   */
  private async forwardStreamingToServer(
    url: string,
    request: any,
    headers: any
  ): Promise<ReadableStream> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.filterHeaders(headers)
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    // Return the stream exactly as received from Ollama
    return response.body!;
  }

  private filterHeaders(headers: any): Record<string, string> {
    // Only forward headers that Ollama cares about
    const allowedHeaders = ['authorization', 'user-agent', 'accept'];
    const filtered: Record<string, string> = {};
    
    for (const header of allowedHeaders) {
      if (headers[header]) {
        filtered[header] = headers[header];
      }
    }
    
    return filtered;
  }

  private getJobTypeFromEndpoint(endpoint: string): JobType {
    switch (endpoint) {
      case '/api/generate': return JobType.OLLAMA_GENERATE;
      case '/api/chat': return JobType.OLLAMA_CHAT;
      case '/api/embeddings': return JobType.OLLAMA_EMBEDDINGS;
      default: return JobType.OLLAMA_GENERATE;
    }
  }

  private calculateTimeout(request: any): number {
    // Base timeout on request complexity
    const hasMessages = request.messages?.length || 0;
    const maxTokens = request.options?.num_predict || 100;
    
    const baseTimeout = 30000; // 30 seconds
    const messageMultiplier = Math.min(hasMessages * 1000, 30000);
    const tokenMultiplier = Math.min(maxTokens * 100, 60000);
    
    return baseTimeout + messageMultiplier + tokenMultiplier;
  }
}

// Updated existing controllers to use the proxy service
// New file: ai-server/src/controllers/ollama-proxy.controller.ts
@Controller()
export class OllamaProxyController {
  constructor(
    private readonly queueProxy: QueueProxyService
  ) {}

  @Post('/api/generate')
  async generate(
    @Body() request: OllamaGenerateRequest,
    @Headers() headers: any,
    @Res() res: Response
  ) {
    if (request.stream) {
      // Handle streaming response
      const stream = await this.queueProxy.proxyStreamingEndpoint('/api/generate', request, headers);
      
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // Handle regular response
      const result = await this.queueProxy.proxyGenerate(request, headers);
      res.json(result);
    }
  }

  @Post('/api/chat')
  async chat(
    @Body() request: OllamaChatRequest,
    @Headers() headers: any,
    @Res() res: Response
  ) {
    if (request.stream) {
      const stream = await this.queueProxy.proxyStreamingEndpoint('/api/chat', request, headers);
      
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const result = await this.queueProxy.proxyChat(request, headers);
      res.json(result);
    }
  }

  @Post('/api/embeddings')
  async embeddings(
    @Body() request: OllamaEmbeddingsRequest,
    @Headers() headers: any
  ): Promise<OllamaEmbeddingsResponse> {
    // Embeddings are typically not streamed
    return await this.queueProxy.proxyEmbeddings(request, headers);
```

#### 9. **Enhanced Queue Service for Intelligent Server Selection**

```typescript
// Enhancement to: ai-server/src/services/universal-queue.service.ts
export class UniversalQueueService {
  // ... existing code ...

  /**
   * Get optimal server for a job without queuing it
   * Used by the proxy service for immediate intelligent placement
   */
  async getOptimalServerForJob(job: UniversalJob): Promise<ServerInfo | null> {
    // Find all servers that can handle this job
    const eligibleServers = await this.findEligibleServers(job);
    
    if (eligibleServers.length === 0) {
      return null;
    }
    
    // Use the intelligent load balancer to select best server
    const optimalServerId = await this.loadBalancer.selectOptimalServer(job, eligibleServers);
    
    if (!optimalServerId) {
      return null;
    }
    
    // Return server info for direct connection
    return await this.serverRegistry.getServer(optimalServerId);
  }

  /**
   * Find all servers that can handle a specific job
   */
  private async findEligibleServers(job: UniversalJob): Promise<ServerInfo[]> {
    const allServers = await this.serverRegistry.getAllServers();
    
    return allServers.filter(server => {
      // Server must be healthy
      if (!server.isHealthy) return false;
      
      // Server must have the required model
      if (!server.availableModels.includes(job.modelId) && 
          !server.loadedModels.includes(job.modelId)) {
        return false;
      }
      
      // Check exclusion constraints
      if (job.constraints.excludeServers?.includes(server.id)) {
        return false;
      }
      
      // Check server affinity (for benchmarks)
      if (job.constraints.serverAffinity && 
          job.constraints.serverAffinity !== server.id) {
        return false;
      }
      
      // Check resource requirements
      if (job.constraints.resourceRequirements) {
        const reqs = job.constraints.resourceRequirements;
        
        if (reqs.minMemoryMB && server.availableMemoryMB < reqs.minMemoryMB) {
          return false;
        }
        
        if (reqs.requireGPU && !server.hasGPU) {
          return false;
        }
      }
      
      // Check if server has capacity
      if (server.currentLoad >= 1.0) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Record metrics for proxy decisions to improve future placements
   */
  async recordProxyDecision(
    job: UniversalJob,
    selectedServer: ServerId,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    await this.metricsService.recordDecision({
      jobType: job.type,
      modelId: job.modelId,
      selectedServer,
      responseTime,
      success,
      timestamp: Date.now(),
      loadAtSelection: await this.serverRegistry.getServerLoad(selectedServer),
      queueDepthAtSelection: await this.getServerQueueDepth(selectedServer)
    });
    
    // Update server performance metrics for future decisions
    await this.loadBalancer.updateServerPerformance(selectedServer, {
      jobType: job.type,
      modelId: job.modelId,
      responseTime,
      success
    });
  }
}
```

#### 10. **Middleware for Transparent Integration**

```typescript
// New file: ai-server/src/middleware/queue-integration.middleware.ts
/**
 * Middleware that transparently integrates queue-based intelligent placement
 * into existing API endpoints without changing their behavior
 */
@Injectable()
export class QueueIntegrationMiddleware implements NestMiddleware {
  constructor(
    private readonly queueService: UniversalQueueService,
    private readonly metricsService: MetricsService
  ) {}
  
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const originalUrl = req.originalUrl;
    
    // Only apply to Ollama API endpoints
    if (this.isOllamaEndpoint(originalUrl)) {
      // Add queue placement info to request for debugging
      req['queuePlacement'] = {
        enabled: true,
        timestamp: startTime,
        endpoint: originalUrl
      };
      
      // Intercept response to record metrics
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Record API performance for queue optimization
        this.metricsService.recordAPICall({
          endpoint: originalUrl,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          modelId: req.body?.model,
          hasStream: req.body?.stream,
          requestSize: JSON.stringify(req.body).length,
          responseSize: typeof data === 'string' ? data.length : JSON.stringify(data).length
        });
        
        return originalSend.call(this, data);
      }.bind(this);
    }
    
    next();
  }
  
  private isOllamaEndpoint(url: string): boolean {
    const ollamaEndpoints = [
      '/api/generate',
      '/api/chat', 
      '/api/embeddings',
      '/api/pull',
      '/api/push',
      '/api/create',
      '/api/delete',
      '/api/copy',
      '/api/show',
      '/api/tags',
      '/api/ps'
    ];
    
    return ollamaEndpoints.some(endpoint => url.startsWith(endpoint));
  }
}
  
  @Post('/api/chat')
  async ollamaChat(
    @Body() request: OllamaChatRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaChatResponse> {
    await this.validateAndRateLimit(req, 'chat');
    
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_CHAT,
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: this.determinePriority(headers),
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: true,
        stealable: true,
        excludeServers: this.getExcludedServers(headers)
      },
      payload: {
        model: request.model,
        messages: request.messages,
        stream: request.stream,
        format: request.format,
        options: request.options,
        tools: request.tools
      },
      timeout: { 
        executionTimeout: this.calculateTimeout(request),
        queueTimeout: 60000 
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: this.extractUserId(headers),
        sessionId: this.extractSessionId(headers),
        source: 'ollama-chat-api',
        ipAddress: req.ip,
        userAgent: headers['user-agent']
      }
    };
    
    if (request.stream) {
      return await this.handleStreamingResponse(job);
    } else {
      return await this.queueService.submitJob(job);
    }
  }
  
  @Post('/api/embeddings')
  async ollamaEmbeddings(
    @Body() request: OllamaEmbeddingsRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaEmbeddingsResponse> {
    await this.validateAndRateLimit(req, 'embeddings');
    
    return await this.queueService.submitOllamaEmbeddings(
      request.model,
      request.prompt,
      {
        ...request.options,
        userId: this.extractUserId(headers),
        sessionId: this.extractSessionId(headers),
        timeout: 60000 // 1 minute for embeddings
      }
    );
  }
  
  @Post('/api/pull')
  async ollamaPull(
    @Body() request: OllamaPullRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaPullResponse> {
    await this.validateAndRateLimit(req, 'model-management');
    
    return await this.queueService.submitModelManagement(
      'pull',
      request.name,
      undefined, // Let queue decide which server
      {
        stream: request.stream,
        insecure: request.insecure,
        userId: this.extractUserId(headers),
        additionalParams: { name: request.name }
      }
    );
  }
  
  @Post('/api/push')
  async ollamaPush(
    @Body() request: OllamaPushRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaPushResponse> {
    await this.validateAndRateLimit(req, 'model-management');
    
    return await this.queueService.submitModelManagement(
      'push',
      request.name,
      undefined,
      {
        stream: request.stream,
        insecure: request.insecure,
        userId: this.extractUserId(headers),
        additionalParams: { name: request.name }
      }
    );
  }
  
  @Post('/api/create')
  async ollamaCreate(
    @Body() request: OllamaCreateRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaCreateResponse> {
    await this.validateAndRateLimit(req, 'model-management');
    
    return await this.queueService.submitModelManagement(
      'create',
      request.name,
      undefined,
      {
        modelfile: request.modelfile,
        stream: request.stream,
        userId: this.extractUserId(headers),
        additionalParams: { 
          name: request.name,
          modelfile: request.modelfile,
          stream: request.stream
        }
      }
    );
  }
  
  @Delete('/api/delete')
  async ollamaDelete(
    @Body() request: OllamaDeleteRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaDeleteResponse> {
    await this.validateAndRateLimit(req, 'model-management');
    
    return await this.queueService.submitModelManagement(
      'delete',
      request.name,
      undefined,
      {
        userId: this.extractUserId(headers),
        additionalParams: { name: request.name }
      }
    );
  }
  
  @Post('/api/copy')
  async ollamaCopy(
    @Body() request: OllamaCopyRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaCopyResponse> {
    await this.validateAndRateLimit(req, 'model-management');
    
    return await this.queueService.submitModelManagement(
      'copy',
      request.source,
      undefined,
      {
        userId: this.extractUserId(headers),
        additionalParams: { 
          source: request.source,
          destination: request.destination
        }
      }
    );
  }
  
  @Post('/api/show')
  async ollamaShow(
    @Body() request: OllamaShowRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaShowResponse> {
    await this.validateAndRateLimit(req, 'info');
    
    return await this.queueService.submitModelManagement(
      'show',
      request.name,
      undefined,
      {
        userId: this.extractUserId(headers),
        additionalParams: { name: request.name }
      }
    );
  }
  
  @Get('/api/tags')
  async ollamaTags(
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaTagsResponse> {
    await this.validateAndRateLimit(req, 'info');
    
    return await this.queueService.submitModelManagement(
      'tags',
      'system',
      undefined,
      {
        userId: this.extractUserId(headers)
      }
    );
  }
  
  @Get('/api/ps')
  async ollamaPS(
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OllamaPSResponse> {
    await this.validateAndRateLimit(req, 'info');
    
    return await this.queueService.submitModelManagement(
      'ps',
      'system',
      undefined,
      {
        userId: this.extractUserId(headers)
      }
    );
  }

  // ==================== OPENAI COMPATIBLE ENDPOINTS ====================
  
  @Post('/v1/chat/completions')
  async openaiChatCompletions(
    @Body() request: OpenAIChatCompletionsRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OpenAIChatCompletionsResponse> {
    await this.validateAndRateLimit(req, 'chat');
    
    return await this.queueService.submitOpenAIChatCompletions(request, {
      userId: this.extractUserId(headers),
      sessionId: this.extractSessionId(headers),
      priority: this.determinePriority(headers),
      timeout: this.calculateTimeout(request)
    });
  }
  
  @Post('/v1/completions')
  async openaiCompletions(
    @Body() request: OpenAICompletionsRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OpenAICompletionsResponse> {
    await this.validateAndRateLimit(req, 'completions');
    
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OPENAI_COMPLETIONS,
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: this.determinePriority(headers),
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: true,
        stealable: true
      },
      payload: {
        model: request.model,
        prompt: request.prompt,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: request.stream,
        suffix: request.suffix,
        echo: request.echo,
        best_of: request.best_of,
        logprobs: request.logprobs
      },
      timeout: { 
        executionTimeout: this.calculateTimeout(request),
        queueTimeout: 60000 
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: this.extractUserId(headers),
        sessionId: this.extractSessionId(headers),
        source: 'openai-completions-api',
        streaming: request.stream
      }
    };
    
    if (request.stream) {
      return await this.handleStreamingResponse(job);
    } else {
      return await this.queueService.submitJob(job);
    }
  }
  
  @Post('/v1/embeddings')
  async openaiEmbeddings(
    @Body() request: OpenAIEmbeddingsRequest,
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OpenAIEmbeddingsResponse> {
    await this.validateAndRateLimit(req, 'embeddings');
    
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OPENAI_EMBEDDINGS,
      category: JobCategory.EMBEDDING,
      modelId: request.model,
      priority: this.determinePriority(headers),
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: false, // Embeddings are expensive
        stealable: true,
        resourceRequirements: {
          minMemoryMB: 2048,
          preferGPU: true
        }
      },
      payload: {
        model: request.model,
        input: request.input,
        encoding_format: request.encoding_format,
        dimensions: request.dimensions,
        user: request.user
      },
      timeout: { 
        executionTimeout: 60000,
        queueTimeout: 30000 
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: this.extractUserId(headers),
        sessionId: this.extractSessionId(headers),
        source: 'openai-embeddings-api',
        inputType: Array.isArray(request.input) ? 'array' : 'string',
        inputLength: Array.isArray(request.input) ? request.input.length : 1
      }
    };
    
    return await this.queueService.submitJob(job);
  }
  
  @Get('/v1/models')
  async openaiModels(
    @Headers() headers: any,
    @Req() req: any
  ): Promise<OpenAIModelsResponse> {
    await this.validateAndRateLimit(req, 'info');
    
    // This can be served directly from server registry for speed
    const models = await this.serverRegistry.getAllAvailableModels();
    return {
      object: 'list',
      data: models.map(model => ({
        id: model,
        object: 'model',
        created: Date.now(),
        owned_by: 'ollama',
        permission: [],
        root: model,
        parent: null
      }))
    };
  }

  // ==================== HELPER METHODS ====================
  
  private async validateAndRateLimit(req: any, endpoint: string): Promise<void> {
    // Extract API key from headers
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'];
    
    // Validate API key
    if (apiKey) {
      await this.authService.validateApiKey(apiKey);
    }
    
    // Apply rate limiting
    await this.rateLimiter.checkLimit(req.ip, endpoint);
  }
  
  private extractUserId(headers: any): string | undefined {
    return headers['x-user-id'] || headers['user-id'];
  }
  
  private extractSessionId(headers: any): string | undefined {
    return headers['x-session-id'] || headers['session-id'];
  }
  
  private determinePriority(headers: any): JobPriority {
    const priority = headers['x-priority']?.toLowerCase();
    switch (priority) {
      case 'high': return JobPriority.HIGH;
      case 'low': return JobPriority.LOW;
      default: return JobPriority.NORMAL;
    }
  }
  
  private getExcludedServers(headers: any): ServerId[] {
    const excluded = headers['x-exclude-servers'];
    return excluded ? excluded.split(',') : [];
  }
  
  private calculateTimeout(request: any): number {
    // Base timeout on request complexity
    const hasMessages = request.messages?.length || 0;
    const maxTokens = request.max_tokens || request.num_predict || 100;
    
    // More complex requests get longer timeouts
    const baseTimeout = 30000; // 30 seconds
    const messageMultiplier = Math.min(hasMessages * 1000, 30000); // +1s per message, max 30s
    const tokenMultiplier = Math.min(maxTokens * 100, 60000); // +0.1s per token, max 60s
    
    return baseTimeout + messageMultiplier + tokenMultiplier;
  }
  
  private async handleStreamingResponse(job: UniversalJob): Promise<any> {
    const submission = await this.queueService.submitJob(job);
    
    // Return Server-Sent Events stream
    return new TransformStream({
      start: (controller) => {
        this.setupSSEStream(submission.jobId, controller);
      },
      transform: (chunk, controller) => {
        // Transform job output to proper SSE format
        const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(new TextEncoder().encode(sseData));
      },
      flush: (controller) => {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });
  }
  
  private setupSSEStream(jobId: JobId, controller: any): void {
    // Listen for job progress and stream results
    this.queueService.onJobProgress(jobId, (progress) => {
      if (progress.type === 'partial_result') {
        controller.enqueue(progress.data);
      } else if (progress.type === 'completed') {
        controller.close();
      } else if (progress.type === 'error') {
        controller.error(new Error(progress.error));
      }
    });
  }
}
```

#### 9. **Middleware for Request Processing**

```typescript
// New file: ai-server/src/middleware/queue-middleware.ts
/**
 * Middleware that automatically routes requests through the queue system
 * Provides unified logging, metrics, and error handling
 */
@Injectable()
export class QueueMiddleware implements NestMiddleware {
  constructor(
    private readonly queueService: UniversalQueueService,
    private readonly metricsService: MetricsService,
    private readonly logger: Logger
  ) {}
  
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to headers for tracking
    req.headers['x-request-id'] = requestId;
    
    // Log request
    this.logger.log(`[${requestId}] ${req.method} ${req.path} started`);
    
    // Intercept response to add metrics
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.metricsService.recordRequest({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestId,
        userId: req.headers['x-user-id'],
        queuedJob: res.locals.queuedJob
      });
      
      // Log completion
      this.logger.log(`[${requestId}] ${req.method} ${req.path} completed in ${duration}ms`);
      
      return originalSend.call(this, data);
    }.bind(this);
    
    next();
  }
}
```

```typescript
interface PerformanceOptimizer {
  /**
   * Continuously monitors and optimizes job distribution
   */
  startOptimizationLoop(): void;
  
  /**
   * Analyzes server performance and suggests optimizations
   */
  analyzePerformance(): Promise<OptimizationSuggestions>;
  
  /**
   * Rebalances jobs across servers based on performance
   */
  rebalanceJobs(): Promise<RebalanceResult>;
}

class SmartPerformanceOptimizer implements PerformanceOptimizer {
  private readonly performanceWindow = 5 * 60 * 1000; // 5 minute window
  
  async analyzePerformance(): Promise<OptimizationSuggestions> {
    const servers = await this.serverRegistry.getAllServers();
    const suggestions: OptimizationSuggestions = {
      jobStealingOpportunities: [],
      serverLoadRebalancing: [],
      modelReallocation: [],
      capacityAdjustments: []
    };
    
    // Identify fast servers that could steal jobs
    const performanceRankings = await this.rankServersByPerformance();
    
    for (let i = 0; i < performanceRankings.length - 1; i++) {
      const fastServer = performanceRankings[i];
      const slowServer = performanceRankings[i + 1];
      
      // Check if fast server has capacity and compatible models
      if (this.canStealJobs(fastServer, slowServer)) {
        suggestions.jobStealingOpportunities.push({
          fromServer: slowServer.id,
          toServer: fastServer.id,
          expectedSpeedup: this.calculateSpeedupPotential(fastServer, slowServer),
          stealableJobs: await this.findStealableJobs(slowServer.id)
        });
      }
    }
    
    return suggestions;
  }
  
  startOptimizationLoop(): void {
    setInterval(async () => {
      try {
        const suggestions = await this.analyzePerformance();
        
        // Auto-execute high-confidence optimizations
        for (const opportunity of suggestions.jobStealingOpportunities) {
          if (opportunity.expectedSpeedup > 2.0) { // 2x speedup threshold
            await this.executeJobStealing(opportunity);
          }
        }
      } catch (error) {
        console.error('Performance optimization failed:', error);
      }
    }, 30000); // Run every 30 seconds
  }
}

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
**Goal**: Build core infrastructure and job queue

#### 1.1 Clean Slate Preparation
```bash
# Remove all existing benchmark orchestration code
rm -rf ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts
rm -rf ai-server/benchmarking/queueWorker.ts
rm -rf ai-server/src/queueSystem.ts
rm -rf ai-server/src/controllers/benchmarkManualController.ts
```

#### 1.2 Core Job System
```typescript
// New file: shared/types/benchmark-jobs.ts
export interface BenchmarkJob {
  readonly id: JobId;
  readonly type: BenchmarkJobType;
  readonly serverId: ServerId;
  readonly modelId: ModelId;
  readonly priority: JobPriority;
  readonly dependencies: readonly JobId[];
  readonly createdAt: Timestamp;
  readonly scheduledFor: Timestamp;
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  readonly payload: JobPayload;
}

export interface JobResult {
  readonly jobId: JobId;
  readonly status: JobStatus;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly executionTimeMs: number;
  readonly result?: BenchmarkData;
  readonly error?: JobError;
}
```

#### 1.3 Universal Job Queue Infrastructure
```typescript
// New file: ai-server/src/services/universal-queue.service.ts
export class UniversalQueueService {
  private readonly queues: Map<ServerId, Queue<UniversalJob>>;
  private readonly scheduler: IntelligentJobScheduler;
  private readonly stealingEngine: SmartJobStealingEngine;
  private readonly dependencyResolver: DependencyResolver;
  private readonly performanceOptimizer: SmartPerformanceOptimizer;
  
  constructor() {
    this.queues = new Map();
    this.scheduler = new IntelligentJobScheduler();
    this.stealingEngine = new SmartJobStealingEngine();
    this.dependencyResolver = new DependencyResolver();
    this.performanceOptimizer = new SmartPerformanceOptimizer();
  }
  
  /**
   * Universal job submission - handles all types of AI work
   */
  async submitJob(job: UniversalJob): Promise<JobSubmissionResult> {
    // Validate job
    await this.validateJob(job);
    
    // Resolve dependencies if any
    if (job.dependencies.length > 0) {
      await this.dependencyResolver.validateDependencies(job);
    }
    
    // Schedule job using intelligent scheduler
    const scheduleResult = await this.scheduler.scheduleJob(job);
    
    if (!scheduleResult.success) {
      throw new JobSchedulingError(scheduleResult.reason);
    }
    
    // Add to appropriate server queue
    const serverQueue = this.getOrCreateServerQueue(scheduleResult.assignedServerId);
    await serverQueue.add(job.type, job, {
      jobId: job.id,
      priority: this.convertPriority(job.priority),
      delay: this.calculateDelay(job),
      attempts: job.retryPolicy.maxAttempts,
      backoff: job.retryPolicy.backoffStrategy
    });
    
    // Start job stealing monitor if this is a stealable job
    if (job.constraints.stealable) {
      this.stealingEngine.monitorJobForStealing(job.id, scheduleResult.assignedServerId);
    }
    
    return {
      jobId: job.id,
      assignedServerId: scheduleResult.assignedServerId,
      estimatedStartTime: scheduleResult.estimatedStartTime,
      estimatedDuration: scheduleResult.estimatedDuration
    };
  }
  
  /**
   * Submit workflow - handles complex job chains like RAG pipelines
   */
  async submitWorkflow(jobs: UniversalJob[]): Promise<WorkflowSubmissionResult> {
    // Build and validate dependency graph
    const executionPlan = await this.dependencyResolver.createExecutionPlan(jobs);
    
    // Submit jobs level by level
    const submissionResults: JobSubmissionResult[] = [];
    
    for (const level of executionPlan.levels) {
      // Submit all jobs in current level (they can run in parallel)
      const levelSubmissions = await Promise.all(
        level.jobs.map(job => this.submitJob(job))
      );
      submissionResults.push(...levelSubmissions);
      
      // If any critical path jobs failed to schedule, abort workflow
      if (level.containsCriticalPath) {
        const failedCriticalJobs = levelSubmissions.filter(r => !r.success);
        if (failedCriticalJobs.length > 0) {
          await this.cancelWorkflow(executionPlan.workflowId);
          throw new WorkflowSchedulingError('Critical path jobs failed to schedule');
        }
      }
    }
    
    return {
      workflowId: executionPlan.workflowId,
      jobSubmissions: submissionResults,
      estimatedCompletionTime: executionPlan.estimatedCompletionTime
    };
  }
  
  /**
   * High-level API for inference calls
   */
  async submitInferenceRequest(
    modelId: string,
    prompt: string,
    options: InferenceOptions = {}
  ): Promise<InferenceResult> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_CHAT,
      category: JobCategory.INFERENCE,
      modelId,
      priority: options.priority || JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: modelId,
        canSteal: true,      // Inference calls can use job stealing
        stealable: true,     // Can be stolen by faster servers
        excludeServers: options.excludeServers
      },
      payload: { 
        prompt, 
        temperature: options.temperature,
        maxTokens: options.maxTokens
      },
      timeout: { 
        executionTimeout: options.timeout || 30000,
        queueTimeout: 60000 
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: options.userId,
        sessionId: options.sessionId,
        source: 'inference-api'
      }
    };
    
    const submission = await this.submitJob(job);
    
    // Wait for result with timeout
    return await this.waitForJobResult(submission.jobId, job.timeout.executionTimeout);
  }
  
  /**
   * High-level API for Ollama /api/generate endpoint
   */
  async submitOllamaGenerate(
    modelId: string,
    prompt: string,
    options: OllamaGenerateOptions = {}
  ): Promise<OllamaGenerateResult> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_GENERATE,
      category: JobCategory.INFERENCE,
      modelId,
      priority: options.priority || JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: modelId,
        canSteal: true,
        stealable: true,
        excludeServers: options.excludeServers
      },
      payload: { 
        model: modelId,
        prompt,
        stream: options.stream || false,
        format: options.format,
        options: {
          temperature: options.temperature,
          top_p: options.top_p,
          top_k: options.top_k,
          repeat_penalty: options.repeat_penalty,
          seed: options.seed,
          num_predict: options.num_predict,
          stop: options.stop
        },
        context: options.context,
        system: options.system,
        template: options.template,
        raw: options.raw
      },
      timeout: { 
        executionTimeout: options.timeout || 120000, // 2 minutes for generation
        queueTimeout: 60000 
      },
      retryPolicy: {
        maxAttempts: 2, // Less retries for long-running generations
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: options.userId,
        sessionId: options.sessionId,
        source: 'ollama-generate-api',
        streaming: options.stream
      }
    };
    
    if (options.stream) {
      // Handle streaming response differently
      return await this.submitStreamingJob(job);
    } else {
      const submission = await this.submitJob(job);
      return await this.waitForJobResult(submission.jobId, job.timeout.executionTimeout);
    }
  }
  
  /**
   * High-level API for Ollama /api/embeddings endpoint
   */
  async submitOllamaEmbeddings(
    modelId: string,
    prompt: string,
    options: OllamaEmbeddingsOptions = {}
  ): Promise<OllamaEmbeddingsResult> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OLLAMA_EMBEDDINGS,
      category: JobCategory.EMBEDDING,
      modelId,
      priority: options.priority || JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: modelId,
        canSteal: false,     // Embeddings are expensive, avoid duplication
        stealable: true,     // But can be stolen if needed
        excludeServers: options.excludeServers,
        resourceRequirements: {
          minMemoryMB: 2048,  // Embedding models need more memory
          preferGPU: true
        }
      },
      payload: { 
        model: modelId,
        prompt,
        options: {
          temperature: options.temperature,
          seed: options.seed
        }
      },
      timeout: { 
        executionTimeout: options.timeout || 60000, // 1 minute for embeddings
        queueTimeout: 30000 
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: options.userId,
        sessionId: options.sessionId,
        source: 'ollama-embeddings-api',
        vectorDimensions: options.expectedDimensions
      }
    };
    
    const submission = await this.submitJob(job);
    return await this.waitForJobResult(submission.jobId, job.timeout.executionTimeout);
  }
  
  /**
   * High-level API for OpenAI compatible /v1/chat/completions endpoint
   */
  async submitOpenAIChatCompletions(
    request: OpenAIChatCompletionsRequest,
    options: APIOptions = {}
  ): Promise<OpenAIChatCompletionsResponse> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: JobType.OPENAI_CHAT_COMPLETIONS,
      category: JobCategory.INFERENCE,
      modelId: request.model,
      priority: options.priority || JobPriority.NORMAL,
      dependencies: [],
      constraints: {
        requiresModel: request.model,
        canSteal: true,
        stealable: true,
        excludeServers: options.excludeServers
      },
      payload: { 
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: request.stream,
        tools: request.tools,
        tool_choice: request.tool_choice,
        response_format: request.response_format
      },
      timeout: { 
        executionTimeout: options.timeout || 90000,
        queueTimeout: 60000 
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential'
      },
      metadata: {
        userId: options.userId,
        sessionId: options.sessionId,
        source: 'openai-chat-api',
        streaming: request.stream,
        toolsEnabled: !!request.tools
      }
    };
    
    if (request.stream) {
      return await this.submitStreamingJob(job);
    } else {
      const submission = await this.submitJob(job);
      return await this.waitForJobResult(submission.jobId, job.timeout.executionTimeout);
    }
  }
  
  /**
   * High-level API for model management operations
   */
  async submitModelManagement(
    operation: ModelOperation,
    modelId: string,
    serverId?: ServerId,
    options: ModelManagementOptions = {}
  ): Promise<ModelManagementResult> {
    const job: UniversalJob = {
      id: generateJobId(),
      type: this.getModelManagementJobType(operation),
      category: JobCategory.HEALTH_CHECK,
      modelId,
      priority: JobPriority.LOW, // Model operations are background tasks
      dependencies: [],
      constraints: {
        serverAffinity: serverId,    // May need to run on specific server
        requiresModel: operation === 'delete' ? modelId : undefined,
        canSteal: false,             // Model operations are server-specific
        stealable: false,
        maxConcurrency: 1,           // Only one model operation at a time per server
        resourceRequirements: {
          minDiskSpaceGB: operation === 'pull' ? 10 : 1,
          networkBandwidth: operation === 'pull' || operation === 'push'
        }
      },
      payload: { 
        operation,
        model: modelId,
        ...options.additionalParams
      },
      timeout: { 
        executionTimeout: this.getModelOperationTimeout(operation),
        queueTimeout: 300000 // 5 minutes queue timeout for model ops
      },
      retryPolicy: {
        maxAttempts: 1, // Don't retry model operations automatically
        backoffStrategy: 'fixed'
      },
      metadata: {
        userId: options.userId,
        source: 'model-management-api',
        operation
      }
    };
    
    const submission = await this.submitJob(job);
    return await this.waitForJobResult(submission.jobId, job.timeout.executionTimeout);
  }
  
  /**
   * Handle streaming jobs differently - return stream instead of waiting
   */
  private async submitStreamingJob(job: UniversalJob): Promise<any> {
    const submission = await this.submitJob(job);
    
    // Return a readable stream that connects to the job's output
    return new ReadableStream({
      start: (controller) => {
        this.setupStreamingJobHandler(submission.jobId, controller);
      },
      cancel: () => {
        this.cancelJob(submission.jobId);
      }
    });
  }
  
  private getModelManagementJobType(operation: ModelOperation): JobType {
    switch (operation) {
      case 'pull': return JobType.OLLAMA_PULL;
      case 'push': return JobType.OLLAMA_PUSH;
      case 'create': return JobType.OLLAMA_CREATE;
      case 'delete': return JobType.OLLAMA_DELETE;
      case 'copy': return JobType.OLLAMA_COPY;
      case 'show': return JobType.OLLAMA_SHOW;
      case 'tags': return JobType.OLLAMA_TAGS;
      case 'ps': return JobType.OLLAMA_PS;
      default: return JobType.MODEL_MANAGEMENT;
    }
  }
  
  private getModelOperationTimeout(operation: ModelOperation): number {
    switch (operation) {
      case 'pull': return 30 * 60 * 1000; // 30 minutes for pulling large models
      case 'push': return 20 * 60 * 1000; // 20 minutes for pushing
      case 'create': return 15 * 60 * 1000; // 15 minutes for creating
      case 'delete': return 60 * 1000;    // 1 minute for deletion
      case 'copy': return 5 * 60 * 1000;  // 5 minutes for copying
      case 'show':
      case 'tags':
      case 'ps': return 30 * 1000;        // 30 seconds for info queries
      default: return 5 * 60 * 1000;      // 5 minutes default
    }
  }
  
  /**
   * High-level API for benchmark suites
   */
  async submitBenchmarkSuite(
    modelId: string,
    serverId: ServerId,
    benchmarkTypes: BenchmarkType[]
  ): Promise<BenchmarkSuiteResult> {
    const benchmarkScheduler = new BenchmarkScheduler();
    const executionPlan = await benchmarkScheduler.scheduleBenchmarkSuite(
      modelId, 
      serverId, 
      benchmarkTypes
    );
    
    return await this.submitWorkflow(executionPlan.jobs);
  }
  
  /**
   * High-level API for RAG pipeline
   */
  async submitRAGPipeline(
    textContent: string,
    options: RAGPipelineOptions = {}
  ): Promise<RAGPipelineResult> {
    const dependencyScheduler = new DependencyAwareScheduler();
    const executionPlan = await dependencyScheduler.scheduleTextToRAGPipeline(
      textContent,
      options.preferredServerId
    );
    
    return await this.submitWorkflow(executionPlan.jobs);
  }
  
  private getOrCreateServerQueue(serverId: ServerId): Queue<UniversalJob> {
    if (!this.queues.has(serverId)) {
      const queue = new Queue(`server-${serverId}`, {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50
        }
      });
      
      // Set up worker for this server queue
      this.createServerWorker(serverId, queue);
      
      this.queues.set(serverId, queue);
    }
    
    return this.queues.get(serverId)!;
  }
  
  private createServerWorker(serverId: ServerId, queue: Queue<UniversalJob>): void {
    const worker = new Worker(
      queue.name,
      async (job: Job<UniversalJob>) => {
        const executor = this.getExecutorForJob(job.data);
        return await executor.execute(job.data);
      },
      {
        connection: this.redisConnection,
        concurrency: this.getServerConcurrency(serverId)
      }
    );
    
    // Handle job completion events for stealing engine
    worker.on('completed', (job, result) => {
      this.stealingEngine.handleJobCompletion(job.id, result);
    });
    
    worker.on('failed', (job, error) => {
      this.stealingEngine.handleJobFailure(job.id, error);
    });
  }
}
```

### Phase 2: Job Execution (Week 3-4)
**Goal**: Implement benchmark executors and result handling

#### 2.1 Benchmark Executors
```typescript
// New file: ai-server/src/executors/base-executor.ts
export abstract class BaseBenchmarkExecutor {
  abstract readonly type: BenchmarkJobType;
  
  async execute(job: BenchmarkJob): Promise<JobResult> {
    const startTime = performance.now();
    try {
      await this.validatePrerequisites(job);
      const result = await this.runBenchmark(job);
      return this.createSuccessResult(job, startTime, result);
    } catch (error) {
      return this.createErrorResult(job, startTime, error);
    }
  }
  
  protected abstract validatePrerequisites(job: BenchmarkJob): Promise<void>;
  protected abstract runBenchmark(job: BenchmarkJob): Promise<BenchmarkData>;
}

// New file: ai-server/src/executors/cold-latency-executor.ts
export class ColdLatencyExecutor extends BaseBenchmarkExecutor {
  readonly type = BenchmarkJobType.COLD_LATENCY;
  
  protected async validatePrerequisites(job: BenchmarkJob): Promise<void> {
    // Ensure server is available and model is loaded
    const server = await this.serverRegistry.getServer(job.serverId);
    if (!server.healthy) {
      throw new JobExecutionError('Server not healthy');
    }
  }
  
  protected async runBenchmark(job: BenchmarkJob): Promise<BenchmarkData> {
    // Cold latency specific implementation
    const server = await this.serverRegistry.getServer(job.serverId);
    const startTime = performance.now();
    
    await this.callModel(server, job.modelId, job.payload.prompt);
    
    const latencyMs = performance.now() - startTime;
    return { latencyMs, serverLoad: server.currentLoad };
  }
}
```

#### 2.2 Dependency Management
```typescript
// New file: ai-server/src/services/dependency-resolver.service.ts
export class DependencyResolver {
  async resolveDependencies(jobs: BenchmarkJob[]): Promise<JobExecutionPlan> {
    const graph = this.buildDependencyGraph(jobs);
    const sortedJobs = this.topologicalSort(graph);
    return this.createExecutionPlan(sortedJobs);
  }
  
  private buildDependencyGraph(jobs: BenchmarkJob[]): DependencyGraph {
    // Build directed acyclic graph of job dependencies
  }
  
  private topologicalSort(graph: DependencyGraph): BenchmarkJob[] {
    // Kahn's algorithm for dependency ordering
  }
}
```

### Phase 3: State Management (Week 5-6)
**Goal**: Implement persistence and state management

#### 3.1 Event Sourcing
```typescript
// New file: ai-server/src/events/benchmark-events.ts
export abstract class BenchmarkEvent {
  readonly timestamp: Date = new Date();
  readonly id: string = generateId();
  abstract readonly type: string;
}

export class JobEnqueued extends BenchmarkEvent {
  readonly type = 'job-enqueued';
  constructor(readonly job: BenchmarkJob) { super(); }
}

export class JobStarted extends BenchmarkEvent {
  readonly type = 'job-started';
  constructor(readonly jobId: JobId, readonly workerId: WorkerId) { super(); }
}

export class JobCompleted extends BenchmarkEvent {
  readonly type = 'job-completed';
  constructor(readonly result: JobResult) { super(); }
}
```

#### 3.2 State Store
```typescript
// New file: ai-server/src/services/benchmark-state.service.ts
export class BenchmarkStateService {
  private readonly eventStore: EventStore;
  private readonly readModel: ReadModelStore;
  
  async handleEvent(event: BenchmarkEvent): Promise<void> {
    await this.eventStore.append(event);
    await this.updateReadModel(event);
    await this.publishEvent(event);
  }
  
  async getJobState(jobId: JobId): Promise<JobState> {
    return await this.readModel.getJobState(jobId);
  }
  
  async getBenchmarkRunResults(runId: RunId): Promise<BenchmarkRunResults> {
    return await this.readModel.getBenchmarkRunResults(runId);
  }
}
```

### Phase 4: API & UI (Week 7-8)
**Goal**: Build user interfaces and API endpoints

#### 4.1 REST API
```typescript
// New file: ai-server/src/controllers/benchmark-v2.controller.ts
@Controller('/api/v2/benchmarks')
export class BenchmarkV2Controller {
  constructor(
    private readonly queueService: BenchmarkQueueService,
    private readonly stateService: BenchmarkStateService
  ) {}
  
  @Post('/runs')
  async createBenchmarkRun(@Body() request: CreateBenchmarkRunRequest): Promise<BenchmarkRunResponse> {
    const jobs = await this.planBenchmarkJobs(request);
    const runId = await this.queueService.enqueueBenchmarkRun(jobs);
    return { runId, estimatedDuration: this.estimateDuration(jobs) };
  }
  
  @Get('/runs/:runId')
  async getBenchmarkRun(@Param('runId') runId: string): Promise<BenchmarkRunDetails> {
    return await this.stateService.getBenchmarkRunResults(runId);
  }
  
  @Get('/runs/:runId/progress')
  @Sse()
  async getBenchmarkProgress(@Param('runId') runId: string): Promise<Observable<JobProgressEvent>> {
    return this.stateService.getJobProgressStream(runId);
  }
}
```

#### 4.2 Real-time Dashboard
```typescript
// New file: frontend/src/components/BenchmarkDashboard.tsx
export const BenchmarkDashboard: React.FC = () => {
  const { data: runs, error } = useBenchmarkRuns();
  const { subscribe } = useBenchmarkProgress();
  
  return (
    <div className="benchmark-dashboard">
      <BenchmarkRunsList runs={runs} />
      <LiveJobQueue />
      <BenchmarkMetrics />
      <ServerHealthGrid />
    </div>
  );
};

// Real-time job progress component
export const LiveJobQueue: React.FC = () => {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribe((event: JobProgressEvent) => {
      setJobs(prev => updateJobStatus(prev, event));
    });
    return unsubscribe;
  }, [subscribe]);
  
  return (
    <div className="live-job-queue">
      {jobs.map(job => (
        <JobStatusCard key={job.id} job={job} />
      ))}
    </div>
  );
};
```

## File Removal Plan

### Immediate Deletion
These files contain the broken architecture and should be deleted immediately:

```bash
# Core broken orchestration
ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts
ai-server/benchmarking/queueWorker.ts
ai-server/src/queueSystem.ts
ai-server/src/queueWebSocket.ts

# Broken controllers
ai-server/src/controllers/benchmarkManualController.ts

# Outdated types and utilities
ai-server/src/orchestrator.types.ts
ai-server/src/orchestrator.utils.ts

# Broken web components
ai-server/web/src/components/QueueVisualizer.tsx
ai-server/web/src/hooks/useQueueSocket.ts
```

### Refactor Required
These files need major refactoring but contain some salvageable business logic:

```bash
# Keep but completely rewrite
ai-server/src/orchestrator.ts -> ai-server/src/services/server-registry.service.ts
ai-server/benchmarking/benchmarkRunner.ts -> ai-server/src/executors/benchmark-runner.ts
shared/types/aiQualityBenchmark.ts -> shared/types/benchmark-jobs.ts
```

## Migration Timeline

### Week 1: Foundation
- [ ] Delete broken files
- [ ] Create new job types and interfaces
- [ ] Set up BullMQ-based job queue
- [ ] Implement basic job enqueueing

### Week 2: Core Services
- [ ] Build dependency resolver
- [ ] Create base executor classes
- [ ] Implement server registry service
- [ ] Add job validation and error handling

### Week 3: Executors
- [ ] Implement cold latency executor
- [ ] Implement warm latency executor  
- [ ] Implement quality benchmark executor
- [ ] Add embedding benchmark support

### Week 4: State Management
- [ ] Set up event sourcing
- [ ] Implement read model projections
- [ ] Add PostgreSQL persistence
- [ ] Create state query services

### Week 5: Integration
- [ ] Connect executors to queue
- [ ] Add job progress tracking
- [ ] Implement result aggregation
- [ ] Add metrics and monitoring

### Week 6: API
- [ ] Build REST API endpoints
- [ ] Add GraphQL schema
- [ ] Implement WebSocket subscriptions
- [ ] Create API documentation

### Week 7: Frontend
- [ ] Build new dashboard components
- [ ] Add real-time job visualization
- [ ] Create benchmark configuration UI
- [ ] Add results analysis tools

### Week 8: Testing & Polish
- [ ] Write comprehensive test suite
- [ ] Add performance benchmarks
- [ ] Documentation and examples
- [ ] Production readiness checklist

## Success Metrics

### Technical Metrics
- **Test Coverage**: >90% unit test coverage
- **Performance**: Jobs complete 10x faster than current system
- **Reliability**: 99.9% job completion rate
- **Observability**: Full tracing and metrics for all operations

### Business Metrics
- **Developer Productivity**: New benchmark types can be added in <1 day
- **System Reliability**: Zero data loss during restarts
- **User Experience**: Real-time progress updates and clear error messages
- **Maintainability**: New team members can understand and modify code

## Risk Mitigation

### Technical Risks
- **Data Migration**: Current benchmark results backed up before deletion
- **API Compatibility**: Version API endpoints to maintain backward compatibility  
- **Performance Regression**: Load testing before production deployment
- **Database Issues**: Database schema migrations with rollback plans

### Business Risks
- **Development Timeline**: Aggressive timeline may require scope reduction
- **Resource Allocation**: Full-time developer needed for 8-week sprint
- **Integration Complexity**: May discover hidden dependencies during deletion
- **User Disruption**: Temporary loss of benchmarking functionality

## Conclusion - Transparent Integration Approach

The approach has been refined to focus on **transparent integration** rather than wholesale API replacement. This provides the best of both worlds:

### **Zero Disruption Approach**
1. **Preserve Existing APIs**: All current Ollama endpoints continue to work exactly as they do now
2. **Add Intelligence Behind the Scenes**: Smart server selection happens transparently
3. **Maintain Streaming Behavior**: All streaming responses work identically
4. **Keep Error Handling**: Same error codes and response formats
5. **Preserve Authentication**: All existing auth mechanisms continue to work

### **Intelligent Enhancements**
1. **Smart Server Selection**: Requests automatically go to optimal servers based on:
   - Current server load and queue depth
   - Model availability and cache status  
   - Historical performance for similar requests
   - Resource requirements vs. server capacity
2. **Automatic Load Balancing**: Dynamic redistribution based on real-time performance
3. **Failure Prevention**: Requests avoid overloaded or unhealthy servers
4. **Performance Optimization**: 50% faster response times through better placement

### **Implementation Benefits**
1. **Risk-Free Deployment**: Can be deployed alongside existing system with zero risk
2. **Gradual Rollout**: Enable intelligent placement per-endpoint as confidence builds
3. **Easy Rollback**: Simple feature flag to disable queue integration if needed
4. **Measurable Impact**: Clear before/after metrics on response times and server utilization

### **Technical Approach**
- **Week 1-2**: Build queue infrastructure and server registry in parallel
- **Week 3**: Add transparent proxy layer with intelligent server selection
- **Week 4**: Deploy to production with monitoring and gradual traffic migration
- **Week 5+**: Extend to benchmarks and RAG pipelines using the same queue system

### **Success Criteria**
- ✅ **Zero API breakage**: All existing calls continue to work unchanged
- ✅ **Performance improvement**: 50% reduction in average response times  
- ✅ **Load distribution**: 80% better utilization across server farm
- ✅ **Reliability improvement**: 99% reduction in failed requests due to overload
- ✅ **Transparent operation**: Users see faster responses, nothing else changes

This refined approach delivers the **intelligent orchestration benefits** of the new queue system while maintaining **100% backward compatibility** with existing API behavior. It's a win-win that provides immediate performance benefits with zero risk to current functionality.

The queue system intelligence can then be extended to handle complex benchmarks and RAG pipelines, but the foundation starts with transparent integration that makes every existing API call faster and more reliable.
