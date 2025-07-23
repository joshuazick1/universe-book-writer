# Enhanced Test Runner Documentation

This document describes the features and usage of the enhanced test runner found in `scripts/run-tests-with-output.ts`.

---

## Overview

The enhanced test runner is a TypeScript-powered script designed for monorepo projects. It provides advanced test execution, output management, and CI-friendly reporting for all major project targets (backend, frontend, ai-server, collaboration-server, packages, shared, e2e).

---

## Features

### Multi-Target Support
- Run tests for any or all project targets.
- Per-target breakdowns and aggregate summaries.

### Pattern Matching
- Run tests by name (`--pattern`) or by file path (`--file`/`--test-path-pattern`).
- Fine-grained selection of tests to execute.

### Output Management
- Each test suite’s output is saved to a dedicated `.log` file in a timestamped directory under `test-results/`.
- ANSI codes are stripped from saved logs for readability.
- Automatic log rotation keeps only the 10 most recent test runs.
- All output (including debug/console) is captured and organized.

### Real-Time Feedback
- Console displays live progress:
  - ✅ for passed tests
  - ❌ for failed tests
  - ⏭️ for skipped tests
- Immediate display of important lines (PASS/FAIL/Test Suites/Tests).

### Coverage Reporting
- Generates and copies LCOV, CSV, JSON, and HTML coverage reports into the test run directory when `--coverage` is enabled.
- Summarizes coverage stats and uncovered lines.

### Summary and CI Integration
- Always writes a `summary.json` file with detailed results, including per-suite and per-target breakdowns.
- When `--ci` or `--json` is used, prints the JSON summary to stdout between `CI_SUMMARY_JSON_START` and `CI_SUMMARY_JSON_END` markers for easy CI/CD parsing.
- Includes metadata, execution context, and optional comments.

### Robust Error Handling
- Detects and reports test suites that failed to run or crashed.
- Handles missing configs, test files, or coverage gracefully.

### Flexible Execution
- Supports passthrough of unknown flags to Jest.
- Watch mode (`--watch`) and verbose output (`--verbose`) supported.
- Can be run directly with `npx tsx scripts/run-tests-with-output.ts` and is compatible with npm/yarn scripts.

### Documentation and Help
- Built-in help output (`--help`) describes all options, usage, and examples.

---

## Usage Examples

```bash
# Run all tests with enhanced output
npx tsx scripts/run-tests-with-output.ts --all

# Run backend tests only
npx tsx scripts/run-tests-with-output.ts backend

# Run frontend tests matching a pattern
npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button"

# Run with coverage and CI output
npx tsx scripts/run-tests-with-output.ts --coverage --ci
```

---


---

## Modular Rewrite & Improvement Plan

This section outlines a detailed plan for rewriting the test runner with a modular structure and enhanced capabilities.

### 1. Plugin System for Output/Reporting
- Design a plugin interface for custom reporters (e.g., HTML, Slack, email, dashboard).
- Allow plugins to hook into runner lifecycle events (pre-run, post-run, per-suite, per-test).
- Enable user-defined hooks for custom logic (e.g., notifications, metrics).

### 2. Parallel Target Execution
- Add support for running test targets in parallel, with a configurable concurrency limit.
- Provide CLI flags to control parallelism (e.g., `--parallel`, `--max-workers`).
- Ensure output and logs remain organized and non-interleaved.

### 3. Interactive CLI
- Implement an interactive mode for selecting targets, patterns, or rerunning failed tests.
- Show a summary dashboard at the end, with navigation to logs and quick rerun options.

### 4. Automatic Retry for Flaky Tests
- Add an option to retry failed tests/suites a configurable number of times.
- Mark and report flaky tests separately in the summary.

### 5. Test Filtering and Tagging
- Support test tags/labels (e.g., `@slow`, `@integration`) for flexible selection.
- Allow both inclusion and exclusion patterns (e.g., `--tag integration --exclude-tag slow`).

### 6. Enhanced Error Diagnostics
- Collect and display stack traces, environment info, and recent git commit for failed suites.
- Optionally open failed test logs in the editor automatically (with a flag).

### 7. Configurable Output Directory
- Allow users to specify the output directory for logs and reports via CLI or config file.

### 8. Test Duration Tracking
- Track and report slowest tests/suites in the summary.
- Optionally fail the run if any test exceeds a duration threshold (configurable).

### 9. Test Coverage Thresholds
- Enforce minimum coverage thresholds (statements, branches, functions, lines).
- Fail the run and highlight gaps if thresholds are not met.

### 10. API/JSON Output Improvements
- Provide a stable, versioned JSON schema for summary output.
- Optionally emit machine-readable events for CI/CD integration (e.g., via stdout or a socket).

### 11. Better Watch Mode
- Smarter file watching: debounce changes, rerun only affected tests.
- Option to rerun only failed tests on file change.

### 12. Self-Testing
- Include a self-test mode to verify the runner’s own logic and output.
- Provide example test projects for regression testing the runner.

---

## Proposed Modular Structure

- **core/**: Orchestration, CLI parsing, plugin loading
- **targets/**: Target discovery and management
- **executor/**: Test execution, retries, output collection
- **reporters/**: Pluggable reporters (console, file, CI, HTML, etc.)
- **logs/**: Log file creation, rotation, cleanup
- **coverage/**: Coverage processing and reporting
- **config/**: Config loading and validation
- **events/**: Event bus for plugins and internal modules

---

## Example CLI Enhancements

```bash
# Run with 4 targets in parallel, custom output dir, and Slack reporting
npx tsx scripts/run-tests-with-output.ts --parallel 4 --output-dir ./custom-results --reporter slack

# Run only tests tagged @integration, exclude @slow, and retry failed tests up to 2 times
npx tsx scripts/run-tests-with-output.ts --tag integration --exclude-tag slow --retries 2

# Interactive mode
npx tsx scripts/run-tests-with-output.ts --interactive
```

---

For more details, see the top-of-file comments and the help output (`--help`) in the script.
