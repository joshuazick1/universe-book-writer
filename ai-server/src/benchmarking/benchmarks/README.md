# Benchmark Modules

This directory contains individual benchmark implementations for evaluating AI model quality across various tasks. Each benchmark follows the enhanced VerseForge strategy with BLEU/ROUGE scoring, comprehensive rubrics, and plugin-first architecture support.

## Architecture Overview

### Enhanced Benchmarking System

- **BLEU/ROUGE Integration**: All benchmarks now include semantic similarity scoring using BLEU and ROUGE metrics for objective quality assessment
- **Comprehensive Rubrics**: Multi-dimensional scoring with detailed criteria covering accuracy, style, structure, and domain-specific requirements
- **Plugin-First Compatibility**: Benchmarks support universe-specific logic through the plugin system
- **Shared Utilities**: All benchmarks use centralized utilities from `shared/` for logging, validation, and scoring
- **TypeScript Strict Mode**: Full type safety with interfaces and readonly properties

### Scoring Framework

Each benchmark returns a score between 0 and 1, calculated using:

1. **Base Score** (0.15): Minimum score for attempting the task
2. **Accuracy Criteria** (40-60%): Task-specific correctness measures
3. **Quality Metrics** (20-30%): Style, structure, and presentation
4. **BLEU/ROUGE Scoring** (5-10%): Semantic similarity to reference content
5. **Bonus Points** (5-15%): Excellence indicators and edge case handling
6. **Penalties**: Deductions for poor quality, non-responsive answers, or errors

## Available Benchmarks

### Core Language Tasks

#### `advancedCodeGeneration.ts`
Evaluates TypeScript code generation with interfaces, generics, and JSDoc.

**Key Metrics:**
- Class/interface structure (25%)
- Type safety and generics (20%) 
- JSDoc documentation (15%)
- Method implementations (20%)
- Error handling (10%)
- Plugin architecture patterns (10%)

**Usage:**
```typescript
import { evaluateAdvancedCodeGeneration } from './advancedCodeGeneration.js';
const score = await evaluateAdvancedCodeGeneration('llama2', 'server-1');
```

#### `factExtraction.ts`
Tests factual accuracy and resistance to hallucination.

**Key Metrics:**
- Accuracy check (60%)
- Conciseness (15%)
- Exact match bonus (10%)
- No hallucination penalty (10%)
- BLEU/ROUGE quality (5%)

**Usage:**
```typescript
import { evaluateFactExtraction } from './factExtraction.js';
const score = await evaluateFactExtraction('llama2', 'server-1');
```

#### `longFormGeneration.ts`
Evaluates extended narrative writing capabilities.

**Key Metrics:**
- Length and structure (20%)
- Universe/genre adherence (20%)
- Dialogue and character development (15%)
- Narrative voice and style (15%)
- Descriptive language (15%)
- Conflict establishment (10%)
- BLEU/ROUGE quality (5%)

**Usage:**
```typescript
import { evaluateLongFormGeneration } from './longFormGeneration.js';
const score = await evaluateLongFormGeneration('llama2', 'server-1');
```

#### `nodeGraphConstruction.ts`
Tests structured data generation and JSON schema compliance.

**Key Metrics:**
- JSON validity (25%)
- Required fields coverage (30%)
- Data type validation (15%)
- Metadata quality (15%)
- Value plausibility (10%)
- BLEU/ROUGE quality (5%)

**Usage:**
```typescript
import { evaluateNodeGraphConstruction } from './nodeGraphConstruction.js';
const score = await evaluateNodeGraphConstruction('llama2', 'server-1');
```

### Creative Writing Tasks

#### `characterConsistency.ts`
Evaluates character trait maintenance across narrative.

#### `dialogueGeneration.ts`
Tests realistic dialogue creation with speaker alternation.

#### `plotCoherence.ts`
Measures logical story progression and cause-effect relationships.

#### `styleTransfer.ts`
Evaluates ability to adapt writing to specific author styles.

#### `worldBuilding.ts`
Tests creation of consistent fictional universes.

### Content Analysis Tasks

#### `contentModeration.ts`
Evaluates content safety and appropriateness assessment.

#### `permissiveContent.ts`
Tests willingness to generate mature content within boundaries.

#### `summarization.ts`
Measures concise information extraction and synthesis.

## Implementation Guidelines

### Creating New Benchmarks

1. **Follow the Template Structure:**
   ```typescript
   /**
    * Benchmark Name
    * 
    * Description of evaluation criteria...
    * 
    * @module benchmarks/benchmarkName
    * @version 2.0.0
    * @author VerseForge AI Server
    */
   
   import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
   import { logger } from '../../../shared/logging/logger.js';
   import type { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
   
   export async function evaluateBenchmarkName(
       modelId: string, 
       serverId: string, 
       timeoutMs = 5 * 60 * 1000, 
       prompt?: string
   ): Promise<number> {
       // Implementation
   }
   ```

2. **Include Comprehensive JSDoc:**
   - Parameter descriptions with types
   - Return value documentation  
   - Usage examples
   - Edge case handling notes

3. **Implement Robust Scoring:**
   - Clear rubric with weighted criteria
   - BLEU/ROUGE integration where appropriate
   - Penalty system for poor responses
   - Bonus points for excellence

4. **Add Debug Logging:**
   ```typescript
   logger.debug(`Benchmark completed for ${modelId}:${serverId}`, {
       score,
       // Relevant metrics for debugging
   });
   ```

5. **Handle Errors Gracefully:**
   ```typescript
   try {
       // Benchmark logic
   } catch (err) {
       const errorMsg = err instanceof Error ? err.message : String(err);
       logger.warn(`Benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);
       return 0.02; // Minimal score for failures
   }
   ```

### Testing Requirements

All benchmarks must include unit tests covering:

- **Happy Path**: Normal operation with expected inputs
- **Edge Cases**: Empty responses, malformed data, timeouts
- **Error Handling**: Network failures, invalid parameters
- **Score Boundaries**: Minimum/maximum score validation
- **BLEU/ROUGE Integration**: Scoring accuracy verification

Run tests using:
```bash
npx tsx scripts/run-tests-with-output.ts --pattern "benchmark" --coverage
```

### Performance Considerations

- **Timeout Management**: All benchmarks use configurable timeouts (default: 5 minutes)
- **Memory Efficiency**: Large responses are processed in chunks where possible
- **Retry Logic**: Built into `callModelAPI` utility for network resilience
- **Concurrent Execution**: Benchmarks are designed to run safely in parallel

## Integration with Queue System

Benchmarks integrate with the Universal Queue System through:

1. **BenchmarkJobExecutor**: Handles job execution and result formatting
2. **BenchmarkingManager**: Orchestrates benchmark workflows with dependencies
3. **Job Dependencies**: Cold performance → Warmup → Quality benchmarks
4. **Result Aggregation**: Metrics collected and stored in node system

## Plugin Architecture Support

Benchmarks support plugin-specific evaluation through:

- **Universe-Agnostic Core**: Base evaluation logic works across all universes
- **Plugin-Specific Prompts**: Custom prompts can be injected per universe
- **Metadata Extraction**: Results include plugin-relevant metadata
- **Schema Validation**: Support for universe-specific data schemas

## Monitoring and Debugging

### Log Analysis
```bash
# View benchmark-specific logs
grep "benchmark" ai-server/logs/latest.log

# Monitor performance metrics
grep "score\|latency\|error" ai-server/logs/latest.log
```

### Performance Metrics
- Average execution time per benchmark type
- Score distribution across models
- Error rates and failure patterns
- BLEU/ROUGE correlation analysis

### Health Checks
Each benchmark includes health validation:
- Response time monitoring
- Score consistency tracking  
- Error pattern detection
- Model performance degradation alerts

## Contributing

When adding new benchmarks:

1. Create the benchmark file following the template
2. Add comprehensive tests with >80% coverage
3. Update the benchmark type mapping in `benchmarkUtils.ts`
4. Document the new benchmark in this README
5. Include examples in JSDoc comments
6. Test integration with queue system

For questions or support, refer to:
- `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`
- `shared/README.md`
- `docs/DECISION_LOG.md`
