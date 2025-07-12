# Quality Judger Validators

This directory contains modular, composable validators for the RAG distributed enrichment pipeline's quality judger. Validators are used to score and validate model/worker responses for various enrichment tasks (summarization, entity extraction, etc.) according to task-specific rubrics.

## Implemented Validators

- **lengthValidator**: Checks if a string is within a specified length range.
- **schemaValidator**: Validates that an object matches a required property schema.
- **regexValidator**: Checks if a string matches a given regex pattern.
- **referenceMetricsValidator**: Computes BLEU, ROUGE, or F1 score against a reference string.
- **entityCountValidator**: Validates that the number of entities matches an expected count or range.
- **aiAssistedValidator**: Stub for AI/LLM-based scoring of subjective metrics (clarity, engagement, etc.).

## Usage

Each validator exports a function with the following signature:

```ts
(value: unknown, params: Record<string, unknown>) => { passed: boolean; score: number; rationale: string; metric: string }
```

- `value`: The value to validate (string, object, or array depending on the validator)
- `params`: Validator-specific parameters (see each validator's JSDoc)
- Returns: An object with `passed`, `score`, `rationale`, and `metric` fields

## Adding New Validators

- Place new validator modules in this directory.
- Export them from `index.ts`.
- Document usage and parameters in the module JSDoc and update this README.

## Example

```ts
import { lengthValidator } from './validators/lengthValidator.js';
const result = lengthValidator('This is a summary.', { min: 10, max: 100 });
// result: { passed: true, score: 1, rationale: '...', metric: 'length' }
```

## See Also
- [RAG_Distributed_Queue_Implementation_Plan.md](../../../docs/RAG_Distributed_Queue_Implementation_Plan.md)
- [QualityJudgerService.ts](../QualityJudgerService.ts)
- [Rubric Configs](../rubrics/)
