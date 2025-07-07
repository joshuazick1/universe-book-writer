# Universal AI Processing Framework

## Overview

The Universal AI Processing Framework is a sophisticated multi-pass AI processing system designed for the Universe Book Writer platform. It provides intelligent request classification, quality gates, progress tracking, and optimized pass selection for various AI tasks.

## 🏗️ Architecture

The framework follows a layered architecture with clear separation of concerns:

```
Universal AI Processing Framework
├── Core Components
│   ├── UniversalProcessor (Abstract Base Class)
│   ├── TaskClassifier (Request Analysis)
│   ├── QualityGates (Quality Assessment)
│   ├── ProgressTracker (Progress Management)
│   └── PassSelector (Intelligent Pass Selection)
├── Type Definitions (types.ts)
├── Utilities (utils.ts)
└── Main Exports (index.ts)
```

## 🚀 Features

### Multi-Pass Processing
- **Intelligent Pass Selection**: Determines optimal number of passes based on request complexity
- **Quality Gates**: Validates each pass before proceeding to the next
- **Conditional Execution**: Skips unnecessary passes based on quality and context
- **Progress Tracking**: Real-time progress updates and time estimation

### Request Classification
- **Complexity Analysis**: Analyzes content complexity across multiple dimensions
- **Domain Detection**: Identifies the primary domain (character, world-building, plot, etc.)
- **Context Requirements**: Determines RAG and contextual needs
- **Model Selection**: Suggests optimal models based on task characteristics

### Quality Management
- **Pass Quality Assessment**: Evaluates each pass against predefined criteria
- **Improvement Planning**: Identifies areas for enhancement
- **Confidence Scoring**: Tracks confidence levels throughout processing
- **Error Handling**: Graceful failure handling with fallback strategies

## 📁 File Structure

```
ai-server/src/services/aiProcessing/
├── UniversalProcessor.ts     # Abstract base class for all processors
├── TaskClassifier.ts         # Request classification and analysis
├── QualityGates.ts          # Quality assessment and gating
├── ProgressTracker.ts       # Progress tracking and reporting
├── PassSelector.ts          # Intelligent pass selection logic
├── types.ts                 # Core type definitions
├── utils.ts                 # Utility functions
├── index.ts                 # Main exports
└── README.md               # This documentation
```

## 🔧 Usage

### Basic Implementation

```typescript
import { UniversalProcessor, AIRequest, ProcessingContext } from '../aiProcessing/index.js';

class MyCustomProcessor extends UniversalProcessor {
    async determineRequiredPasses(request: AIRequest): Promise<number> {
        // Analyze request and determine pass count
        const classification = await this.taskClassifier.classify(request);
        return classification.recommendedPasses;
    }

    async executePass(
        passNumber: number, 
        request: AIRequest, 
        context: ProcessingContext
    ): Promise<PassResult> {
        // Implement your pass logic here
        switch (passNumber) {
            case 1:
                return await this.analyzeAndClassify(request, context);
            case 2:
                return await this.gatherContext(request, context);
            case 3:
                return await this.generateContent(request, context);
            // ... more passes
        }
    }

    async assessPassQuality(
        result: PassResult, 
        gate: QualityGate
    ): Promise<PassAssessment> {
        return await this.qualityGates.assessPassQuality(result, gate);
    }
}
```

### Request Processing

```typescript
const processor = new MyCustomProcessor();

const request: AIRequest = {
    id: 'req_123',
    type: 'character-generation',
    complexity: 'moderate',
    domain: 'character',
    scope: 'chapter',
    qualityRequirement: 'standard',
    ragDomain: 'universe:star-trek',
    content: 'Create a compelling Starfleet officer character...',
    // ... other properties
};

const response = await processor.process(request);
console.log('Processing completed:', response);
```

## 🔬 Components

### UniversalProcessor (Abstract Base Class)

The core abstract class that all AI processors must extend. Provides:
- Multi-pass orchestration
- Quality gate enforcement
- Progress tracking integration
- Error handling and fallback strategies
- Timeout protection

### TaskClassifier

Analyzes incoming requests to determine:
- **Task Type**: simple, complex, structured, creative
- **Complexity Metrics**: vocabulary, conceptual density, narrative complexity
- **Domain Classification**: character, world-building, plot, technical, etc.
- **Context Requirements**: RAG needs, context size, cross-references
- **Processing Recommendations**: pass count, model selection, latency tolerance

### QualityGates

Manages quality assessment throughout the pipeline:
- **Pass Assessment**: Evaluates results against quality criteria
- **Gate Validation**: Determines if processing should continue
- **Improvement Planning**: Identifies specific areas for enhancement
- **Retry Logic**: Handles quality failures with intelligent retry strategies

### ProgressTracker

Provides real-time progress monitoring:
- **Pass Progress**: Tracks individual pass execution
- **Overall Progress**: Calculates total completion percentage
- **Time Estimation**: Predicts remaining processing time
- **Event Logging**: Records processing events for debugging

### PassSelector

Implements intelligent pass selection:
- **Execution Planning**: Creates optimal pass execution plans
- **Conditional Logic**: Determines which passes to execute
- **Dependency Management**: Ensures pass dependencies are met
- **Early Termination**: Identifies when processing can complete early

## 🏷️ Key Types

### AIRequest
Represents an incoming AI processing request with classification metadata.

### ProcessingContext
Maintains processing state and accumulated context across passes.

### PassResult
Contains the result of a single pass execution with quality metrics.

### QualityGate
Defines quality criteria and thresholds for pass validation.

### TaskClassification
Contains the analysis results from request classification.

## 🚦 Quality Gates

Quality gates ensure high-quality output by:
1. **Completeness Check**: Verifying all required elements are present
2. **Quality Assessment**: Evaluating output quality against thresholds
3. **Consistency Validation**: Ensuring internal consistency
4. **Integration Verification**: Checking how well results integrate

## 📊 Progress Tracking

The framework provides comprehensive progress tracking:

```typescript
// Register for progress updates
progressTracker.onProgress(requestId, (update) => {
    console.log(`Progress: ${(update.progress * 100).toFixed(1)}%`);
    console.log(`Status: ${update.status}`);
    console.log(`Message: ${update.message}`);
});

// Listen for framework events
progressTracker.addEventListener((event) => {
    if (event.type === 'pass_complete') {
        console.log(`Pass ${event.data.passNumber} completed`);
    }
});
```

## ⚙️ Configuration

Framework behavior can be customized through:

```typescript
const settings: ProcessingSettings = {
    maxPasses: 7,
    qualityThreshold: 0.8,
    timeoutPerPass: 30000,
    enableProgressTracking: true,
    enableQualityGates: true,
    fallbackOnFailure: true
};

const processor = new MyProcessor(settings);
```

## 🔄 Pass Types

The framework supports seven standard pass types:

1. **Analysis & Classification**: Analyze request and classify requirements
2. **Context Gathering**: Collect relevant context and RAG data
3. **Initial Generation**: Generate initial content or response
4. **Quality Assessment**: Evaluate quality and identify improvements
5. **Targeted Improvement**: Apply specific improvements
6. **Cross-Reference Validation**: Validate references and consistency
7. **Final Polish & Integration**: Final refinements and integration

## 🎯 Next Steps

This framework foundation enables:
1. **Text-to-RAG Parser Enhancement**: Multi-pass RAG processing
2. **Character Generation**: Sophisticated character creation workflows
3. **Content Generation**: Multi-pass writing and editing
4. **Quality Assurance**: Automated quality validation
5. **Performance Optimization**: Intelligent resource allocation

## 🧪 Testing

```bash
# Run framework tests
npm run test:ai-server

# Run with coverage
npm run test:coverage

# Run specific pattern
npx tsx scripts/run-tests-with-output.ts --pattern "aiProcessing"
```

## 📝 Implementation Status

- ✅ **Core Framework**: UniversalProcessor, types, utilities
- ✅ **Quality System**: QualityGates with assessment logic
- ✅ **Progress Tracking**: ProgressTracker with real-time updates
- ✅ **Task Classification**: TaskClassifier with complexity analysis
- ✅ **Pass Selection**: PassSelector with intelligent execution logic
- 🚧 **MessageProcessor Integration**: Updating existing processors
- 🚧 **Text-to-RAG Enhancement**: Multi-pass RAG implementation
- ⏳ **Character Generation**: New character processor
- ⏳ **API Integration**: REST endpoints and frontend integration

---

*This framework provides the foundation for sophisticated AI processing across the Universe Book Writer platform, enabling high-quality, efficient, and intelligent content generation.*
