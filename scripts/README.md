# Enhanced Test Runner

An advanced testing system for the Universe Book Writer project that provides organized output management, log rotation, and flexible test execution options.

## Features

### 🚀 **Output Management**

- **Separate files per test suite** - No more 20,000+ line output files
- **ANSI code stripping** - Clean, readable log files
- **Timestamped directories** - Organized by test run date/time
- **Complete output preservation** - Full Jest output saved alongside suite-specific files

### 🔄 **Log Rotation**

- **Automatic cleanup** - Keeps only the last 10 test runs by default
- **Configurable retention** - Adjust via `test-runner.config.json`
- **Space efficient** - Prevents accumulation of hundreds of test directories

### 🎯 **Flexible Test Execution**

- **Individual test runs** - Target specific projects or patterns
- **Pattern matching** - Run tests matching specific names
- **Watch mode** - Continuous testing during development
- **Coverage reports** - Generate and save coverage data

### 📊 **Enhanced Reporting**

- **Test summaries** - Human-readable and JSON format
- **Real-time feedback** - Live progress indicators (✅❌⏭️)
- **Metadata tracking** - Run details, comments, and environment info
- **Issue tracking** - Add comments to link test runs to specific bugs/features

## Usage

### From TypeScript (Recommended)

```bash
# Run all tests
npx tsx scripts/run-tests-with-output.ts

# Run specific project tests
npx tsx scripts/run-tests-with-output.ts backend
npx tsx scripts/run-tests-with-output.ts frontend
npx tsx scripts/run-tests-with-output.ts ai-server

# Run tests with pattern matching
npx tsx scripts/run-tests-with-output.ts frontend --pattern "Button"
npx tsx scripts/run-tests-with-output.ts backend --pattern "auth"

# Add comments for issue tracking
npx tsx scripts/run-tests-with-output.ts --comment "Fixing auth bug" backend
npx tsx scripts/run-tests-with-output.ts -c "Testing new feature" frontend

# Generate coverage reports
node scripts/run-tests-with-output.js --coverage

# Watch mode for development
node scripts/run-tests-with-output.js --watch frontend

# Verbose output
node scripts/run-tests-with-output.js --verbose
```

### From NPM Scripts

```bash
# Pre-configured npm scripts
npm test                    # Run all tests
npm run test:backend        # Backend tests only
npm run test:frontend       # Frontend tests only
npm run test:ai-server      # AI server tests only
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
npm run test:verbose        # Verbose output
```

### From PowerShell (Windows)

```powershell
# PowerShell script with friendly parameters
.\scripts\run-tests.ps1 -All
.\scripts\run-tests.ps1 -Backend -Pattern "auth"
.\scripts\run-tests.ps1 -Frontend -Comment "Testing new UI components"
.\scripts\run-tests.ps1 -Coverage
```

## Command Line Options

| Option       | Short | Description                   | Example                |
| ------------ | ----- | ----------------------------- | ---------------------- |
| `--comment`  | `-c`  | Add a comment to the test run | `-c "Fixing auth bug"` |
| `--pattern`  | `-p`  | Run tests matching pattern    | `-p "Button"`          |
| `--coverage` |       | Generate coverage report      | `--coverage`           |
| `--watch`    | `-w`  | Run tests in watch mode       | `--watch`              |
| `--verbose`  | `-v`  | Verbose output                | `--verbose`            |
| `--help`     | `-h`  | Show help information         | `--help`               |

## Available Targets

| Target                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `all`                  | Run all tests (default)                      |
| `backend`              | Node.js backend API and business logic tests |
| `frontend`             | React component and frontend logic tests     |
| `ai-server`            | AI server and model integration tests        |
| `collaboration-server` | Real-time collaboration server tests         |
| `packages`             | Shared package and utility tests             |
| `e2e`                  | End-to-end tests                             |

## Output Structure

Each test run creates a timestamped directory in `test-results/`:

```
test-results/
├── run_2025-06-14_10-30-45/
│   ├── metadata.json           # Run metadata and configuration
│   ├── summary.json           # Machine-readable test results
│   ├── SUMMARY.txt            # Human-readable summary
│   ├── complete-output.log    # Full Jest output (ANSI stripped)
│   ├── backend_auth_test.log  # Individual test suite outputs
│   ├── frontend_Button_test.log
│   └── ...
├── run_2025-06-14_09-15-22/   # Previous test run
└── ...
```

### File Descriptions

- **`metadata.json`** - Test run configuration, timestamp, environment info
- **`summary.json`** - Results summary with pass/fail counts and suite list
- **`SUMMARY.txt`** - Human-readable summary for quick review
- **`complete-output.log`** - Full Jest output with ANSI codes stripped
- **`*.log`** - Individual test suite outputs for easier debugging

## Configuration

The test runner can be configured via `scripts/test-runner.config.json`:

```json
{
  "testRunner": {
    "outputDirectory": "test-results",
    "maxLogDirectories": 10,
    "stripAnsiCodes": true,
    "separateFilePerSuite": true,
    "timestampFormat": "yyyy-MM-dd_HH-mm-ss"
  }
}
```

### Configuration Options

- **`maxLogDirectories`** - Number of test run directories to keep (default: 10)
- **`outputDirectory`** - Directory for test results (default: "test-results")
- **`stripAnsiCodes`** - Remove color codes from saved output (default: true)
- **`separateFilePerSuite`** - Create individual files per test suite (default: true)
- **`timestampFormat`** - Date format for directory names

## Integration with Development Workflow

### Issue Tracking

Use comments to link test runs with specific issues or features:

```bash
# Link to specific bug fixes
node scripts/run-tests-with-output.js -c "Fixing issue #123: Auth token expiration" backend

# Track feature development
node scripts/run-tests-with-output.js -c "Testing new dashboard components" frontend

# Release testing
node scripts/run-tests-with-output.js -c "Pre-release testing v1.2.0" --coverage
```

### CI/CD Integration

The enhanced test runner is designed to work well in CI/CD pipelines:

```yaml
# Example GitHub Actions usage
- name: Run tests with enhanced output
  run: node scripts/run-tests-with-output.js --comment "CI run ${{ github.run_number }}"

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### Development Workflow

1. **Development**: Use watch mode for continuous testing

   ```bash
   npm run test:watch
   ```

2. **Pre-commit**: Run full test suite with coverage

   ```bash
   node scripts/run-tests-with-output.js --coverage --comment "Pre-commit validation"
   ```

3. **Debugging**: Run specific test patterns
   ```bash
   node scripts/run-tests-with-output.js --pattern "failing-test-name" --verbose
   ```

## Troubleshooting

### Common Issues

1. **PowerShell Execution Policy**

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

2. **Large Output Files**

   - The enhanced runner automatically splits output into manageable files
   - Adjust `maxLogDirectories` if you need to keep more test runs

3. **Test Discovery Issues**
   - Ensure Jest configuration is properly set up in each project
   - Check that test files follow the expected naming patterns

### Log Rotation Not Working

If log rotation isn't working as expected:

1. Check permissions on the `test-results` directory
2. Verify `maxLogDirectories` setting in configuration
3. Look for error messages in the console output

### Missing Test Output

If test output files are missing:

1. Ensure the test runner has write permissions
2. Check that tests are actually running (not just being discovered)
3. Verify Jest is producing output (try running Jest directly)

## Examples

### Basic Usage

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests with pattern
node scripts/run-tests-with-output.js frontend --pattern "Header"
```

### Advanced Usage

```bash
# Full coverage run with comment
node scripts/run-tests-with-output.js --coverage --comment "Release candidate testing"

# Watch mode for specific component
node scripts/run-tests-with-output.js frontend --watch --pattern "Dashboard"

# Verbose debugging of failing tests
node scripts/run-tests-with-output.js backend --verbose --pattern "auth.*should fail"
```

### PowerShell Examples

```powershell
# Windows-friendly script usage
.\scripts\run-tests.ps1 -Frontend -Pattern "Button" -Comment "Testing button interactions"
.\scripts\run-tests.ps1 -Coverage -Comment "Weekly coverage report"
.\scripts\run-tests.ps1 -Watch -Backend
```

## Benefits

### Before Enhanced Test Runner

- ❌ Single 20,000+ line output file
- ❌ ANSI codes cluttering saved output
- ❌ Difficult to find specific test failures
- ❌ No log rotation - accumulating files
- ❌ Limited test targeting options

### After Enhanced Test Runner

- ✅ Organized output split by test suite
- ✅ Clean, readable saved output
- ✅ Easy navigation to specific failures
- ✅ Automatic log rotation and cleanup
- ✅ Flexible test targeting and pattern matching
- ✅ Real-time progress indicators
- ✅ Comprehensive test summaries
- ✅ Issue tracking with comments

### 🛠️ **MCP Server Management**

- **Automated MCP setup** - Install and configure Model Context Protocol servers
- **VS Code integration** - Enhanced GitHub Copilot capabilities
- **PowerShell scripts** - Windows-optimized automation
- **Configuration management** - Centralized MCP server settings

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `run-tests-with-output.ts` | Enhanced test runner with organized logging | `npm test` or direct execution |
| `setup-mcp-servers.ps1` | Install and configure MCP servers for Copilot | `.\scripts\setup-mcp-servers.ps1` |
