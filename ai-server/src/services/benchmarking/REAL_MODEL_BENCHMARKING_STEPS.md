# Enabling Real Model Quality Benchmarks in QualityBenchmarkManager

This guide outlines the steps required to replace the current mock/simulated quality benchmarking in `QualityBenchmarkManager.ts` with real, automated tests against actual model endpoints. The goal is to ensure that quality scores reflect true model performance for JSON generation, conversational, and character generation tasks.

---

## 1. Identify Model API Endpoints
- **Determine the API** each model exposes for text generation (e.g., REST, gRPC, WebSocket).
- **Document authentication** and request/response formats for each model server.

## 2. Refactor `simulateModelCall`
- **Replace** the `simulateModelCall` method with a real API call:
  - Use `fetch`, `axios`, or another HTTP client to send prompts to the model endpoint.
  - Pass the prompt in the correct request format (e.g., JSON body).
  - Handle authentication headers/tokens if required.
  - Parse and return the model's response text.
- **Example**:
  ```typescript
  private async callModelAPI(modelEndpoint: string, prompt: string): Promise<string> {
    const response = await fetch(modelEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error(`Model call failed: ${response.status}`);
    const data = await response.json();
    return data.text || data.response;
  }
  ```
- **Update all test methods** (`testJSONGeneration`, `testConversational`, `testCharacterGeneration`) to use the real call.

## 3. Update Evaluation Logic
- **Refactor all evaluation functions** (`evaluateJSONResponse`, `evaluateConversationalResponse`, `evaluateCharacterResponse`) to robustly handle real, variable model outputs.
  - Parse and validate responses carefully, handling malformed JSON, incomplete, or unexpected outputs gracefully.
  - For JSON evaluation, use a JSON schema validator (e.g., `ajv` or `zod`) to check structure and required fields.
  - For conversational and character responses, check for relevance, coherence, and adherence to prompt instructions.
  - Log and handle cases where the model returns empty, error, or irrelevant responses.
- **Edge Cases:**
  - Malformed JSON: Catch and log parse errors, assign low or zero score.
  - Incomplete responses: Penalize or flag for review.
  - Unexpected formats: Attempt to extract useful information, but score conservatively.
- **Advanced Metrics:**
  - Integrate NLP metrics such as BLEU, ROUGE, or BERTScore to quantitatively assess text similarity and quality.
  - **Choose a library:**
    - Use [`natural`](https://www.npmjs.com/package/natural) for BLEU and [`rouge`](https://www.npmjs.com/package/rouge) for ROUGE metrics. Both are available on npm and work with TypeScript/Node.js.
  - **Install the libraries:**
    - Run: `npm install natural rouge`
  - **Update evaluation functions:**
    - Compute BLEU/ROUGE between the model output and a reference/gold-standard response using TypeScript code.
    - Example (TypeScript BLEU with natural):
      ```typescript
      import natural from 'natural';
      const score = natural.BLEU.calculate(modelOutput.split(' '), [referenceOutput.split(' ')]);
      ```
    - Example (TypeScript ROUGE):
      ```typescript
      import rouge from 'rouge';
      const scores = rouge(modelOutput, referenceOutput);
      // scores.rougeL.f1, scores.rouge1.f1, etc.
      ```
    - For BERTScore, there is currently no mature TypeScript implementation; focus on BLEU/ROUGE for now.
  - **Incorporate metric scores** into the overall quality score, either as a weighted component or as a threshold for passing/failing outputs.
  - **Document** which metrics are used and how they affect scoring.
- **Testing:**
  - Add unit tests for all evaluation functions, including edge cases and failure scenarios.
  - Document examples of both good and bad model outputs and how they are scored.

## 4. Error Handling & Retries
- **Implement robust error handling** for network failures, timeouts, and invalid responses.
- **Add retry logic** for transient errors.
- **Log all failures** for later analysis.

## 5. Configuration & Security
- **Store model endpoint URLs and credentials** in environment variables or a secure config file.
- **Never hardcode secrets** in source code.
- **Allow dynamic discovery** of available models via orchestrator if possible.

## 6. Testing & Validation
- **Write unit and integration tests** for the new API call logic.
- **Test against a staging model server** before running on production endpoints.
- **Validate** that scores change in response to real model output quality.

## 7. Documentation
- **Update all relevant README.md files** to describe the new real benchmarking process.
- **Document**:
  - How to configure endpoints and credentials
  - How to run benchmarks manually
  - How to interpret results and logs

## 8. Rollout & Monitoring
- **Deploy changes** to a test environment first.
- **Monitor logs** for errors, timeouts, and suspicious results.
- **Iterate** on prompt selection and evaluation criteria as needed.

---

## Example: Replacing `simulateModelCall`

```typescript
// Old:
const response = await this.simulateModelCall(modelEndpoint, prompt);

// New:
const response = await this.callModelAPI(modelEndpoint, prompt);
```

---

## Checklist
- [ ] Model endpoints and API formats documented
- [ ] Real API call implemented
- [ ] Evaluation logic updated for real outputs
- [ ] Error handling and retries in place
- [ ] Secure configuration for endpoints/credentials
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Rollout plan and monitoring in place

---

**Note:**
- Always test with non-production models first to avoid service disruption.
- Consider rate limits and quotas on model servers.
- Keep evaluation logic transparent and reproducible.
