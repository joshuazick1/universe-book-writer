# Unified Jest Configuration System

This document describes the new unified Jest configuration system for the Universe Book Writer monorepo.

## Overview

The Jest configuration has been redesigned to provide consistent behavior across all projects while maintaining the flexibility for project-specific testing. All configurations now share the same base structure, execution parameters, coverage settings, and module resolution patterns.

## Files Structure

### Backup Files
All original configurations have been backed up:
- `jest.config.mjs.backup` - Root configuration backup
- `backend/jest.config.mjs.backup` - Backend configuration backup
- `frontend/jest.config.mjs.backup` - Frontend configuration backup
- `ai-server/jest.config.mjs.backup` - AI server configuration backup
- `collaboration-server/jest.config.json.backup` - Collaboration server configuration backup
- `packages/core/jest.config.mjs.backup` - Packages core configuration backup

### New Configuration Files
- `jest.config.shared.mjs` - Shared configuration utilities (available for future use)
- `jest.config.mjs` - Root multi-project configuration
- `backend/jest.config.mjs` - Backend-specific configuration
- `frontend/jest.config.mjs` - Frontend-specific configuration
- `ai-server/jest.config.mjs` - AI server-specific configuration
- `collaboration-server/jest.config.mjs` - Collaboration server-specific configuration (converted from JSON)
- `packages/core/jest.config.mjs` - Packages core-specific configuration

## Consistent Configuration Standards

All Jest configurations now follow the same standardized structure:

### Common Base Settings
- **ESM Support**: Consistent ES module handling across all projects
- **Transform Configuration**: Standardized TypeScript compilation with ts-jest
- **Module Name Mapping**: Common patterns for path resolution and import handling
- **Test Execution**: Uniform timeout, worker, and execution settings
- **Coverage Configuration**: Consistent coverage collection, reporting, and thresholds
- **Test Discovery**: Standardized test file patterns

### Shared Configuration Values

All projects now use these consistent settings:

```javascript
// Test execution configuration
passWithNoTests: true,
verbose: true,
detectOpenHandles: true,
forceExit: true,
maxWorkers: 1,
testTimeout: 15000,

// Coverage thresholds
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},

// ESM support
extensionsToTreatAsEsm: ['.ts', '.tsx'],
moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

// Base module name mapping
moduleNameMapper: {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
  '^@/(.*)$': '<rootDir>/src/$1',
  // ... project-specific mappings
}
```

## Project-Specific Configurations

### Root Configuration (`jest.config.mjs`)
- **Type**: Multi-project configuration
- **Projects**: Frontend, Backend, AI Server, Collaboration Server, Packages
- **Purpose**: Run all project tests together with unified coverage reporting

### Frontend Configuration
- **Test Environment**: `jsdom` for DOM testing
- **Asset Handling**: CSS and image imports properly mocked
- **JSX Support**: React JSX transformation enabled
- **Coverage**: Enhanced coverage collection enabled by default

### Backend Configuration
- **Test Environment**: `node` for server-side testing
- **Path Mappings**: Comprehensive source and test directory mappings
- **ESM Support**: Full ES module support with Node.js resolution
- **Setup**: Multiple setup files for different test scenarios

### AI Server Configuration
- **Test Environment**: `node` for AI processing testing
- **Test Patterns**: AI-specific test file patterns
- **Coverage**: AI server source-only coverage collection

### Collaboration Server Configuration
- **Test Environment**: `node` for real-time features testing
- **File Format**: Converted from JSON to JavaScript for consistency
- **Test Patterns**: Collaboration-specific test discovery

### Packages Configuration
- **Test Environment**: `node` for shared library testing
- **Transform Patterns**: MongoDB and BSON module support
- **Setup**: Shared monorepo setup file usage

## Usage Examples

### Running Tests

```powershell
# Run all tests across all projects
npm test

# Run specific project tests
npm run test:backend
npm run test:frontend
npm run test:ai-server
npm run test:collaboration-server
npm run test:packages

# Run with enhanced test runner
npx tsx scripts/run-tests-with-output.ts --pattern "auth" --comment "Testing auth system"
```

### Individual Project Testing

Each project can be tested independently with consistent behavior:

```powershell
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# AI Server tests
cd ai-server
npm test

# Collaboration Server tests
cd collaboration-server
npm test

# Packages tests
cd packages/core
npm test
```

## Key Benefits

### Behavioral Consistency
- **Identical Execution**: Same timeout, worker, and execution parameters across all projects
- **Consistent Coverage**: Same coverage thresholds and reporting formats
- **Unified Module Resolution**: Same import/export handling patterns
- **Standardized Test Discovery**: Consistent test file matching patterns

### Maintenance Advantages
- **Predictable Behavior**: Tests behave the same way regardless of where they're run
- **Easier Debugging**: Consistent configuration makes troubleshooting simpler
- **Reduced Configuration Drift**: All projects follow the same patterns
- **Simpler Updates**: Changes can be applied consistently across all projects

### Developer Experience
- **Familiar Interface**: Same commands and options work across all projects
- **Consistent Feedback**: Same test output format and coverage reporting
- **Reliable CI/CD**: Predictable behavior in automated environments
- **Easy Context Switching**: No need to remember project-specific Jest behaviors

## Configuration Validation

A validation script ensures all configurations work correctly:

```powershell
# Run configuration validation
node scripts/validate-jest-configs.mjs
```

This script:
- Tests each project's Jest configuration
- Verifies setup files exist and are accessible
- Confirms all display names and project settings
- Reports any configuration issues

## Migration Notes

### Breaking Changes
- `collaboration-server/jest.config.json` renamed to `jest.config.mjs`
- All configurations now use JavaScript modules instead of JSON where applicable
- Some configuration options consolidated for consistency

### Maintained Compatibility
- All existing test files work without changes
- Test patterns and discovery remain the same
- Setup files and coverage collection preserved
- Individual project testing still fully functional

### Rollback Process
If issues arise, original configurations can be restored:

```powershell
# Restore original configurations
Copy-Item "jest.config.mjs.backup" "jest.config.mjs"
Copy-Item "backend/jest.config.mjs.backup" "backend/jest.config.mjs"
Copy-Item "frontend/jest.config.mjs.backup" "frontend/jest.config.mjs"
Copy-Item "ai-server/jest.config.mjs.backup" "ai-server/jest.config.mjs"
Copy-Item "collaboration-server/jest.config.json.backup" "collaboration-server/jest.config.json"
Copy-Item "packages/core/jest.config.mjs.backup" "packages/core/jest.config.mjs"
```

## Future Improvements

The `jest.config.shared.mjs` file provides a foundation for future enhancements:
- Configuration factories for new projects
- Dynamic environment detection
- Advanced testing scenarios
- Custom reporter configurations

## Troubleshooting

### Common Issues

1. **Setup File Errors**: Verify setup files exist at specified paths
2. **Path Resolution**: Ensure TypeScript configurations are correct
3. **Module Resolution**: Check import/export patterns match module mappings
4. **Coverage Issues**: Verify source file patterns in collectCoverageFrom

### Debug Mode

Enable detailed Jest logging by adding to any configuration:
```javascript
verbose: true,
// Add additional debugging as needed
```

### Validation

Always run the validation script after making changes:
```powershell
node scripts/validate-jest-configs.mjs
```

This ensures all configurations remain functional and consistent.
