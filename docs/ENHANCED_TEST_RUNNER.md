# Enhanced Test Runner Documentation

The enhanced test runner (`scripts/run-tests-with-output.ts`) provides powerful pattern matching and coverage reporting capabilities for the Universe Book Writer project.

## Key Improvements

### 1. **Reliable Pattern Matching**

The test runner now provides two distinct types of pattern matching:

- **Test Name Patterns** (`--pattern`, `-p`): Matches test descriptions within test files
- **Test Path Patterns** (`--file`, `-f`): Matches test file paths

#### Examples:
```bash
# Run tests with names containing "should validate"
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should validate"

# Run all tests in files containing "auth" in their path
npx tsx scripts/run-tests-with-output.ts frontend --file "auth"

# Combine both patterns for precise test selection
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should validate" --file "store"
```

### 2. **Enhanced Coverage Reporting**

Coverage reports are now:
- **Target-specific**: Only collect coverage for the code area being tested
- **Extracted**: Coverage output is saved to separate, well-formatted files
- **Organized**: Coverage reports include metadata and are timestamped

#### Coverage Features:
- Project-specific coverage patterns automatically applied
- Coverage reports saved to `coverage-report-{target}-{patterns}.txt`
- Full metadata including test run context
- Separate coverage directories per target (`coverage/frontend`, `coverage/backend`, etc.)

#### Examples:
```bash
# Generate coverage for all frontend tests
npx tsx scripts/run-tests-with-output.ts frontend --coverage

# Generate coverage for specific auth-related tests only
npx tsx scripts/run-tests-with-output.ts frontend --file "auth" --coverage

# Generate coverage for backend with specific test pattern
npx tsx scripts/run-tests-with-output.ts backend --pattern "validation" --coverage
```

### 3. **Improved Jest Configuration**

The test runner now uses:
- Jest's `--selectProjects` for reliable project targeting
- Better pattern matching with `--testNamePattern` and `--testPathPattern`
- Project-specific Jest configuration optimization

## Usage Examples

### Basic Usage
```bash
# Run all tests
npm test

# Run tests for specific project
npm run test:backend
npm run test:frontend

# Run with coverage
npm run test:coverage
npm run test:coverage:frontend
```

### Advanced Pattern Matching
```bash
# Run tests by file pattern
npx tsx scripts/run-tests-with-output.ts frontend --file "auth"

# Run tests by name pattern
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should validate"

# Combine patterns for precision
npx tsx scripts/run-tests-with-output.ts backend --pattern "error handling" --file "api"

# Add comments for tracking
npx tsx scripts/run-tests-with-output.ts frontend --file "auth" --comment "Testing login bug fix"
```

### Coverage-Specific Examples
```bash
# Full frontend coverage
npx tsx scripts/run-tests-with-output.ts frontend --coverage

# Coverage for specific components only
npx tsx scripts/run-tests-with-output.ts frontend --file "Button" --coverage

# Backend API coverage
npx tsx scripts/run-tests-with-output.ts backend --file "api" --coverage

# Coverage with pattern and comment
npx tsx scripts/run-tests-with-output.ts frontend --pattern "validation" --coverage --comment "Form validation coverage"
```

## Output Organization

Each test run creates a timestamped directory in `test-results/` containing:

### Standard Files:
- `metadata.json`: Test run configuration and metadata
- `summary.json`: Test results summary with counts and file list
- `complete-output.log`: Full Jest output (ANSI-stripped)
- `{test-suite}.log`: Individual test suite outputs

### Coverage Files (when `--coverage` used):
- `coverage-report-{target}-{patterns}.txt`: Formatted coverage report with metadata
- `coverage/{target}/`: HTML and LCOV coverage reports

### Debug Files:
- `jest-config.log`: Jest configuration information for debugging

## Pattern Matching Details

### Test Name Patterns (`--pattern`)
- Matches against test descriptions (`it()`, `test()`, `describe()` blocks)
- Uses Jest's `--testNamePattern` internally
- Supports regex patterns
- Case-insensitive by default

Examples:
- `--pattern "should validate"` matches tests with "should validate" in their description
- `--pattern "error"` matches any test mentioning "error"
- `--pattern "^Auth"` matches tests starting with "Auth"

### Test Path Patterns (`--file`)
- Matches against test file paths relative to project root
- Uses Jest's `--testPathPattern` internally
- Supports regex patterns
- Useful for running tests for specific modules/components

Examples:
- `--file "auth"` matches `auth.test.ts`, `user-auth.test.ts`, `auth/login.test.ts`
- `--file "components/Button"` matches tests in Button component directory
- `--file "\.store\."` matches all store test files

## Coverage Configuration

The test runner automatically configures coverage collection based on the target:

### Frontend Coverage:
- Collects from `frontend/src/**/*.{ts,tsx}`
- Excludes test files, stories, and type definitions
- Saves to `coverage/frontend/`

### Backend Coverage:
- Collects from `backend/src/**/*.ts`
- Excludes test files and type definitions
- Saves to `coverage/backend/`

### Project-Specific Coverage:
Each project has tailored coverage patterns to avoid noise and focus on relevant source code.

## Best Practices

### For Single Test Development:
```bash
# Run specific test file while developing
npx tsx scripts/run-tests-with-output.ts frontend --file "Button" --watch

# Run specific test pattern with coverage
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should render" --file "Button" --coverage
```

### For Bug Investigation:
```bash
# Run failing tests with detailed output
npx tsx scripts/run-tests-with-output.ts backend --file "api/users" --verbose --comment "Issue #123 investigation"

# Generate coverage for specific bug area
npx tsx scripts/run-tests-with-output.ts frontend --file "auth" --coverage --comment "Auth bug coverage analysis"
```

### For CI/CD:
```bash
# Generate full coverage report
npx tsx scripts/run-tests-with-output.ts --coverage --comment "CI build $(BUILD_NUMBER)"

# Run specific project tests
npx tsx scripts/run-tests-with-output.ts backend --comment "Backend integration tests"
```

## Troubleshooting

### Pattern Not Working?
1. Check if you're using the right pattern type (`--pattern` vs `--file`)
2. Use `--verbose` to see Jest's full output
3. Check the `jest-config.log` file in the test results

### Coverage Issues?
1. Verify the target has source files in expected locations
2. Check the coverage patterns in the test runner code
3. Look at the extracted coverage report for detailed file information

### Performance Issues?
1. Use more specific patterns to reduce test scope
2. The `--runInBand` flag is automatically used for frontend tests
3. Consider using `--watch` mode for development
