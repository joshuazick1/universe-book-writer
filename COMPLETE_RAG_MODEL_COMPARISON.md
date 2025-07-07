# Complete RAG Model Evaluation: Regular vs Abliterated Models

## Test Results Overview

This comprehensive analysis compares the performance of both regular and abliterated/uncensored Ollama models for the TextToRAGParser use case, testing 16 models total across 4 narrative scenarios.

## Performance Rankings - ALL MODELS

### 🥇 **Top Overall Performers (Combined Rankings)**

| Rank | Model | Type | Overall Score | Success Rate | JSON Validity | Avg Response Time | Avg Entities | Confidence |
|------|-------|------|---------------|--------------|---------------|------------------|--------------|------------|
| 🥇 1st | `deepseek-coder-v2:16b` | Regular | 96.0% | 4/4 (100%) | 100% | 5.5s | 8.3 | 81.3% |
| 🥈 2nd | `mistral-nemo:12b` | Regular | 96.0% | 4/4 (100%) | 100% | 5.5s | 6.3 | 81.3% |
| 🥉 3rd | `phi4:latest` | Regular | 94.9% | 4/4 (100%) | 100% | 7.7s | 8.0 | 81.3% |
| 4th | `codestral:22b` | Regular | 93.3% | 4/4 (100%) | 100% | 10.8s | 8.0 | 81.3% |
| 5th | `qwen2.5:32b` | Regular | 91.1% | 4/4 (100%) | 100% | 15.2s | 7.3 | 81.3% |
| 6th | `gemma3:27b` | Regular | 73.3% | 3/4 (75%) | 75% | 16.7s | 8.0 | 83.3% |
| 7th | `wizardlm-uncensored:latest` | **Abliterated** | 72.4% | 3/4 (75%) | 75% | 22.0s | 7.3 | 83.3% |
| 8th | `nidumai/nidum-gemma-3-4b-it-uncensored:q3_k_m` | **Abliterated** | 62.0% | 2/4 (50%) | 50% | 6.2s | 12.0 | 87.5% |
| 9th | `wizard-vicuna-uncensored:13b` | **Abliterated** | 55.5% | 2/4 (50%) | 50% | 22.4s | 11.0 | 87.5% |
| 10th | `huihui_ai/deepseek-r1-abliterated:latest` | **Abliterated** | 52.5% | 2/4 (50%) | 50% | 32.0s | 9.5 | 87.5% |
| 11th | `wizard-vicuna-uncensored:7b` | **Abliterated** | 47.1% | 2/4 (50%) | 50% | 5.9s | 2.5 | 12.5% |
| 12th | `huihui_ai/qwen3-abliterated:latest` | **Abliterated** | 32.5% | 1/4 (25%) | 25% | 41.5s | 7.0 | 75.0% |

*Note: Multiple models (both regular and abliterated) failed all tests due to timeouts and are not included in this ranking.*

## Key Findings

### 🏆 **Regular Models Dominate**
- **Top 6 positions** are all held by regular (non-abliterated) models
- **Perfect reliability**: All top 5 regular models achieved 100% success rate and JSON validity
- **Speed advantage**: Regular models consistently faster (5-15s vs 20-40s for abliterated)
- **Consistency**: Regular models show more predictable performance

### 📊 **Abliterated Model Performance**
- **Best abliterated**: `wizardlm-uncensored:latest` at 7th place overall (72.4% score)
- **Interesting paradox**: Some abliterated models show higher confidence (87.5%) but lower success rates
- **JSON issues**: More JSON parsing failures in abliterated models
- **Timeout problems**: Several abliterated models consistently timed out

### 💡 **Key Insights**

1. **Regular Models Are Superior for Structured Tasks**
   - All top performers are regular models
   - Better JSON compliance and reliability
   - Faster response times
   - More consistent performance

2. **Abliteration Trade-offs**
   - Abliterated models may extract more entities when successful
   - Higher confidence scores in some cases
   - Significantly slower performance
   - More prone to formatting errors

3. **Size vs Performance**
   - Medium-sized models (12B-16B) still optimal
   - Large abliterated models (32B+) often timeout
   - Smaller abliterated models (4B) show promise but inconsistent

4. **JSON Validity Critical**
   - Regular models: 75-100% JSON validity
   - Abliterated models: 25-75% JSON validity
   - Our `fixMalformedJson` function crucial for abliterated models

## Detailed Comparisons

### **Best in Class Comparisons**

| Category | Regular Model | Score | Abliterated Model | Score |
|----------|---------------|-------|-------------------|-------|
| **Overall Best** | `deepseek-coder-v2:16b` | 96.0% | `wizardlm-uncensored:latest` | 72.4% |
| **Fastest** | `deepseek-coder-v2:16b` | 5.5s | `wizard-vicuna-uncensored:7b` | 5.9s |
| **Most Entities** | `deepseek-coder-v2:16b` | 8.3 avg | `nidumai/nidum-gemma-3-4b-it-uncensored` | 12.0 avg |
| **Highest Confidence** | `gemma3:27b` | 83.3% | `nidumai/nidum-gemma-3-4b-it-uncensored` | 87.5% |
| **Most Reliable** | Multiple (100%) | 100% | `wizardlm-uncensored:latest` | 75% |

### **Use Case Recommendations**

#### **Production RAG Systems** ⭐
**Winner: Regular Models**
- **Primary**: `deepseek-coder-v2:16b` - Best overall performance
- **Fallback**: `mistral-nemo:12b` - Fast and reliable
- **Why**: 100% reliability, perfect JSON, fast responses

#### **Content with Adult Themes** 🔓
**Winner: Abliterated Models**
- **Primary**: `wizardlm-uncensored:latest` - Best abliterated performance
- **Alternative**: `nidumai/nidum-gemma-3-4b-it-uncensored:q3_k_m` - Fast and extracts many entities
- **Why**: No content restrictions, though less reliable

#### **Development/Testing** 🚀
**Winner: Regular Models**
- **Choice**: `mistral-nemo:12b` - Perfect balance of speed and reliability
- **Why**: Fast iteration, consistent results

#### **Research/Experimentation** 🔬
**Interesting**: `nidumai/nidum-gemma-3-4b-it-uncensored:q3_k_m`
- Extracts most entities (12.0 avg) when successful
- Highest confidence (87.5%)
- Fast responses (6.2s)
- But only 50% success rate

## Technical Insights

### **JSON Parsing Success Rates**
- **Regular models**: 75-100% (average: 95%)
- **Abliterated models**: 25-75% (average: 46%)

### **Response Time Patterns**
- **Regular models**: 5.5-16.7s (average: 10.1s)
- **Abliterated models**: 5.9-41.5s (average: 21.9s)

### **Entity Extraction**
- **Regular models**: 6.3-8.3 entities (average: 7.6)
- **Abliterated models**: 2.5-12.0 entities (average: 8.2 when successful)

## Final Recommendations

### 🥇 **For Production Systems**
**Use regular models exclusively**
1. `deepseek-coder-v2:16b` - Primary choice
2. `mistral-nemo:12b` - Backup/development
3. `phi4:latest` - Alternative

### 🔓 **For Uncensored Content**
**If abliterated models are required**
1. `wizardlm-uncensored:latest` - Most reliable abliterated
2. `nidumai/nidum-gemma-3-4b-it-uncensored:q3_k_m` - Fast alternative
3. Implement extra error handling and retries

### ⚙️ **Implementation Notes**
1. **Timeout settings**: 30s for regular, 45s for abliterated models
2. **Error handling**: Essential for abliterated models
3. **JSON fixing**: Critical for both but especially abliterated
4. **Retry logic**: Recommended for abliterated models

---

*Comprehensive test conducted on: July 4, 2025*  
*Total tests performed: 64 (16 models × 4 scenarios)*  
*Regular models tested: 8 | Abliterated models tested: 8*  
*Test scripts: `test-rag-models.ts` & `test-abliterated-models.ts`*
