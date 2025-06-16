# GitHub Copilot Custom Instructions

This project is a **Multi-Universe Book Series Writing Assistant**, designed to help writers craft series of books set in various fictional universes.

T- **Testing**:

- Write unit tests for all functions and components.
- Achieve and maintain a test coverage of at least 80%.
- Utilize testing libraries consistent with the project's tech stack (e.g., Jest for React).
- Use the enhanced TypeScript test runner with organized output management:
  - `npm test` - Run all tests with enhanced output
  - `npm run test:backend` - Backend tests with file logging
  - `npm run test:frontend` - Frontend tests with file logging
  - `npm run test:coverage` - Coverage reports with enhanced output
  - `npm run test:ai-server` - AI server tests with file logging
  - `npm run test:collaboration-server` - Collaboration server tests with file logging
  - `npm run test:packages` - Package tests with file logging
- Add issue tracking comments when testing specific bugs or features:
  - `npx tsx scripts/run-tests-with-output.ts --comment "Fixing auth bug" backend`
  - `npx tsx scripts/run-tests-with-output.ts -c "Testing new feature" frontend`
- Use pattern matching to run specific test categories:
  - `npx tsx scripts/run-tests-with-output.ts --pattern "auth" --comment "Testing auth system"`
  - `npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button" -c "UI component tests"`
- Enhanced test runner features:

  - Console shows real-time ✅ checkmarks, ❌ for failures, ⏭️ for skipped tests
  - Each test suite gets its own dedicated log file in timestamped directories under `test-results/`
  - ANSI codes stripped from saved output for clean, readable logs
  - Automatic log rotation (keeps last 10 test runs) to prevent disk space accumulation
  - Accurate test result counting with Jest summary parsing
  - File headers include execution metadata, issue comments, and debugging context
  - Complete Jest output preserved alongside suite-specific files
  - TypeScript-powered with full type safety and ES module compatibilityplication provides a framework for world-building and storytelling, with franchise-specific features implemented through plugins (such as Star Trek, Star Wars, or custom universes). The application provides tools for:

- **World-Building**: Comprehensive creation of locations, vessels, factions, lore, etc., adaptable to any fictional universe through plugins.
- **Character Development**: Tools for developing and managing characters across multiple books.
- **Consistency Maintenance**: Ensuring continuity and coherence throughout the series.
- **AI-Assisted Writing**: Utilizing Ollama for intelligent writing assistance.
- **Visual Planning**: Timelines, relationship maps, and other planning tools.
- **Real-Time Collaboration**: Features enabling multiple users to work together seamlessly.

The project adopts a **monorepo structure** comprising:

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express
- **AI Server**: Ollama
- **Collaboration Server**: Real-time collaboration functionalities
- **Database**: MongoDB for data storage

## Development Guidelines

### Code Style

- **TypeScript Practices**:

  - Use **ES Modules** (`import`/`export`) exclusively.
  - Enforce **strict typing**; avoid the `any` type unless absolutely necessary.
  - Prefer `interface` over `type` for defining object shapes, unless specific use cases dictate otherwise.
  - Utilize `readonly` for immutable properties to enhance code reliability.

- **React Components**:

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
