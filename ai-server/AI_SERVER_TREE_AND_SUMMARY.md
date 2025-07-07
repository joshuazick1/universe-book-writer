# ai-server Directory Tree and File Summaries

## Directory Tree

```
ai-server/
├── coverage/
├── data/
├── dist/
├── docs/
├── embedding-test-output.log
├── embedding-test-success.log
├── fix-ollama-calls.ts
├── fix-router-handlers.ts
├── fix-validation-service.ts
├── jest.config.mjs
├── logs/
├── node_modules/
├── OLLAMA_ENDPOINTS_COMPLETION.md
├── OLLAMA_ENDPOINTS_TEST_RESULTS.md
├── package.json
├── QUALITY_BENCHMARKING_IMPLEMENTATION.md
├── README.coverage-gaps.md
├── README.md
├── src/
│   ├── app.ts
│   ├── benchmarkManager.ts
│   ├── compat/
│   ├── config/
│   ├── index.ts
│   ├── logger.ts
│   ├── orchestrator-benchmark-persistence.ts
│   ├── orchestrator-instance.ts
│   ├── orchestrator-persistence.ts
│   ├── orchestrator.ts
│   ├── orchestrator.types.ts
│   ├── orchestrator.utils.ts
│   ├── rag/
│   │   ├── adapters/
│   │   │   ├── factory.ts
│   │   │   ├── index.ts
│   │   │   ├── memory.adapter.ts
│   │   │   └── mongodb.adapter.ts
│   │   ├── core/
│   │   │   ├── node.ts
│   │   │   ├── relationship.ts
│   │   │   └── types.ts
│   │   ├── encryption/
│   │   │   ├── base-encryption.service.ts
│   │   │   ├── rag-encryption.service.ts
│   │   │   ├── rag-update-encryption.service.ts
│   │   │   └── README-update-encryption.md
│   │   ├── index.ts
│   │   ├── instance.ts
│   │   ├── manager.ts
│   │   ├── README.md
│   │   ├── routes/
│   │   │   ├── rag.routes.ts
│   │   │   ├── simple-rag.routes.ts
│   │   │   └── update.routes.ts
│   │   ├── service-adapters.ts
│   │   └── services/
│   │       ├── context-assembly.service.ts
│   │       ├── storage.service.ts
│   │       └── update-storage.service.ts
│   ├── routes/
│   │   ├── benchmarks.ts
│   │   ├── characterChat.ts
│   │   ├── characterMemory.ts
│   │   ├── config.ts
│   │   ├── generate.ts
│   │   ├── generators.ts
│   │   ├── generatorsNew.ts
│   │   ├── health.ts
│   │   ├── modelMap.ts
│   │   ├── models.ts
│   │   ├── ollamaCompat.new.ts
│   │   ├── ollamaCompat.ts
│   │   ├── openaiCompat.ts
│   │   ├── orchestrator.ts
│   │   ├── orchestratorConfig.ts
│   │   ├── performance.ts
│   │   ├── qualityBenchmarks.ts
│   │   ├── servers.ts
│   │   ├── tags.ts
│   │   ├── textToRag.ts
│   ├── server-persistence.ts
│   ├── services/
│   │   ├── aiGeneration/
│   │   ├── aiProcessing/
│   │   ├── benchmarking/
│   │   ├── characterChat/
│   │   ├── characterGenerator/
│   │   ├── database/
│   │   ├── modelPerformanceRAG.service.ts
│   │   ├── textToRagParser/
│   │   └── universeGenerator/
│   ├── socket/
│   │   └── socket-setup.ts
│   └── types/
│       └── generatorTypes.ts
├── test-rag-integration.js
├── test-rag-integration.mjs
├── tests/
├── tsconfig.json
└── web/
```

## File Summaries

### src/app.ts

**Summary:**
Main entry point for the AI server. Sets up the Express app, configures middleware, mounts all API routes (including health, models, generate, config, orchestrator, servers, tags, benchmarks, performance, character chat, and compatibility layers), and initializes subsystems (RAG, Text-to-RAG, Performance RAG, Character Memory, and database connection). Handles error logging and asynchronous initialization of major features.

**Imports:**
- express, cors
- Routers: healthRouter, modelsRouter, generateRouter, configRouter, orchestratorConfigRouter, serversRouter, ollamaCompatRouter, openaiCompatRouter, tagsRouter, benchmarksRouter, orchestratorRouter, modelMapRouter, performanceRouter, generatorRouter, characterChatRouter
- RAG: getRAGServiceManager
- Text-to-RAG: createTextToRAGRoutes, initializeTextToRAGService
- Logger: logError, logInfo, logWarn, logDebug
- Database: sharedDatabaseConnection
- Orchestrator: getOrchestratorInstance

**Exports:**
- default app (Express instance)

---

### src/orchestrator.ts

**Summary:**
Implements the AIOrchestrator class, which manages AI server registration, model aggregation, health checks, request routing, and usage tracking. Handles orchestration logic for model/server selection, benchmarking, and RAG usage tracking. Exports types and the BenchmarkManager for use elsewhere.

**Imports:**
- node-fetch
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- AIOrchestrator (class)
- BenchmarkManager (class)
- AIServer, ServerModelBenchmark (interfaces)

---

### src/rag/manager.ts

**Summary:**
Central manager for the RAG system. Handles initialization, node and relationship CRUD, search, and statistics. Delegates storage to adapters (memory, MongoDB, etc). Provides a unified API for RAG operations.

**Imports:**
- RAGNode, RAGRelationship (types)
- RAGStorageBackend
- StorageAdapterFactory, StorageAdapterConfig
- Logger: logInfo, logError, logDebug

**Exports:**
- RAGServiceManager (class)
- RAGServiceConfig (interface)

---

### src/rag/adapters/factory.ts

**Summary:**
Factory for creating RAG storage adapters. Selects and configures the appropriate adapter (memory, MongoDB, etc) based on configuration.

**Imports:**
- InMemoryRagAdapter
- MongoDBRagAdapter
- Logger: logInfo, logError

**Exports:**
- StorageAdapterFactory (function)
- StorageAdapterConfig (interface)

---

### src/rag/adapters/index.ts

**Summary:**
Barrel file for RAG storage adapters. Re-exports all available adapters and related types for unified import.

**Imports:**
- InMemoryRagAdapter
- MongoDBRagAdapter
- StorageAdapterFactory, StorageAdapterConfig

**Exports:**
- All adapters and types (re-export)

---

### src/rag/adapters/memory.adapter.ts

**Summary:**
In-memory storage adapter for the RAG system. Implements the RAGStorageBackend interface for testing and development. Stores nodes and relationships in JS Maps.

**Imports:**
- RAGNode, RAGRelationship
- EncryptedRAGNode, EncryptedRAGRelationship
- RAGStorageBackend
- Logger: logDebug

**Exports:**
- InMemoryRagAdapter (class)

---

### src/rag/adapters/mongodb.adapter.ts

**Summary:**
MongoDB storage adapter for the RAG system. Implements persistent storage for nodes and relationships, using MongoDB collections. Handles connection, CRUD, and index management.

**Imports:**
- MongoClient, Db, Collection, ObjectId (mongodb)
- RAGNode, RAGRelationship, RAGNodeType, RAGRelationshipType
- RAGStorageBackend
- Logger: logInfo, logError, logDebug

**Exports:**
- MongoDBRagAdapter (class)
- MongoDBStorageConfig (interface)

---

### src/rag/core/node.ts

**Summary:**
Defines the RAGNode class and related types for the RAG knowledge graph. Handles node creation, serialization, and validation.

**Imports:**
- RAGNodeType
- Logger: logInfo, logError

**Exports:**
- RAGNode (class)
- RAGNodeType (enum)

---

### src/rag/core/relationship.ts

**Summary:**
Defines the RAGRelationship class and related types for the RAG knowledge graph. Handles relationship creation, serialization, and validation.

**Imports:**
- RAGRelationshipType
- Logger: logInfo, logError

**Exports:**
- RAGRelationship (class)
- RAGRelationshipType (enum)

---

### src/rag/core/types.ts

**Summary:**
Type definitions for RAG nodes, relationships, and adapters. Used throughout the RAG system for type safety.

**Imports:**
- None (type definitions only)

**Exports:**
- RAGNode, RAGRelationship, RAGNodeType, RAGRelationshipType (types and enums)
- RAGStorageBackend (interface)

---

### src/rag/encryption/base-encryption.service.ts

**Summary:**
Base class for RAG encryption services. Provides common encryption and decryption logic for RAG nodes and relationships.

**Imports:**
- crypto
- Logger: logInfo, logError

**Exports:**
- BaseEncryptionService (class)

---

### src/rag/encryption/rag-encryption.service.ts

**Summary:**
Encryption service for RAG nodes and relationships. Extends the base encryption service with RAG-specific logic.

**Imports:**
- BaseEncryptionService
- Logger: logInfo, logError

**Exports:**
- RAGEncryptionService (class)

---

### src/rag/encryption/rag-update-encryption.service.ts

**Summary:**
Encryption service for RAG update operations. Extends the base encryption service with update-specific logic.

**Imports:**
- BaseEncryptionService
- Logger: logInfo, logError

**Exports:**
- RAGUpdateEncryptionService (class)

---

### src/rag/encryption/README-update-encryption.md

**Summary:**
Documentation for the RAG update encryption service. Describes the encryption approach, usage, and integration points for update operations in the RAG system.

**Imports:**
- N/A (documentation)

**Exports:**
- N/A (documentation)

---

### src/rag/index.ts

**Summary:**
Barrel file for the RAG system. Re-exports all RAG-related classes, services, and types for unified import.

**Imports:**
- All RAG modules

**Exports:**
- All RAG modules (re-export)

---

### src/rag/instance.ts

**Summary:**
Singleton provider for the RAGServiceManager instance. Ensures a single RAG manager is used throughout the application. Handles lazy initialization and dependency injection for the RAG system.

**Imports:**
- RAGServiceManager
- Logger: logInfo, logError

**Exports:**
- getRAGServiceManager (function)

---

### src/rag/manager.ts

**Summary:**
Central manager for the RAG system. Handles initialization, node and relationship CRUD, search, and statistics. Delegates storage to adapters (memory, MongoDB, etc). Provides a unified API for RAG operations.

**Imports:**
- RAGNode, RAGRelationship (types)
- RAGStorageBackend
- StorageAdapterFactory, StorageAdapterConfig
- Logger: logInfo, logError, logDebug

**Exports:**
- RAGServiceManager (class)
- RAGServiceConfig (interface)

---

### src/rag/routes/rag.routes.ts

**Summary:**
Express router for RAG endpoints. Handles CRUD operations for RAG nodes and relationships, search, and statistics. Integrates with the RAG service manager.

**Imports:**
- express.Router
- getRAGServiceManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/rag/routes/simple-rag.routes.ts

**Summary:**
Express router for simplified RAG endpoints. Handles basic CRUD operations for RAG nodes and relationships. Integrates with the RAG service manager.

**Imports:**
- express.Router
- getRAGServiceManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/rag/routes/update.routes.ts

**Summary:**
Express router for RAG update endpoints. Handles update operations for RAG nodes and relationships. Integrates with the RAG update encryption service and RAG service manager.

**Imports:**
- express.Router
- getRAGServiceManager
- RAGUpdateEncryptionService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/services/modelPerformanceRAG.service.ts

**Summary:**
Service for integrating model/server benchmark data into the RAG knowledge graph. Handles syncing of model/server/performance nodes and relationships, and provides methods for usage tallying and analytics. Used by the orchestrator for RAG-based analytics and statistics.

**Imports:**
- RAGServiceManager, getRAGServiceManager
- BenchmarkManager
- AIOrchestrator
- Logger: logInfo, logError
- RAG types: RAGNode, RAGRelationship, RAGNodeType, RAGRelationshipType
- ServerModelBenchmark

**Exports:**
- ModelPerformanceRAGService (class)
- getModelPerformanceRAGService, shutdownModelPerformanceRAGService (functions)

---

### src/rag/manager.ts

**Summary:**
Central manager for the RAG system. Handles initialization, node and relationship CRUD, search, and statistics. Delegates storage to adapters (memory, MongoDB, etc). Provides a unified API for RAG operations.

**Imports:**
- RAGNode, RAGRelationship (types)
- RAGStorageBackend
- StorageAdapterFactory, StorageAdapterConfig
- Logger: logInfo, logError, logDebug

**Exports:**
- RAGServiceManager (class)
- RAGServiceConfig (interface)

---

### src/rag/adapters/memory.adapter.ts

**Summary:**
In-memory storage adapter for the RAG system. Implements the RAGStorageBackend interface for testing and development. Stores nodes and relationships in JS Maps.

**Imports:**
- RAGNode, RAGRelationship
- EncryptedRAGNode, EncryptedRAGRelationship
- RAGStorageBackend
- Logger: logDebug

**Exports:**
- InMemoryRagAdapter (class)

---

### src/rag/adapters/mongodb.adapter.ts

**Summary:**
MongoDB storage adapter for the RAG system. Implements persistent storage for nodes and relationships, using MongoDB collections. Handles connection, CRUD, and index management.

**Imports:**
- MongoClient, Db, Collection, ObjectId (mongodb)
- RAGNode, RAGRelationship, RAGNodeType, RAGRelationshipType
- RAGStorageBackend
- Logger: logInfo, logError, logDebug

**Exports:**
- MongoDBRagAdapter (class)
- MongoDBStorageConfig (interface)

---

### src/routes/generate.ts

**Summary:**
Express router for the /api/generate endpoint. Handles POST requests to generate model outputs, selects a healthy server, and triggers usage tracking via the orchestrator. Includes targeted logging for endpoint hits and errors.

**Imports:**
- getOrchestratorInstance
- express.Router
- node-fetch
- Logger: logDebug, logError, logInfo (dynamic import)

**Exports:**
- default router (Express Router)

---
### src/routes/orchestrator.ts

**Summary:**
Express router for orchestrator-related API endpoints. Handles model/server management (add, remove, upload, list versions), and usage statistics. Delegates logic to the orchestrator instance.

**Imports:**
- express.Router
- getOrchestratorInstance

**Exports:**
- default router (Express Router)

---

### src/routes/performance.ts

**Summary:**
Express router for performance-related endpoints. Handles requests for model/server performance metrics, statistics, and benchmarking data. Delegates logic to the orchestrator and benchmarking services.

**Imports:**
- express.Router
- getOrchestratorInstance
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/qualityBenchmarks.ts

**Summary:**
Express router for quality benchmarking endpoints. Handles requests for running, retrieving, and managing quality benchmarks for models and servers. Integrates with the orchestrator and benchmarking subsystems.

**Imports:**
- express.Router
- getOrchestratorInstance
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/servers.ts

**Summary:**
Express router for server management endpoints. Handles adding, removing, listing, and updating AI servers. Delegates server management logic to the orchestrator instance.

**Imports:**
- express.Router
- getOrchestratorInstance

**Exports:**
- default router (Express Router)

---

### src/routes/tags.ts

**Summary:**
Express router for tag management endpoints. Handles CRUD operations for tags associated with models, servers, or other entities. Delegates logic to the orchestrator or tag management service.

**Imports:**
- express.Router
- getOrchestratorInstance

**Exports:**
- default router (Express Router)

---

### src/routes/textToRag.ts

**Summary:**
Express router for Text-to-RAG endpoints. Handles requests for converting text into RAG nodes, managing text-to-RAG operations, and integrating with the RAG service manager.

**Imports:**
- express.Router
- createTextToRAGRoutes
- getRAGServiceManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/benchmarks.ts

**Summary:**
Express router for benchmark-related endpoints. Handles requests for running, retrieving, and managing model and server benchmarks. Integrates with the orchestrator and benchmarking subsystems.

**Imports:**
- express.Router
- getOrchestratorInstance
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/characterChat.ts

**Summary:**
Express router for character chat endpoints. Handles chat interactions with character models, session management, and chat history. Integrates with the orchestrator and character chat services.

**Imports:**
- express.Router
- getOrchestratorInstance
- CharacterChatService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/characterMemory.ts

**Summary:**
Express router for character memory endpoints. Handles requests for storing, retrieving, and managing character memory data. Integrates with the orchestrator and character memory services.

**Imports:**
- express.Router
- getOrchestratorInstance
- CharacterMemoryService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/config.ts

**Summary:**
Express router for configuration endpoints. Handles requests for retrieving and updating server and model configuration settings. Delegates logic to the orchestrator and configuration services.

**Imports:**
- express.Router
- getOrchestratorInstance
- ConfigService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/generators.ts

**Summary:**
Express router for legacy generator endpoints. Handles requests for generating model outputs using legacy generator logic. Delegates logic to the orchestrator and generator services.

**Imports:**
- express.Router
- getOrchestratorInstance
- GeneratorService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/generatorsNew.ts

**Summary:**
Express router for new generator endpoints. Handles requests for generating model outputs using the new generator logic. Delegates logic to the orchestrator and generator services.

**Imports:**
- express.Router
- getOrchestratorInstance
- GeneratorService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/health.ts

**Summary:**
Express router for health check endpoints. Handles requests for server and subsystem health status. Delegates logic to the orchestrator and health check services.

**Imports:**
- express.Router
- getOrchestratorInstance
- HealthService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/modelMap.ts

**Summary:**
Express router for model map endpoints. Handles requests for retrieving and managing the mapping of models to servers. Delegates logic to the orchestrator and model map services.

**Imports:**
- express.Router
- getOrchestratorInstance
- ModelMapService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/models.ts

**Summary:**
Express router for model management endpoints. Handles requests for adding, removing, listing, and updating models. Delegates logic to the orchestrator and model management services.

**Imports:**
- express.Router
- getOrchestratorInstance
- ModelService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/ollamaCompat.new.ts

**Summary:**
Express router for the new Ollama compatibility endpoints. Handles requests for model inference, server management, and compatibility with Ollama's API. Integrates with the orchestrator and compatibility services.

**Imports:**
- express.Router
- getOrchestratorInstance
- OllamaCompatService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/ollamaCompat.ts

**Summary:**
Express router for legacy Ollama compatibility endpoints. Handles requests for model inference and server management compatible with older Ollama API versions. Integrates with the orchestrator and compatibility services.

**Imports:**
- express.Router
- getOrchestratorInstance
- OllamaCompatService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/routes/openaiCompat.ts

**Summary:**
Express router for OpenAI compatibility endpoints. Handles requests for model inference and server management compatible with OpenAI's API. Integrates with the orchestrator and compatibility services.

**Imports:**
- express.Router
- getOrchestratorInstance
- OpenAICompatService
- Logger: logInfo, logError

**Exports:**
- default router (Express Router)

---

### src/index.ts

**Summary:**
Entry point for the AI server module. Exports the main Express app and orchestrator instance for use by the server runner or integration tests.

**Imports:**
- app (from ./app)
- getOrchestratorInstance (from ./orchestrator-instance)

**Exports:**
- app (Express instance)
- getOrchestratorInstance (function)

---

### src/orchestrator-instance.ts

**Summary:**
Singleton provider for the AIOrchestrator instance. Ensures a single orchestrator is used throughout the application. Handles lazy initialization and dependency injection for the orchestrator.

**Imports:**
- AIOrchestrator (from ./orchestrator)
- BenchmarkManager (from ./benchmarkManager)
- Logger: logInfo, logError

**Exports:**
- getOrchestratorInstance (function)

---

### src/orchestrator-benchmark-persistence.ts

**Summary:**
Persistence layer for orchestrator benchmark data. Handles saving, loading, and updating benchmark results for models and servers. Integrates with the orchestrator and benchmarking subsystems.

**Imports:**
- fs, path
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- OrchestratorBenchmarkPersistence (class)

---

### src/orchestrator-persistence.ts

**Summary:**
Persistence layer for orchestrator state. Handles saving, loading, and updating orchestrator configuration and state data. Integrates with the orchestrator and configuration subsystems.

**Imports:**
- fs, path
- Logger: logInfo, logError

**Exports:**
- OrchestratorPersistence (class)

---

### src/orchestrator.types.ts

**Summary:**
Type definitions for orchestrator-related entities, including AI server, model, benchmark, and configuration types. Used throughout the orchestrator and related modules for type safety.

**Imports:**
- None (type definitions only)

**Exports:**
- AIServer (interface)
- ServerModelBenchmark (interface)
- OrchestratorConfig (interface)
- Other orchestrator-related types and enums

---

### src/benchmarkManager.ts

**Summary:**
Manages benchmarking of AI models and servers. Provides methods to run, store, and retrieve benchmark results, and integrates with orchestrator and persistence layers.

**Imports:**
- fs, path
- Logger: logInfo, logError

**Exports:**
- BenchmarkManager (class)

---

### src/server-persistence.ts

**Summary:**
Persistence layer for server state and configuration. Handles saving, loading, and updating server data, including model and server registration.

**Imports:**
- fs, path
- Logger: logInfo, logError

**Exports:**
- ServerPersistence (class)

---

### src/services/modelPerformanceRAG.service.ts

**Summary:**
Service for integrating model/server benchmark data into the RAG knowledge graph. Handles syncing of model/server/performance nodes and relationships, and provides methods for usage tallying and analytics. Used by the orchestrator for RAG-based analytics and statistics.

**Imports:**
- RAGServiceManager, getRAGServiceManager
- BenchmarkManager
- AIOrchestrator
- Logger: logInfo, logError
- RAG types: RAGNode, RAGRelationship, RAGNodeType, RAGRelationshipType
- ServerModelBenchmark

**Exports:**
- ModelPerformanceRAGService (class)
- getModelPerformanceRAGService, shutdownModelPerformanceRAGService (functions)

---

### src/services/aiGeneration/*

**Summary:**
Contains services for AI text, image, and content generation. Provides interfaces and implementations for generating content using various models and adapters.

**Imports:**
- Model adapters
- Logger: logInfo, logError

**Exports:**
- AI generation service classes and interfaces

---

### src/services/aiProcessing/*

**Summary:**
Contains services for AI output post-processing, filtering, and validation. Used to refine and validate generated content before returning to the user or storing in the system.

**Imports:**
- Post-processing utilities
- Logger: logInfo, logError

**Exports:**
- AI processing service classes and interfaces

---

### src/services/benchmarking/*

**Summary:**
Contains services for benchmarking AI models and servers. Provides logic for running, aggregating, and reporting benchmark results.

**Imports:**
- BenchmarkManager
- Logger: logInfo, logError

**Exports:**
- Benchmarking service classes and interfaces

---

### src/services/characterChat/*

**Summary:**
Contains services for character chat functionality, including session management, chat history, and character persona logic.

**Imports:**
- Character models
- Logger: logInfo, logError

**Exports:**
- Character chat service classes and interfaces

---

### src/services/characterGenerator/*

**Summary:**
Contains services for character generation, including name, background, and persona creation. Used for generating new characters in the book series.

**Imports:**
- Character generation utilities
- Logger: logInfo, logError

**Exports:**
- Character generator service classes and interfaces

---

### src/services/database/*

**Summary:**
Contains database service adapters and utilities for interacting with MongoDB and other storage backends. Handles data persistence, retrieval, and schema management.

**Imports:**
- MongoDB client
- Logger: logInfo, logError

**Exports:**
- Database service classes and interfaces

---

### src/services/textToRagParser/*

**Summary:**
Contains services and utilities for parsing text into RAG nodes and relationships. Used for converting book content and notes into structured knowledge graphs.

**Imports:**
- Text parsing utilities
- Logger: logInfo, logError

**Exports:**
- Text-to-RAG parser service classes and interfaces

---

### src/services/universeGenerator/*

**Summary:**
Contains services for generating fictional universes, including world-building, lore, and setting creation. Provides tools for procedural generation and customization.

**Imports:**
- Universe generation utilities
- Logger: logInfo, logError

**Exports:**
- Universe generator service classes and interfaces

---

### src/socket/socket-setup.ts

**Summary:**
Sets up and configures socket.io for real-time collaboration and communication. Handles socket events, user sessions, and message broadcasting.

**Imports:**
- socket.io
- Logger: logInfo, logError

**Exports:**
- setupSocket (function)

---

### src/compat/*

**Summary:**
Contains compatibility layers and adapters for integrating with external APIs and legacy systems (e.g., OpenAI, Ollama). Provides request/response translation and protocol bridging.

**Imports:**
- External API clients
- Logger: logInfo, logError

**Exports:**
- Compatibility adapter classes and functions

---

### coverage/

**Summary:**
Contains code coverage reports generated by test runs. Used for tracking test coverage and identifying untested code paths.

**Imports:**
- N/A (generated data)

**Exports:**
- N/A (generated data)

---

### data/

**Summary:**
Contains persistent data files, such as serialized model states, universe data, or user-uploaded content. Used for storing non-code assets required by the AI server.

**Imports:**
- N/A (data files)

**Exports:**
- N/A (data files)

---

### dist/

**Summary:**
Contains compiled output and build artifacts for the AI server. Used for deployment and production runs.

**Imports:**
- N/A (build output)

**Exports:**
- N/A (build output)

---

### docs/

**Summary:**
Contains project documentation, architecture plans, and design notes. Used for onboarding, reference, and architectural decision tracking.

**Imports:**
- N/A (documentation)

**Exports:**
- N/A (documentation)

---

### logs/

**Summary:**
Contains log files generated by the AI server and test runs. Used for debugging, monitoring, and auditing system activity.

**Imports:**
- N/A (log files)

**Exports:**
- N/A (log files)

---

### tests/

**Summary:**
Contains unit, integration, and end-to-end tests for the AI server. Used for validating functionality, regression testing, and coverage analysis.

**Imports:**
- Test utilities
- Application modules under test

**Exports:**
- Test suites and test utilities

---

### web/

**Summary:**
Contains static web assets, frontend build output, or web server configuration for the AI server. Used for serving frontend resources or static files.

**Imports:**
- N/A (static assets)

**Exports:**
- N/A (static assets)

---
---

