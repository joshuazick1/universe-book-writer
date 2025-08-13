# Benchmark to RAG Workflow Documentation

## Overview
This document outlines the end-to-end workflow for running benchmarks, queuing them for scoring, aggregating results (RAG), and displaying them in the frontend. It includes details on the expected behavior, endpoints involved, and the role of the gap filler in ensuring data consistency.

---

## Workflow Steps

### 1. Benchmark Execution
Benchmarks are initiated to test the performance of models on specific servers. These benchmarks generate raw performance data.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-job-executor.service.ts`**:
  - Handles the execution of benchmark jobs.
  - Queues jobs for execution and processes them to generate raw results.

- **`ai-server/src/services/benchmark-result-storage.service.ts`**:
  - Stores raw benchmark results in `model-performance` nodes.
  - Ensures only the last 20 results are retained for each model-server combination.

#### Endpoints:
- **Run All Benchmarks**:
  - **Endpoint**: `POST /api/orchestrator/benchmarks/run`
  - **Description**: Triggers all benchmarks for all model-server combinations.

- **Run Individual Benchmark**:
  - **Endpoint**: `POST /api/orchestrator/benchmarks/run/:modelId/:serverId`
  - **Description**: Triggers a benchmark for a specific model-server combination.
  - **Expected Behavior**: Queues the specified benchmark for execution and returns a success response.

#### Data Flow:
1. Benchmark jobs are added to the queue.
2. The `BenchmarkJobExecutor` processes each job, executing the benchmark and storing raw results in `model-performance` nodes.

#### Mock Data Example:
##### Raw Benchmark Results (model-performance Node):
```json
{
  "type": "model-performance",
  "title": "llama3:8b@192.168.1.100:11434",
  "metadata": {
    "modelId": "llama3:8b",
    "serverId": "192.168.1.100:11434",
    "lastBenchmarked": "2025-08-04T17:54:00Z",
    "currentModelVersion": "llama3:8b-q4_0",
    "currentOllamaVersion": "0.1.47",
    "currentModelDigest": "sha256:abc123..."
  },
  "scores": [
    {
      "runCode": "2025-08-04-benchmark-1-abc123",
      "timestamp": "2025-08-04T17:54:00Z",
      "jobType": "cold-performance",
      "versions": {
        "modelVersion": "llama3:8b-q4_0",
        "modelDigest": "sha256:abc123...",
        "ollamaVersion": "0.1.47"
      },
      "coldLatency": 2500,
      "warmLatencies": [450, 420, 430],
      "qualityResults": {
        "creative-writing": { "score": 0.85, "bleuScore": 0.82 },
        "fact-extraction": { "score": 0.92, "rougeScore": 0.89 }
      }
    }
  ]
}
```

---

### 2. Scoring and Quality Analysis
Once benchmarks are executed, the raw results are scored to generate quality metrics.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-result-storage.service.ts`**:
  - Processes raw results to calculate quality metrics.
  - Stores metrics in the `qualityResults` field of `model-performance` nodes.

- **`shared/types/performance.ts`**:
  - Defines the structure for `qualityResults` and other performance-related data.

#### Key Metrics:
- **Quality Metrics**:
  - Calculated for each task type (e.g., `creative-writing`, `fact-extraction`).
  - Includes scores like `bleuScore`, `rougeScore`, and overall `qualityScore`.

---

### 3. Aggregation (RAG)
Aggregates raw benchmark data into higher-level summaries for models and servers.

#### Responsibilities by File:
- **`ai-server/src/services/model-aggregation.service.ts`**:
  - Aggregates `model-performance` data into `ai-model` nodes.
  - Calculates average quality scores, performance profiles, and load balancer weights.

- **`ai-server/src/services/server-aggregation.service.ts`**:
  - Aggregates `model-performance` data into `ai-server` nodes.
  - Calculates server health, performance profiles, and aggregated quality scores.

- **`shared/types/performance.ts`**:
  - Defines the structure for `ai-model` and `ai-server` nodes.

#### Endpoints:
- **Trigger Model Aggregation**:
  - **Endpoint**: `POST /api/aggregation/models`
  - **Description**: Aggregates data for all models.

- **Trigger Server Aggregation**:
  - **Endpoint**: `POST /api/aggregation/servers`
  - **Description**: Aggregates data for all servers.

---

### 4. Gap Filler
Ensures data consistency by filling in missing benchmarks or aggregations.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-gap-analyzer.service.ts`**:
  - Detects missing or outdated benchmarks.
  - Schedules jobs to fill gaps.

- **`ai-server/src/services/aggregation-scheduler.service.ts`**:
  - Periodically triggers model and server aggregations.

#### Behavior:
- Identifies gaps in benchmark data or aggregations.
- Automatically triggers missing benchmarks or re-aggregations.

---

### 5. Frontend Display
Aggregated results are displayed in the frontend for user insights.

#### Responsibilities by File:
- **`ai-server/web/src/components/BenchmarksTab.tsx`**:
  - Fetches and displays benchmark data for models and servers.
  - Displays quality scores, performance metrics, and usage statistics.

- **`ai-server/src/routes/performance-analytics.ts`**:
  - Provides API endpoints for fetching aggregated data.

#### Endpoints:
- **Fetch Model Performance**:
  - **Endpoint**: `GET /api/performance/models`
  - **Description**: Retrieves performance summaries for all models.

- **Fetch Server Performance**:
  - **Endpoint**: `GET /api/performance/servers`
  - **Description**: Retrieves performance summaries for all servers.

- **Fetch Detailed Model Performance**:
  - **Endpoint**: `GET /api/performance/models/:modelId`
  - **Description**: Retrieves detailed performance data for a specific model.

- **Fetch Detailed Server Performance**:
  - **Endpoint**: `GET /api/performance/servers/:serverId`
  - **Description**: Retrieves detailed performance data for a specific server.

---

## Troubleshooting

### Common Issues:
1. **No Benchmark Results**:
   - Ensure benchmarks are queued and executed.
   - Verify raw results are stored in `model-performance` nodes.

2. **Missing Aggregated Data**:
   - Check if aggregation services are running.
   - Trigger manual aggregation via API endpoints.

3. **Frontend Not Displaying Data**:
   - Verify API endpoints are returning data.
   - Check for errors in frontend components.

---

## Summary
This workflow ensures benchmarks are executed, scored, aggregated, and displayed in the frontend. The gap filler plays a critical role in maintaining data consistency, while the aggregation services provide actionable insights for intelligent model and server selection.

---

## Detailed Benchmark Workflow

### 1. Benchmark Execution
Benchmarks are initiated to test the performance of models on specific servers. These benchmarks generate raw performance data.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-job-executor.service.ts`**:
  - Handles the execution of benchmark jobs.
  - Queues jobs for execution and processes them to generate raw results.

- **`ai-server/src/services/benchmark-result-storage.service.ts`**:
  - Stores raw benchmark results in `model-performance` nodes.
  - Ensures only the last 20 results are retained for each model-server combination.

#### Endpoints:
- **Run All Benchmarks**:
  - **Endpoint**: `POST /api/orchestrator/benchmarks/run`
  - **Description**: Triggers all benchmarks for all model-server combinations.

- **Run Individual Benchmark**:
  - **Endpoint**: `POST /api/orchestrator/benchmarks/run/:modelId/:serverId`
  - **Description**: Triggers a benchmark for a specific model-server combination.

---

### 2. Scoring and Quality Analysis
Once benchmarks are executed, the raw results are scored to generate quality metrics.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-result-storage.service.ts`**:
  - Processes raw results to calculate quality metrics.
  - Stores metrics in the `qualityResults` field of `model-performance` nodes.

- **`shared/types/performance.ts`**:
  - Defines the structure for `qualityResults` and other performance-related data.

#### Key Metrics:
- **Quality Metrics**:
  - Calculated for each task type (e.g., `creative-writing`, `fact-extraction`).
  - Includes scores like `bleuScore`, `rougeScore`, and overall `qualityScore`.

---

### 3. Aggregation (RAG)
Aggregates raw benchmark data into higher-level summaries for models and servers.

#### Responsibilities by File:
- **`ai-server/src/services/model-aggregation.service.ts`**:
  - Aggregates `model-performance` data into `ai-model` nodes.
  - Calculates average quality scores, performance profiles, and load balancer weights.

- **`ai-server/src/services/server-aggregation.service.ts`**:
  - Aggregates `model-performance` data into `ai-server` nodes.
  - Calculates server health, performance profiles, and aggregated quality scores.

- **`shared/types/performance.ts`**:
  - Defines the structure for `ai-model` and `ai-server` nodes.

#### Endpoints:
- **Trigger Model Aggregation**:
  - **Endpoint**: `POST /api/aggregation/models`
  - **Description**: Aggregates data for all models.

- **Trigger Server Aggregation**:
  - **Endpoint**: `POST /api/aggregation/servers`
  - **Description**: Aggregates data for all servers.

---

### 4. Gap Filler
Ensures data consistency by filling in missing benchmarks or aggregations.

#### Responsibilities by File:
- **`ai-server/src/services/benchmark-gap-analyzer.service.ts`**:
  - Detects missing or outdated benchmarks.
  - Schedules jobs to fill gaps.

- **`ai-server/src/services/aggregation-scheduler.service.ts`**:
  - Periodically triggers model and server aggregations.

#### Behavior:
- Identifies gaps in benchmark data or aggregations.
- Automatically triggers missing benchmarks or re-aggregations.

---

### 5. Frontend Display
Aggregated results are displayed in the frontend for user insights.

#### Responsibilities by File:
- **`ai-server/web/src/components/BenchmarksTab.tsx`**:
  - Fetches and displays benchmark data for models and servers.
  - Displays quality scores, performance metrics, and usage statistics.

- **`ai-server/src/routes/performance-analytics.ts`**:
  - Provides API endpoints for fetching aggregated data.

#### Endpoints:
- **Fetch Model Performance**:
  - **Endpoint**: `GET /api/performance/models`
  - **Description**: Retrieves performance summaries for all models.

- **Fetch Server Performance**:
  - **Endpoint**: `GET /api/performance/servers`
  - **Description**: Retrieves performance summaries for all servers.

- **Fetch Detailed Model Performance**:
  - **Endpoint**: `GET /api/performance/models/:modelId`
  - **Description**: Retrieves detailed performance data for a specific model.

- **Fetch Detailed Server Performance**:
  - **Endpoint**: `GET /api/performance/servers/:serverId`
  - **Description**: Retrieves detailed performance data for a specific server.

---

## Troubleshooting

### Common Issues:
1. **No Benchmark Results**:
   - Ensure benchmarks are queued and executed.
   - Verify raw results are stored in `model-performance` nodes.

2. **Missing Aggregated Data**:
   - Check if aggregation services are running.
   - Trigger manual aggregation via API endpoints.

3. **Frontend Not Displaying Data**:
   - Verify API endpoints are returning data.
   - Check for errors in frontend components.

---

## Summary
This detailed workflow outlines the responsibilities of each file in the benchmark-to-RAG process. It ensures benchmarks are executed, scored, aggregated, and displayed in the frontend, with the gap filler maintaining data consistency.
