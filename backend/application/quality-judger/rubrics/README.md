# AI-Assisted Scoring Rubric Example: Summarization

This rubric defines subjective, LLM-evaluated metrics for summarization jobs. Each metric uses the `aiAssisted` validator, which should call an LLM (e.g., TinyLlama, DistilBERT) with a prompt and examples to score the result.

## Metrics
- **clarity**: How clear and understandable is the summary?
- **coherence**: Does the summary flow logically and maintain coherence?
- **engagement**: How engaging or interesting is the summary?

Each metric includes:
- A prompt for the LLM
- Example summaries and scores for calibration
- A weight (all weights sum to 1)

## Example Rubric JSON
See `summarization.ai-assisted.json` in this directory.

## Usage
- The QualityJudgerService should load this rubric for summarization jobs when AI-assisted scoring is enabled.
- The `aiAssistedValidator` should use the prompt and examples to query the LLM and return a score and rationale.

## Extending
- Add more metrics or adjust weights as needed for your use case.
- Provide more/better examples to improve LLM calibration.

---

**See also:**
- [RAG_Distributed_Queue_Implementation_Plan.md](../../../docs/RAG_Distributed_Queue_Implementation_Plan.md)
- [QualityJudgerService.ts](../QualityJudgerService.ts)
