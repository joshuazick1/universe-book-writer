## Handling Excess Warmup Slots and Test Aggregation

If the number of available warmup slots exceeds the number of unique quality tests, assign tests in a round-robin fashion so that each test is repeated as evenly as possible. This ensures all slots are utilized and provides multiple data points per test for more robust analysis.

### Example
- If there are 10 unique tests and 30 warmup slots, each test is assigned to 3 slots (30/10 = 3).
- Assignment is done by cycling through the test list: slot 0 gets test 1, slot 1 gets test 2, ..., slot 9 gets test 10, slot 10 gets test 1 again, etc.

### Aggregation of Duplicated Tests
- For tests that are repeated across multiple slots, aggregate the results for each test type per server.
- Aggregation methods may include:
  - **Average**: Mean score across all runs of the same test.
  - **Median**: Middle value, robust to outliers.
  - **Min/Max**: For identifying best/worst case performance.
- Store both the aggregated result and the individual run results for full transparency and later analysis.

### Benefits
- Increases statistical confidence in benchmark results.
- Helps identify flaky or inconsistent model/server behavior.
- Maximizes use of available server resources.

---
# Enhanced Latency and Quality Benchmarking Plan

## Overview
This document outlines the new approach for orchestrating latency and quality benchmarks across multiple servers and model types. The goal is to maximize parallelism, minimize cold start effects, and efficiently utilize available servers for both latency and quality evaluation.

---


## Step-by-Step Approach

### 1. Cold Latency + JSON Quality Test (per server)
- For each server, run a cold latency test (first request after model load).
- Use the JSON Assembly prompt for this request.
- Measure and record:
  - Cold latency (time to first response)
  - JSON quality score (using the shared benchmark function)
- As soon as a server completes its cold test (regardless of other servers' status), immediately proceed to the next step for that server. Do not wait for all servers to finish cold testing.
- If a server returns an error (e.g., 500), exclude it from further benchmarking steps to avoid blocking or complicating downstream logic.

### 2. Warmup Tests: Parallelize Quality Benchmarks (per server, after cold test)
- For each server that successfully completes cold testing, determine the number of warmup slots dynamically (e.g., 3 per server, or as configured).
- Distribute all available quality benchmarks across these warmup requests for that server.
  - Example: If 10 servers × 3 warmups = 30 parallel quality tests, but a server fails cold testing, only the remaining servers participate.
- Each warmup request uses a different quality benchmark prompt (e.g., creative-writing, task-planning, etc.).
- Track which quality benchmarks are completed during warmup for each server.

### 3. Warm Latency Tests: Protocol Compliance (per server)
- For each server that completed warmup, run 3 warm latency tests using the protocol compliance phrase (single word/phrase response).
- Measure and record warm latency for each.

### 4. Remaining Quality Tests
- After warmup, run any quality benchmarks that were not already completed during warmup (if there are more benchmarks than warmup slots).
- Ensure all required quality benchmarks are completed for each model/server.

---

## Implementation Notes
- Track which quality benchmarks are assigned to each warmup slot and which remain.
- For each request, record both latency and quality score (if applicable).
- Use the `extractThinkingAndAnswer` utility for all quality scoring to handle "thinking model" output.
- Aggregate results per server for both latency and quality.
- Persist results to the appropriate nodes for later analysis and reporting.

---

## Benefits
- Reduces total benchmarking time by parallelizing quality tests during model warmup.
- Ensures cold and warm latency are measured under realistic conditions.
- Maximizes server utilization and minimizes idle time.
- Provides robust, repeatable, and extensible benchmarking for future model and server types.

---


## Implementation Steps

1. **Server Discovery and Initialization**
   - Enumerate all available servers and their model assignments.
   - Initialize tracking structures for server status, test assignments, and results.

2. **Cold Latency + JSON Quality Test (per server)**
   - For each server, send a cold request using the JSON Assembly prompt.
   - Record cold latency and JSON quality score.
   - If a server returns an error (e.g., 500), mark it as failed and exclude from further steps.
   - As soon as a server completes cold testing, immediately proceed to warmup/quality tests for that server.

3. **Dynamic Warmup Slot Assignment**
   - For each server that passed cold testing, determine the number of warmup slots (e.g., 3 per server, or as configured).
   - Calculate total warmup slots across all active servers.
   - Assign quality benchmarks to warmup slots in round-robin fashion, repeating tests as needed to fill all slots.
   - Track which benchmarks are assigned to each slot and server.

4. **Parallel Warmup/Quality Test Execution**
   - For each server, execute assigned quality benchmarks in parallel warmup slots.
   - For each request, record latency and quality score (using `extractThinkingAndAnswer` for "thinking models").
   - Mark completed benchmarks for each server.

5. **Warm Latency Tests (per server)**
   - For each server that completed warmup, run 3 protocol compliance (warm latency) tests.
   - Record warm latency for each.

6. **Remaining Quality Tests**
   - For each server, identify any quality benchmarks not completed during warmup.
   - Execute remaining benchmarks to ensure full coverage.

7. **Aggregation and Result Storage**
   - For repeated tests, aggregate results per test type and server (average, median, min/max, etc.).
   - Store both aggregated and individual results for transparency.
   - Persist all results to the appropriate nodes for later analysis and reporting.

8. **Error Handling and Robustness**
   - Exclude servers that fail at any stage from further steps.
   - Log errors and mark affected tests as failed/skipped for traceability.

9. **Reporting and Documentation**
   - Generate summary reports of latency and quality per server/model.
   - Update documentation and code comments as implementation evolves.
   - Review and refine orchestration logic based on real-world results and feedback.

---

---

**File:** `docs/ENHANCED_LATENCY_QUALITY_BENCHMARKING_PLAN.md`
