# Copilot Instructions for Universe Book Writer (VerseForge)

## Project Overview

- **Monorepo** for a multi-universe book writing assistant: backend (Node.js/Express), frontend (React/Vite), AI server (Ollama), collaboration server, plugins, and shared utilities.
- **Plugin-first**: All universe-specific logic is implemented as plugins. Core system remains agnostic.
- **Layered backend**: Follows strict Clean Architecture (`backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`): Core → Application → Infrastructure → API.
- **Shared code**: All cross-cutting logic (node creation, types, logging, encryption, validation, etc.) is centralized in `shared/` and imported by all packages.

## Key Patterns & Conventions

- **Strict TypeScript**: Use interfaces, readonly, and strict typing everywhere. No `any` unless unavoidable.
- **ES Modules only**: All code uses `import`/`export`.
- **Barrel files**: Each directory (especially in `shared/`) should have an `index.ts` for exports.
- **File size**: Backend files <200 lines, frontend <500 lines. Decompose logic aggressively.
- **Testing**: All logic must be unit tested. Use the enhanced TypeScript runner (`scripts/run-tests-with-output.ts`) for all test execution. See below for commands.
- **Documentation**: Every module and shared utility must have JSDoc and a local README with usage and edge cases.
- **No duplication**: All shared logic (node services, types, helpers) must exist in `shared/` and be imported everywhere. Remove old copies after migration.
- **Plugin SDK**: All plugin development must follow the SDK in `packages/plugin-sdk/`.

## Developer Workflows

- **Build/Dev**: Use `npm run dev` (all services), or `npm run dev:backend`, `npm run dev:frontend`, etc.
- **Testing**: Use `npm test` for all tests, or `npm run test:backend`, `npm run test:frontend`, etc. For targeted runs:
  - `npx tsx scripts/run-tests-with-output.ts --pattern "auth" --comment "Testing auth"`
  - `npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button" --coverage`
  - All test logs and summaries are in `test-results/` (rotated, per-suite, with metadata).
- **CI/CD**: All merges require passing tests and >80% coverage. CI runs must use `--ci` or `--json` for machine-readable output.
- **PowerShell**: Use `;` to chain commands. See `docs/POWERSHELL_GUIDE.md` for Windows-specific tips.

## Architecture & Data Flow

- **Node creation**: Use `ensureNode` from `shared/node/nodeService.ts` everywhere. Example:
  ```ts
  import { ensureNode } from 'shared/node/nodeService';
  const universeNode = await ensureNode({ type: 'universe', title: universeId, metadata: { universeId } });
  ```
- **Types**: All shared types/interfaces are in `shared/types/`. Never redefine in backend, ai-server, or plugins.
- **Logging, encryption, validation, deduplication**: Always import from `shared/` (see `shared/README.md` for structure).
- **API**: REST endpoints are versioned and documented in OpenAPI. See `backend/docs/API_DOCUMENTATION.md`.
- **Collaboration**: Real-time sync via WebSocket (`collaboration-server/`).
- **AI**: All AI orchestration and prompt logic is in `ai-server/`, with shared types in `shared/`.

## Examples & References

- **Directory structure**: See `MODULAR_DIRECTORY_STRUCTURE.md` and `shared/README.md` for canonical layouts.
- **Backend layering**: See `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`.
- **Plugin development**: See `packages/plugin-sdk/README.md` and `plugins/` for real-world examples.
- **Test runner**: See `scripts/run-tests-with-output.ts` for advanced test/CI features.

## Special Notes

- **All migrations**: When moving code to `shared/`, update all imports, remove old files, and update `tsconfig.json` includes.
- **Architectural decisions**: All major changes must be logged in `docs/DECISION_LOG.md`.
- **Documentation**: Update module and root READMEs, and architectural diagrams, after any structural change.

---

For more, see: `README.md`, `shared/README.md`, `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`, `MODULAR_DIRECTORY_STRUCTURE.md`, and `docs/DECISION_LOG.md`.

  - Employ **functional components** with hooks; avoid class components.
  - Use `PascalCase` for component names and filenames to maintain consistency.
  - Ensure components are **pure and reusable**, adhering to the Single Responsibility Principle.

- **Styling**:
  - Implement **Tailwind CSS** for styling to maintain a consistent design system.
  - Avoid inline styles; instead, use utility classes provided by Tailwind.
  - Ensure all UI components are **accessible**, following WCAG guidelines.

### File Size and Organization

- **Backend**:

  - Maintain files under **200 lines** to promote readability and maintainability.
  - Adhere to the structure outlined in `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md`.
  - Implement a **layered architecture**: Core → API → Application → Infrastructure.

- **Frontend**:

  - Keep files under **500 lines**.
  - Decompose complex components into smaller, focused components or hooks.
  - Organize code into directories by feature or domain to enhance modularity.

- **General**:
  - Utilize **barrel files** (`index.ts`) for aggregating and re-exporting modules within a directory.
  - Avoid deep nesting of files and directories to prevent path complexity.

### Documentation and Progress

- **Code Documentation**:

  - Provide **JSDoc comments** for all functions, classes, and interfaces to facilitate understanding.
  - Include examples and edge cases in comments where applicable.
  - Every module MUST have its own README.md with usage instructions and examples.

- **Project Structure**:

  - Strictly adhere to the structure defined in `MODULAR_DIRECTORY_STRUCTURE.md`.
  - Document any deviations or extensions to the structure in `docs/DECISION_LOG.md`.
  - Update directory trees in documentation when adding new modules.

- **Project Tracking**:

  - Update `docs/PROGRESS.md` upon completing tasks listed in `PROJECT_CHECKLIST.md`.
  - Review and update all affected documentation files when making significant changes.

- **API Documentation**:

  - Document all endpoints using **Swagger/OpenAPI** standards.
  - Ensure API documentation is versioned and updated alongside code changes.
  - Include request/response examples for each endpoint.

- **AI System Documentation**:

  - Document model configurations in `ai-server/models/*/README.md`.
  - Maintain prompt templates with examples in `ai-server/prompts/templates/`.
  - Document model interactions and dependencies in the orchestration layer.
  - Keep load balancing and scaling configurations documented.

- **Plugin Documentation**:

  - Maintain comprehensive documentation for the plugin SDK.
  - Document theme customization capabilities for each plugin.
  - Include example implementations for common plugin scenarios.
  - Document any universe-specific validations and rules.

- **Architectural Decisions**:
  - Record significant architectural decisions in `docs/DECISION_LOG.md`, detailing the context, decision, and rationale.
  - Update all related documentation when implementing architectural changes.
  - Cross-reference related decisions to maintain documentation coherence.

### Backend Architecture Guidelines

- **Mandatory Compliance**:

  - Follow the structure defined in `backend/CLEAN_BACKEND_ARCHITECTURE_PLAN.md` without deviations.

- **Zero Duplication Policy**:

  - Ensure each function or module has a **single, definitive implementation**.

- **Plugin-First Architecture**:

  - Encapsulate all universe-specific logic (e.g., Star Trek, Star Wars) within **plugins** to maintain core system agnosticism.

- **Layered Structure**:

  - Implement a clear separation of concerns:
    - **Core Layer**: Business logic and domain models.
    - **API Layer**: Express routes and controllers.
    - **Application Layer**: Use cases and application services.
    - **Infrastructure Layer**: Database interactions, external services, etc.

- **Architecture Plan Updates**:
  - When creating new modules or refactoring:
    - Document new file paths and their purposes.
    - Detail how they integrate into the existing architecture.
    - Specify dependencies and interfaces.

### Enhanced Test Runner Guidelines

- **TypeScript Test Runner**:

  - Located at `scripts/run-tests-with-output.ts` - a fully TypeScript-powered test execution system
  - Uses `tsx` for direct TypeScript execution without compilation step
  - Provides organized output management with separate files per test suite
  - Implements automatic log rotation to prevent disk space accumulation

- **Output Management Features**:

  - **Separate files per test suite**: Each Jest test file gets its own `.log` file
  - **Timestamped directories**: Test runs organized in `test-results/run_YYYY-MM-DDTHH-MM-SS/`
  - **ANSI stripping**: Clean, readable log files without terminal escape codes
  - **Log rotation**: Automatically keeps only the 10 most recent test runs
  - **Descriptive filenames**: Path-based naming makes finding specific test outputs easy

- **Real-time Feedback**:

  - Live progress indicators: ✅ for passed, ❌ for failed, ⏭️ for skipped tests
  - Accurate test result counting with Jest summary parsing
  - Console displays important test suite results immediately
  - Final summary shows precise counts matching Jest output

- **Flexible Test Execution**:

  - Target specific projects: `backend`, `frontend`, `ai-server`, `collaboration-server`, `packages`, `e2e`
  - Pattern matching: `--pattern "auth"` runs only tests matching the pattern
  - Issue tracking: `--comment "Bug fix description"` adds context to test runs
  - Coverage reports: `--coverage` generates and organizes coverage data
  - Watch mode: `--watch` for continuous testing during development

- **CI-Friendly Output**:

  - Always include a `summary.json` file for every test run. This file must be written to the test results directory, regardless of flags.
  - Use `--ci` or `--json` flags when running tests in CI/CD pipelines, or when you want machine-readable output for further automation or reporting.
  - If either flag is present, the runner must print the full JSON summary (from `summary.json`) to stdout, wrapped between `CI_SUMMARY_JSON_START` and `CI_SUMMARY_JSON_END` markers.
  - The `--ci` flag is intended for automated environments (CI/CD, build servers, etc.).
  - The `--json` flag is for local or scripted runs where a JSON summary is desired in the output.
  - Both flags can be used together; their effect is the same.

- **Output Rules**:

  - The JSON summary must include:
    - Timestamp, target, patterns, comment, duration, exit code, test results (passed/failed/skipped/total), log file paths, and coverage file path if present.
    - For each suite, include status, duration, log file, and failed test names if any.
  - The summary must be valid JSON and suitable for parsing by CI tools or scripts.
  - The summary must always be written to disk, even if the flags are not present.
  - When the flags are present, the summary must be printed to stdout as a single block, for easy extraction by CI systems.

- **Usage Examples**:

  ```bash
  # Run all tests with enhanced output
  npm test

  # Run specific project tests
  npm run test:backend
  npm run test:frontend

  # Run pattern-matched tests with comments
  npx tsx scripts/run-tests-with-output.ts --pattern "auth" --comment "Testing auth system"

  # Run specific project with pattern and coverage
  npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button" --coverage --comment "UI testing"

  # CI run, machine-readable output
  npx tsx scripts/run-tests-with-output.ts --ci

  # Local run, but want JSON summary in output
  npx tsx scripts/run-tests-with-output.ts --json backend

  # NPM script with CI output
  yarn test --ci
  ```

### Environment Notes

- **PowerShell Usage**:
  - To enable script execution temporarily:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    ```
  - Use semicolons (`;`) instead of `&&` to chain commands in PowerShell.
  - Refer to `docs/POWERSHELL_GUIDE.md` for additional PowerShell command patterns and best practices.

### Development Server

- **Checking Server Status**:

  - **Frontend**:
    - Look for the following terminal output:
      ```
      VITE v6.x.x ready
      Local: http://localhost:5173/
      ```
    - Alternatively, use PowerShell:
      ```powershell
      Invoke-WebRequest -Uri http://localhost:5173/ -Method HEAD -UseBasicParsing
      ```
  - **Backend**:
    - Once implemented, check:
      ```powershell
      Invoke-WebRequest -Uri http://localhost:5000/api/health -Method HEAD -UseBasicParsing
      ```
    - A successful response will return status code 200.

- **Starting the Development Server**:

  - **PowerShell**:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    Set-Location -Path frontend
    npm run dev
    ```
  - **VS Code Task**:
    - Navigate to: `View` → `Command Palette` → "Tasks: Run Task" → "Start Dev Server"

- **Access Points**:
  - **Frontend**: [http://localhost:5173/](http://localhost:5173/)
  - **Backend**: [http://localhost:5000/](http://localhost:5000/) (upon implementation)

### Additional Best Practices

- **Version Control**:

  - Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
  - Regularly merge feature branches to avoid long-running branches and potential merge conflicts.

- **Security**:

  - Regularly update dependencies to mitigate vulnerabilities.
  - Implement environment-specific configurations to safeguard sensitive information.

- **Testing**:

  - Write unit tests for all functions and components.
  - Achieve and maintain a test coverage of at least 80%.
  - Utilize testing libraries consistent with the project’s tech stack (e.g., Jest for React).

- **Continuous Integration/Continuous Deployment (CI/CD)**:
  - Ensure all tests pass before merging to the main branch.
  - Automate deployments to staging environments for testing before production releases.

By adhering to these guidelines, we aim to maintain a high standard of code quality, ensure consistency
