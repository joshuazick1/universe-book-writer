# Test Pattern Troubleshooting Guide

## Pattern Types & Usage

### 1. Test Name Patterns (`--testNamePattern`)

- **Usage**: `--pattern "pattern"`
- **Matches**: Content of `describe()` and `it()` blocks
- **Examples**:
  - `--pattern "RegisterForm"` → Matches `describe('RegisterForm', ...)`
  - `--pattern "Loading State"` → Matches `describe('Loading State', ...)`
  - `--pattern "should disable"` → Matches `it('should disable...', ...)`

### 2. File Path Patterns (`--testPathPattern`)

- **Usage**: Built into project targeting
- **Matches**: File paths
- **Examples**:
  - `frontend` → All files in frontend/test/
  - `backend` → All files in backend/tests/

### 3. Pattern Matching Rules

#### ✅ Working Patterns:

```bash
# Run specific test group
npx tsx scripts/run-tests-with-output.ts frontend --pattern "Loading State"

# Run all RegisterForm tests
npx tsx scripts/run-tests-with-output.ts frontend --pattern "RegisterForm"

# Run specific test case
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should disable submit button"
```

#### ❌ Patterns That Don't Work:

```bash
# Too strict - exact match skips everything
npx tsx scripts/run-tests-with-output.ts frontend --pattern "^RegisterForm$"

# File names don't work with --testNamePattern
npx tsx scripts/run-tests-with-output.ts frontend --pattern "RegisterForm.test.tsx"
```

## Common Issues

### Issue 1: Pattern Too Specific

**Problem**: Using regex anchors `^$` makes patterns too strict
**Solution**: Use partial matches without anchors

### Issue 2: Wrong Pattern Type

**Problem**: Using file names with `--testNamePattern`
**Solution**: Use test/describe block names instead

### Issue 3: Case Sensitivity

**Problem**: Patterns are case-sensitive
**Solution**: Match exact casing in test descriptions

## Best Practices

1. **Target Projects First**: Always specify `frontend`, `backend`, etc.
2. **Use Descriptive Test Names**: Make describe blocks easy to pattern match
3. **Test Pattern Before Full Run**: Use simple patterns to verify targeting
4. **Use Comments**: Add `--comment` to track what you're testing

## Example Workflow

```bash
# 1. Test specific functionality
npx tsx scripts/run-tests-with-output.ts frontend --pattern "Loading State" --comment "Testing loading states"

# 2. Test specific component
npx tsx scripts/run-tests-with-output.ts frontend --pattern "RegisterForm" --comment "RegisterForm debugging"

# 3. Test specific behavior
npx tsx scripts/run-tests-with-output.ts frontend --pattern "should disable" --comment "Button disable tests"
```
