# Universal AI Request Processing Framework
## Multi-Pass Intelligent Processing System

## Overview

This framework extends the three-pass character chat system to handle all AI requests across the Universe Book Writer platform. Different request types can utilize 3-7 passes based on complexity and quality requirements.

## Core Processing Framework

### **Pass 1: Request Analysis & Classification** (Always Required)
**Purpose**: Analyze the request to determine complexity, domain, and processing strategy.

**Classification Dimensions**:
- **Complexity**: `trivial` | `simple` | `moderate` | `complex` | `expert`
- **Domain**: `chat` | `writing` | `character-generation` | `world-building` | `analysis` | `editing`
- **Scope**: `atomic` | `chapter` | `multi-chapter` | `book` | `series`
- **Quality Requirements**: `draft` | `standard` | `publication` | `professional`
- **RAG Domain**: `none` | `universe:{universe_id}` | `character:{character_id}` | `project:{project_id}` | `custom:{domain_name}`

### **Pass 2: Context & Resource Gathering** (Conditional)
**Purpose**: Gather relevant context, existing content, and reference materials.

**Context Types by Domain**:
- **Writing**: Previous chapters, character arcs, plot threads, world lore
- **Character Generation**: Universe rules, existing characters, relationship webs
- **World Building**: Existing locations, cultures, technologies, histories
- **Analysis**: Target content, comparison materials, style guides

**RAG Domain Processing**:
- **None**: Skip RAG retrieval, use only provided context
- **Universe**: Retrieve universe-specific lore, rules, locations, factions, technologies
- **Character**: Retrieve character history, relationships, personality traits, past interactions
- **Project**: Retrieve project-specific content, style guides, established patterns
- **Custom**: Retrieve from user-defined knowledge domains (genre conventions, research materials, etc.)

### **Pass 3: Initial Generation** (Always Required)
**Purpose**: Generate the core response using appropriate model and context.

### **Pass 4: Quality Assessment & Refinement** (Complex+ Requests)
**Purpose**: Evaluate the initial output and identify areas for improvement.

**Assessment Criteria**:
- **Consistency**: Internal logic and continuity
- **Quality**: Writing quality, character voice, technical accuracy
- **Completeness**: Does it fully address the request?
- **Integration**: How well does it fit with existing content?

### **Pass 5: Targeted Improvement** (Complex+ Requests)
**Purpose**: Make specific improvements based on Pass 4 assessment.

**Improvement Types**:
- **Content Enhancement**: Expand weak sections, add detail
- **Consistency Fixes**: Resolve contradictions and continuity errors
- **Style Refinement**: Improve prose, dialogue, pacing
- **Technical Corrections**: Fix plot holes, character inconsistencies

### **Pass 6: Cross-Reference Validation** (Expert Requests)
**Purpose**: Validate against broader universe/series context.

**Validation Checks**:
- **Series Continuity**: Check against previous books/chapters
- **Character Consistency**: Verify character growth arcs
- **World Building**: Ensure consistency with established lore
- **Plot Threading**: Verify subplot integration

### **Pass 7: Final Polish & Integration** (Expert Requests)
**Purpose**: Final refinement and preparation for integration.

**Polish Activities**:
- **Language Refinement**: Final prose improvements
- **Formatting**: Proper structure and styling
- **Metadata Generation**: Tags, summaries, relationships
- **Integration Prep**: Prepare for seamless insertion

## Request Type Processing Maps

### Character Chat (3 Passes)
```
Request: "How do you feel about space travel?"
RAG Domain: "character:kirk-prime"
├── Pass 1: Context Analysis (simple/moderate/complex)
├── Pass 2: Character Memory & Universe Context Gathering
└── Pass 3: Response Generation (with character voice and universe knowledge)
```

### Simple Writing Task (3 Passes)
```
Request: "Write a dialogue between two characters"
RAG Domain: "universe:star-trek-tos"
├── Pass 1: Request Analysis (characters, context, length)
├── Pass 2: Character & Universe Context Gathering
└── Pass 3: Dialogue Generation (universe-consistent)
```

### Chapter Writing (5 Passes)
```
Request: "Write Chapter 12 where the protagonist discovers the truth"
RAG Domain: "project:my-fantasy-series"
├── Pass 1: Request Analysis (plot point, characters, scope)
├── Pass 2: Context Gathering (previous chapters, character arcs, series lore)
├── Pass 3: Initial Chapter Generation (project-consistent)
├── Pass 4: Quality Assessment (pacing, consistency, plot progression)
└── Pass 5: Refinement (dialogue polish, scene enhancement)
```

### Book Planning (6 Passes)
```
Request: "Plan a sequel to this fantasy novel"
RAG Domain: "universe:my-fantasy-world"
├── Pass 1: Request Analysis (genre, scope, existing elements)
├── Pass 2: Context Gathering (full universe analysis, character arcs, world lore)
├── Pass 3: Initial Plot Structure (universe-consistent)
├── Pass 4: Quality Assessment (plot holes, character growth)
├── Pass 5: Refinement (subplot integration, pacing)
└── Pass 6: Cross-Reference Validation (universe continuity)
```

### Series Bible Creation (7 Passes)
```
Request: "Create a comprehensive universe bible for this space opera series"
├── Pass 1: Request Analysis (scope, depth, existing material)
├── Pass 2: Context Gathering (all existing content analysis)
├── Pass 3: Initial Bible Structure & Core Elements
├── Pass 4: Quality Assessment (completeness, consistency)
├── Pass 5: Targeted Improvement (fill gaps, resolve conflicts)
├── Pass 6: Cross-Reference Validation (verify all connections)
└── Pass 7: Final Polish & Integration (formatting, indexing)
```

## Dynamic Pass Selection

### Pass Selection Algorithm
```typescript
function determineRequiredPasses(request: AIRequest): number {
    let passes = 3; // Minimum baseline
    
    // Complexity multiplier
    switch(request.complexity) {
        case 'trivial': passes = 2; break;
        case 'simple': passes = 3; break;
        case 'moderate': passes = 4; break;
        case 'complex': passes = 5; break;
        case 'expert': passes = 6; break;
    }
    
    // Quality requirement modifier
    if (request.qualityRequirement === 'publication') passes += 1;
    if (request.qualityRequirement === 'professional') passes += 2;
    
    // Scope modifier
    if (request.scope === 'series') passes += 1;
    
    // RAG Domain modifier - requires context gathering
    if (request.ragDomain && request.ragDomain !== 'none') {
        passes = Math.max(passes, 3); // Ensure Pass 2 (Context Gathering) is included
        if (request.ragDomain.startsWith('universe:') && request.complexity >= 'moderate') passes += 1;
    }
    
    // Domain-specific requirements
    if (request.domain === 'world-building' && request.scope !== 'atomic') passes += 1;
    if (request.domain === 'character-generation' && request.complexity >= 'complex') passes += 1;
    
    return Math.min(passes, 7); // Cap at 7 passes
}
```

## Advanced Processing Features

### Conditional Pass Execution
Some passes may be skipped based on intermediate results:

```typescript
interface PassDecision {
    execute: boolean;
    reason: string;
    alternativeAction?: string;
}

// Example: Skip Pass 5 if Pass 4 shows high quality
if (pass4Assessment.overallQuality > 0.9) {
    return {
        execute: false,
        reason: "Quality threshold exceeded, refinement not needed",
        alternativeAction: "proceed_to_validation"
    };
}
```

### Iterative Refinement
Complex requests may loop between passes:

```typescript
// If Pass 4 identifies major issues, loop back to Pass 3
if (pass4Assessment.majorIssues.length > 0) {
    return executePass3WithImprovements(pass4Assessment.suggestions);
}
```

### Parallel Processing
Some passes can run in parallel for efficiency:

```typescript
// Pass 2 variants can run simultaneously
const [characterContext, worldContext, plotContext] = await Promise.all([
    gatherCharacterContext(request),
    gatherWorldContext(request),
    gatherPlotContext(request)
]);
```

## Quality Gates

### Pass Completion Criteria
Each pass must meet minimum thresholds to proceed:

```typescript
interface QualityGate {
    minimumScore: number;
    requiredElements: string[];
    blockingIssues: string[];
}

const pass3Gate: QualityGate = {
    minimumScore: 0.6,
    requiredElements: ['coherent_structure', 'relevant_content'],
    blockingIssues: ['major_contradictions', 'off_topic_content']
};
```

### Failure Handling
- **Soft Failures**: Continue with warnings, note issues for later passes
- **Hard Failures**: Retry pass with different parameters or abort request
- **Escalation**: Flag for human review if automated passes fail

## Performance Optimization

### Pass Caching
Cache results of expensive passes:

```typescript
// Cache context gathering results
const contextKey = generateContextKey(request);
const cachedContext = await contextCache.get(contextKey);
if (cachedContext && !isStale(cachedContext)) {
    return cachedContext;
}
```

### Smart Scheduling
- **High Priority**: Simple requests (3 passes) get immediate processing
- **Medium Priority**: Complex requests queued during peak times
- **Background**: Expert-level requests (6-7 passes) scheduled during low usage

### Resource Management
```typescript
interface ResourceLimits {
    maxConcurrentPasses: number;
    maxTokensPerPass: number;
    maxMemoryContext: number;
    timeoutPerPass: number;
}

const resourceLimits = {
    simple: { maxConcurrentPasses: 5, maxTokensPerPass: 1000 },
    complex: { maxConcurrentPasses: 2, maxTokensPerPass: 4000 },
    expert: { maxConcurrentPasses: 1, maxTokensPerPass: 8000 }
};
```

## Real-Time Progress Tracking

### WebSocket Events
```typescript
// Progress events for multi-pass requests
socket.emit('processing:started', {
    requestId: req.id,
    totalPasses: determinedPasses,
    estimatedTime: calculateEstimate(req)
});

socket.emit('processing:pass_complete', {
    requestId: req.id,
    passNumber: currentPass,
    passType: 'context_gathering',
    result: passResult,
    nextPass: nextPassInfo
});

socket.emit('processing:quality_check', {
    requestId: req.id,
    passNumber: 4,
    qualityScore: 0.85,
    issuesFound: ['minor_pacing_issue'],
    improvements: ['enhance_dialogue']
});
```

### Progress Visualization
- **Pass Pipeline**: Visual representation of pass flow
- **Quality Metrics**: Real-time quality scores
- **Resource Usage**: Token consumption, processing time
- **Decision Points**: Why certain passes were skipped/repeated

## Example: Complex Book Chapter Request

```
Request: "Write Chapter 15 where Sarah confronts her father about the family secret, revealing the magical heritage subplot"
RAG Domain: "project:sarahs-magical-journey"

Pass 1: Request Analysis
├── Complexity: complex
├── Domain: writing
├── Scope: chapter
├── Quality: standard
├── RAG Domain: project-specific context required
├── Required Passes: 5
└── Processing Time: 100ms

Pass 2: Context Gathering (RAG-Enhanced)
├── Previous chapters analysis (14 chapters from project)
├── Sarah's character arc tracking (project character data)
├── Family secret subplot threading (project plot threads)
├── Father character consistency check (project character data)
├── Magical system rules validation (project universe rules)
├── RAG Retrieved: 2,400 relevant tokens from project knowledge base
└── Processing Time: 2.1s

Pass 3: Initial Generation
├── Model: mistral-nemo:12b
├── Temperature: 0.7
├── Context tokens: 3,200
├── Generated: 2,800 words
└── Processing Time: 4.2s

Pass 4: Quality Assessment
├── Dialogue quality: 0.85
├── Character consistency: 0.92
├── Plot progression: 0.78
├── Emotional impact: 0.81
├── Issues: pacing_slow_middle, dialogue_needs_tension
└── Processing Time: 1.8s

Pass 5: Targeted Refinement
├── Enhanced middle section pacing
├── Intensified confrontation dialogue
├── Strengthened emotional beats
├── Final quality: 0.89
└── Processing Time: 3.1s

Total: 11.3 seconds for professional-quality chapter
```

## Configuration & Customization

### User Preferences
```typescript
interface UserProcessingPreferences {
    defaultQualityLevel: 'draft' | 'standard' | 'publication';
    maxProcessingTime: number;
    prioritizeSpeed: boolean;
    autoRefine: boolean;
    manualQualityGates: boolean;
}
```

### Project Settings
```typescript
interface ProjectProcessingConfig {
    universe: string;
    styleGuide: string;
    qualityStandards: QualityRequirements;
    continuityChecking: boolean;
    crossReferenceDepth: number;
}
```

## Background Response Scoring System

### Overview

The Background Response Scoring System operates as a separate, asynchronous service that evaluates the quality and performance of AI-generated responses across all domains. This system runs in parallel with the main processing framework, providing continuous quality assessment without blocking user interactions.

This background scoring system operates transparently to provide continuous quality assessment and improvement recommendations while maintaining optimal user experience through non-blocking operation.

## Intelligent Model Routing & Load Management

### Goals

The intelligent routing system aims to optimize AI request processing through dynamic model selection and load management:

- **Dynamically route AI tasks** to the most appropriate model/server pair
- **Use lightweight models** for classification and escalation logic
- **Avoid overloading high-latency endpoints** to maintain responsiveness
- **Benchmark response quality** across model tiers continuously
- **Optimize for structured output** (e.g., YAML) with format-specific model selection
- **Integrate public Ollama endpoints** with passive load awareness

### Architecture Components

#### Task Classifier
```typescript
interface TaskClassifier {
    description: "Lightweight model to determine task type and latency tolerance";
    models: ['DistilBERT', 'TinyLLaMA', 'Mistral-7B'];
    
    classify(request: AIRequest): Promise<TaskClassification>;
}

interface TaskClassification {
    taskType: 'simple' | 'complex' | 'structured' | 'creative';
    latencyTolerance: 'realtime' | 'interactive' | 'batch';
    qualityRequirement: 'draft' | 'standard' | 'premium';
    structuredOutput: boolean;
    estimatedComplexity: number; // 1-10 scale
}
```

#### Model Registry
```typescript
interface ModelRegistry {
    description: "Dynamic metadata store of model/server capabilities";
    
    fields: {
        model_name: string;
        host: string;
        task_types: TaskType[];
        latency: LatencyMetrics;
        gpu: GPUSpecs;
        load: LoadMetrics;
    };
    
    getAvailableModels(taskType: TaskType): Promise<ModelEndpoint[]>;
    updateLoadMetrics(modelId: string, metrics: LoadMetrics): Promise<void>;
}
```

#### Routing Engine
```typescript
interface RoutingEngine {
    description: "Selects best model/server pair based on task, load, and quality";
    logic: "Tiered escalation with quality scoring and latency penalty";
    
    selectModel(
        classification: TaskClassification,
        availableModels: ModelEndpoint[]
    ): Promise<RoutingDecision>;
}
```

#### Background Queue
```typescript
interface BackgroundQueue {
    description: "Redis/RabbitMQ queue for non-urgent tasks";
    
    enqueue(task: AITask, priority: TaskPriority): Promise<string>;
    process(workerId: string): Promise<AITask | null>;
    getQueueStatus(): Promise<QueueMetrics>;
}
```

#### Quality Benchmarking
```typescript
interface QualityBenchmarking {
    description: "A/B testing framework to compare model outputs";
    metrics: ['BLEU', 'BERTScore', 'latency', 'user_feedback'];
    
    runComparison(
        models: ModelEndpoint[],
        testSet: BenchmarkTask[]
    ): Promise<QualityComparison>;
}
```

#### YAML Output Testing
```typescript
interface YAMLOutputTesting {
    description: "Test suite to evaluate structured output compliance";
    validation: "YAML schema parsing, key coverage, structure consistency";
    
    evaluateStructuredOutput(
        response: string,
        expectedSchema: YAMLSchema
    ): Promise<StructuredOutputScore>;
}
```

#### Ollama Load Estimation
```typescript
interface OllamaLoadEstimation {
    description: "Passive load tracking for public Ollama endpoints";
    
    methods: {
        latency_tracking: "Rolling average or percentile of response times";
        health_checks: "Periodic lightweight pings to assess availability";
        backoff_strategy: "Exponential backoff and endpoint deprioritization";
        quality_degradation_monitoring: "Detect output drift under load";
    };
    
    estimateLoad(endpoint: string): Promise<LoadEstimate>;
    trackResponseTime(endpoint: string, latency: number): Promise<void>;
    performHealthCheck(endpoint: string): Promise<HealthStatus>;
}
```

### Routing Strategy

The routing system follows a tiered escalation approach:

1. **Try smallest model first** - Start with the most efficient model that meets minimum requirements
2. **Evaluate output quality** - Assess response quality against thresholds
3. **Escalate to larger models only if needed** - Use more powerful models when quality is insufficient
4. **Preserve high-latency endpoints** for real-time traffic prioritization
5. **Optionally refine in background** and update result for future use

### Escalation Logic

The escalation system uses a scoring function to balance quality gains against latency penalties:

**Scoring Function**: `score = alpha * quality_gain - beta * latency_penalty`

**Fallback Strategy**: Use slowest model only if all others fail

```typescript
class EscalationEngine {
    private readonly QUALITY_WEIGHT = 0.7; // alpha
    private readonly LATENCY_PENALTY = 0.3; // beta
    
    shouldEscalate(
        currentResult: AIResponse,
        targetModel: ModelEndpoint,
        currentModel: ModelEndpoint
    ): boolean {
        const qualityGain = this.estimateQualityGain(currentResult, targetModel);
        const latencyPenalty = this.calculateLatencyPenalty(currentModel, targetModel);
        
        const score = this.QUALITY_WEIGHT * qualityGain - this.LATENCY_PENALTY * latencyPenalty;
        
        return score > this.escalationThreshold;
    }
}
```

### Testing Framework

#### Structured Output Testing
- **Format**: YAML
- **Validation Tools**: [pyyaml, ruamel.yaml]
- **Scoring**: format_validity + key_coverage + structure_consistency
- **Use Case**: Identify best model family for structured output

```typescript
interface StructuredOutputScore {
    formatValidity: number; // 0-1, can parse as valid YAML
    keyCoverage: number; // 0-1, required keys present
    structureConsistency: number; // 0-1, follows expected structure
    overallScore: number; // Composite score
    errors: ValidationError[];
}
```

This intelligent routing system ensures optimal model selection while maintaining system responsiveness and quality standards across all AI processing tasks.