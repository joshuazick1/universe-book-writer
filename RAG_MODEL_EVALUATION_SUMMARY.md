# RAG Model Evaluation Summary

## Test Results Overview

After comprehensive testing of 8 Ollama models with 4 different narrative scenarios, we have clear winners for the TextToRAGParser use case.

## Performance Rankings

| Rank | Model | Overall Score | Success Rate | JSON Validity | Avg Response Time | Avg Entities | Confidence |
|------|-------|---------------|--------------|---------------|------------------|--------------|------------|
| 🥇 1st | `deepseek-coder-v2:16b` | 96.0% | 4/4 (100%) | 100% | 5.5s | 8.3 | 81.3% |
| 🥈 2nd | `mistral-nemo:12b` | 96.0% | 4/4 (100%) | 100% | 5.5s | 6.3 | 81.3% |
| 🥉 3rd | `phi4:latest` | 94.9% | 4/4 (100%) | 100% | 7.7s | 8.0 | 81.3% |
| 4th | `codestral:22b` | 93.3% | 4/4 (100%) | 100% | 10.8s | 8.0 | 81.3% |
| 5th | `qwen2.5:32b` | 91.1% | 4/4 (100%) | 100% | 15.2s | 7.3 | 81.3% |
| 6th | `gemma3:27b` | 73.3% | 3/4 (75%) | 75% | 16.7s | 8.0 | 83.3% |
| 7th | `llama3.3:latest` | 0.0% | 0/4 (0%) | 0% | 30s+ | 0 | 0% |
| 8th | `qwen3:14b` | 0.0% | 0/4 (0%) | 0% | 30s+ | 0 | 0% |

## Key Findings

### 🏆 Top Recommendations

1. **Best Overall: `deepseek-coder-v2:16b`**
   - Perfect success rate and JSON validity
   - Fast response times (5.5s average)
   - High entity extraction count (8.3 avg)
   - Excellent structured output reliability

2. **Best Speed/Performance Balance: `mistral-nemo:12b`**
   - Tied for best overall score
   - Very fast and reliable
   - Good entity extraction (6.3 avg)
   - Perfect JSON validity

3. **Most Accurate: `gemma3:27b`**
   - Highest confidence score (83.3%)
   - Good entity extraction when it works
   - Some timeout issues with complex prompts

### 💡 Key Insights

1. **Large Models Don't Always Win**: The 70B+ models (llama3.3, qwen3:14b) timed out consistently, showing that size isn't everything for structured output tasks.

2. **Code-Trained Models Excel**: Both `deepseek-coder-v2:16b` and `codestral:22b` performed excellently, suggesting that models trained on code are better at producing valid JSON.

3. **Sweet Spot Size Range**: The 12B-16B parameter range seems optimal for this task, balancing capability with speed.

4. **JSON Validity Is Crucial**: All successful models achieved 100% JSON validity, thanks to our enhanced `fixMalformedJson` function.

## Recommended Model Configuration

For production use in the TextToRAGParser:

### Primary Choice: `deepseek-coder-v2:16b`
- **Pros**: Best overall performance, perfect reliability, fast enough
- **Cons**: Larger download size (8.3GB)
- **Use Case**: Production environments where reliability is key

### Fallback Choice: `mistral-nemo:12b`
- **Pros**: Tied performance, smaller size (6.6GB), very fast
- **Cons**: Slightly fewer entities extracted
- **Use Case**: Development or resource-constrained environments

### Specialized Choice: `phi4:latest`
- **Pros**: Excellent balance, Microsoft model, good performance
- **Cons**: Slightly slower than top two
- **Use Case**: Windows-first environments or when diversity is needed

## Implementation Notes

1. **Timeout Handling**: Set timeout to 25-30 seconds to handle slower responses
2. **JSON Parsing**: Our enhanced `fixMalformedJson` function is crucial for reliability
3. **Chunking**: All tested models handle the enhanced chunked processing well
4. **Advanced Metadata**: Models successfully extract mood, themes, and timeline anchors

## Test Scenarios Used

1. **Fantasy Politics**: Complex political narrative with multiple characters and organizations
2. **Sci-Fi Discovery**: Scientific discovery with characters, locations, and objects
3. **Historical Event**: Event-focused narrative with organizations and lore
4. **Complex Fantasy**: Multi-layered fantasy with artifacts and locations

## Machine-Readable Data

Full test results are available in `model-test-results.json` for automated decision making and further analysis.

## Additional Testing

**Abliterated/Uncensored Models**: A separate comprehensive test was conducted on 8 abliterated/uncensored models. Results show that regular models significantly outperform abliterated models for structured RAG tasks. See `COMPLETE_RAG_MODEL_COMPARISON.md` for the full analysis comparing all 16 models tested.

**Key Finding**: While abliterated models may be needed for content without restrictions, they show 50% lower success rates and 2x slower response times compared to regular models.

---

*Test conducted on: July 4, 2025*  
*Total tests performed: 64 (16 models × 4 scenarios)*  
*Test scripts: `test-rag-models.ts` & `test-abliterated-models.ts`*
