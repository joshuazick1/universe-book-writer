# Architectural Decision Log

This document maintains a record of architectural decisions made during the development of the Multi-Universe Book Series Writing Assistant.

## Decision Record Template

### ADR-[NUMBER]: [TITLE]

- **Date:** [YYYY-MM-DD]
- **Status:** [Proposed | Accepted | Deprecated | Superseded]
- **Context:** [What is the issue that we're seeing that is motivating this decision or change?]
- **Decision:** [What is the change that we're proposing and/or doing?]
- **Consequences:** [What becomes easier or more difficult to do because of this change?]

## Decisions

### ADR-001: Monorepo Structure

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Need to manage multiple interconnected packages
  - Shared code between frontend and backend
  - Plugin system requirements
  - Development workflow efficiency
- **Decision:**
  - Implement a monorepo structure using npm workspaces
  - Maintain shared code in packages/core
  - Separate frontend, backend, and AI server
- **Consequences:**
  - Easier dependency management
  - Simplified version control
  - Better code sharing
  - More complex build process
  - Larger repository size

### ADR-002: Plugin-First Architecture

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Need to support multiple fictional universes
  - Each universe has unique requirements
  - Must maintain core system flexibility
- **Decision:**
  - Implement plugin system as core architecture
  - Universe-specific features as plugins
  - Standardized plugin interface
- **Consequences:**
  - High flexibility
  - Easy to add new universes
  - More complex core system
  - Additional testing requirements

### ADR-003: AI Orchestration System

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Multiple AI models needed
  - Complex task routing requirements
  - Performance and scaling concerns
- **Decision:**
  - Implement task router model
  - Use specialized models for specific tasks
  - Dynamic server configuration
- **Consequences:**
  - Better AI performance
  - More complex infrastructure
  - Higher resource requirements
  - Better task specialization

### ADR-004: Master Barrel File Pattern

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Need to prevent duplicate function definitions
  - Need to maintain consistent imports across packages
  - Need to simplify cross-package dependencies
- **Decision:**
  - Implement master barrel files in core package
  - Use path aliases for consistent imports
  - Structure exports by domain
- **Consequences:**
  - Cleaner import statements
  - Single source of truth for shared code
  - Better TypeScript type checking
  - May increase initial build time slightly
  - Requires careful management of circular dependencies

### ADR-005: Database Mocking Strategy

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Need reliable and maintainable database mocking for tests
  - Two different databases to mock: MongoDB and Redis
  - Need to support both unit and integration tests
- **Decision:**
  - Use jest.mock for MongoDB to create lightweight unit test mocks
  - Use ioredis-mock for Redis with custom configuration to prevent timeouts
  - Implement mocks at the client level rather than the server level
  - Create reusable mock factories for common database operations
  - Configure proper cleanup and error handling in test lifecycle
- **Consequences:**
  - Faster and more reliable test execution
  - Consistent mocking approach across the codebase
  - Easy to maintain and extend mock implementations
  - Better handling of edge cases and timeouts
  - More reliable test cleanup prevents resource leaks
  - Improved error reporting for database-related issues

### ADR-006: ESLint Binary File Parsing Issue Workaround

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:** ESLint reports "Parsing error: File appears to be binary" for TypeScript files in the core package, despite multiple attempts to fix file encodings and ESLint configuration.

- **Decision:**

  - Created `.eslintignore` file to temporarily exclude affected files:
    - packages/core/src/constants/index.ts
    - packages/core/src/domains/ai/index.ts
    - packages/core/src/domains/plugin/index.ts
    - packages/core/src/domains/story/index.ts
    - packages/core/src/domains/universe/index.ts
    - packages/core/src/shared/index.ts
  - Added `.editorconfig` to enforce consistent file encodings going forward
  - Documented attempted solutions:
    - Updating TypeScript to compatible version (5.3.3)
    - Modifying ESLint configuration
    - Converting file encodings
    - Normalizing line endings

- **Consequences:**
  - Development can continue without blocking ESLint checks
  - Technical debt: need to properly fix file encoding issues
  - New files should use correct encoding due to .editorconfig
  - May need to recreate affected files from scratch in the future
  - Will need to track ESLint and TypeScript-ESLint issues for potential fixes

### ADR-007: TypeScript File Encoding Standardization

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - ESLint was detecting TypeScript files as binary
  - Files were saved with UTF-16LE encoding and BOM markers
  - Inconsistent line endings causing linting issues
  - Need consistent file encoding across the project
- **Decision:**
  - Standardize on UTF-8 encoding without BOM for all TypeScript files
  - Use LF line endings consistently
  - Add `.editorconfig` to enforce encoding standards
  - Update ESLint and Prettier configuration to handle line endings
- **Consequences:**
  - Consistent file handling across tools
  - Resolved ESLint binary file detection issues
  - Better cross-platform compatibility
  - May require occasional manual file conversion for new contributors
  - Clear standard for future file creation

### ADR-002: AI Configuration Management

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:** Need to determine how to manage Ollama server configuration and AI model settings. Options considered were environment variables vs. application settings UI.
- **Decision:** AI-related configuration (Ollama URLs, model settings, etc.) will be managed through the application settings UI and stored in the database, rather than using environment variables.
- **Consequences:**
  - **Positive:**
    - Users can modify AI settings without needing to edit configuration files
    - Settings can be changed without application restart
    - Better user experience for non-technical users
    - Settings can be synced across installations if needed
  - **Negative:**
    - Slightly more complex implementation required
    - Need to handle default settings on first run
    - Must ensure settings UI is available before AI features can be used

### ADR-006: Database Migration Strategy

- **Date:** 2025-06-06
- **Status:** Accepted
- **Context:**
  - Need a reliable way to manage database schema changes
  - Must support TypeScript for type safety
  - Need to handle both forward and rollback migrations
  - Must work with MongoDB schema validation
  - Need to integrate with testing infrastructure
- **Decision:**
  - Use migrate-mongo as the migration framework
  - Store migrations in TypeScript files under src/migrations
  - Implement schema validation in migrations
  - Create collection indexes in migrations
  - Add npm scripts for migration management
  - Store migration history in changelog collection
- **Consequences:**
  - Benefits:
    - Type-safe migrations with TypeScript support
    - Consistent schema validation across environments
    - Easy rollback capability
    - Clear migration history tracking
    - Simple CLI commands for migration management
  - Trade-offs:
    - Additional development overhead for migration files
    - Need to maintain schema validation in both migrations and application code
    - Must ensure migrations are tested before deployment
