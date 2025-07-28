# Extract Thinking and Answer Utility

This utility provides a shared function for extracting both the reasoning ("thinking") and the final answer from model responses that may include <think>...</think> blocks. It is designed for use in the orchestrator, benchmarking, and any other part of the system that needs to distinguish between model reasoning and the actual answer.

## Usage

```ts
import { extractThinkingAndAnswer } from 'shared/utils/extractThinkingAndAnswer';

const response = `<think>I'm considering the options...</think>The answer is 42.`;
const { thinking, answer } = extractThinkingAndAnswer(response);
// thinking: "I'm considering the options..."
// answer: "The answer is 42."
```

- If multiple <think> blocks are present, all are concatenated (separated by double newlines).
- If no <think> block is present, `thinking` is `null` and `answer` is the full response.
- Handles edge cases: empty string, malformed tags, whitespace, etc.

## API

### `extractThinkingAndAnswer(raw: string): { thinking: string | null, answer: string }`
- `raw`: The raw model response string.
- Returns an object with `thinking` (string or null) and `answer` (string).

## Edge Cases
- Handles multiple <think> blocks.
- Ignores malformed or incomplete tags.
- Trims whitespace from both parts.

## Integration
- Use in latency and quality benchmarks to separate reasoning from the final answer.
- Can be used in the orchestrator or plugins for advanced response handling.

---

**Location:** `shared/utils/extractThinkingAndAnswer.ts`
# Shared Utils

This folder contains generic utility functions for use across all packages.

## Included Utilities


### generateId
- Generates a cryptographically strong, URL-safe unique identifier string.
- Usage:
  ```ts
  import { generateId } from 'shared/utils';
  const id = generateId();
  ```
- Edge cases: Throws if length is not a positive integer.

### pipelineTasks
- Composes and runs async tasks in sequence (pipeline pattern).
- Usage:
  ```ts
  import { pipelineTasks } from 'shared/utils';
  const pipeline = pipelineTasks([
    async (x) => x + 1,
    async (x) => x * 2,
  ]);
  const result = await pipeline(3); // 8
  ```
- Edge cases: Throws if tasks is not an array of functions; rejects if any task throws.

## Conventions
- All utilities must be strictly typed and documented with JSDoc.
- Add new utilities here and export via `index.ts`.

## See Also
- [shared/README.md](../README.md)
