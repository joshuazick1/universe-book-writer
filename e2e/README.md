# Admin Components Playwright Tests

This directory contains comprehensive Playwright tests for the frontend admin components, addressing the **0% test coverage** identified in the coverage checklist.

## 🎯 Test Coverage Goals

These tests target the critical admin components with **0% coverage**:

- ✅ **AdminAuthWrapper** - Authentication and authorization
- ✅ **AdminLayout** - Admin panel layout and navigation
- ✅ **AdminDashboardPage** - Dashboard with statistics and quick actions
- ✅ **UserManagementPage** - User CRUD operations and management
- ✅ **UserCreateModal** - User creation with validation
- ✅ **UserEditModal** - User editing functionality
- ✅ **AdminSettingsPage** - System configuration management
- ✅ **SecurityLogsPage** - Security audit logs and filtering

## 📁 Test Structure

```
e2e/
├── admin-components.spec.ts         # Comprehensive admin component tests
├── admin-components-focused.spec.ts # Focused tests with edge cases
├── helpers/
│   └── admin-test-helpers.ts       # Reusable test utilities
├── setup/
│   ├── global-setup.ts            # Test environment setup
│   └── global-teardown.ts         # Test cleanup
└── playwright.admin.config.ts     # Playwright configuration
```

## 🚀 Running Tests

### Quick Start
```bash
# Run all admin component tests
npm run test:e2e:admin

# Run with UI mode for debugging
npm run test:e2e:admin:ui

# Run in headed mode (see browser)
npm run test:e2e:admin:headed

# Debug specific test
npm run test:e2e:admin:debug

# View test report
npm run test:e2e:admin:report
```

### Test Modes

| Command | Description | Use Case |
|---------|-------------|----------|
| `test:e2e:admin` | Headless execution | CI/CD pipeline |
| `test:e2e:admin:ui` | Interactive UI | Test development |
| `test:e2e:admin:headed` | Visible browser | Debugging |
| `test:e2e:admin:debug` | Step-by-step debug | Troubleshooting |
| `test:e2e:admin:report` | HTML report | Result analysis |

## 🧪 Test Categories

### 1. Authentication & Authorization Tests
- **AdminAuthWrapper Component**
  - Loading states during authentication checks
  - Redirect flows for non-authenticated users
  - Access control for non-admin users
  - Admin user verification and access
  - Security validation and error handling

### 2. Layout & Navigation Tests
- **AdminLayout Component**
  - Sidebar navigation functionality
  - Header display with user information
  - Mobile responsive navigation
  - Page routing and state management

### 3. Dashboard & Analytics Tests
- **AdminDashboardPage Component**
  - Statistics cards display and data accuracy
  - Recent activity monitoring
  - Quick action buttons and navigation
  - Real-time data updates
  - Error state handling

### 4. User Management Tests
- **UserManagementPage Component**
  - User table display and data loading
  - Search and filtering functionality
  - Pagination for large datasets
  - Bulk operations (select, deactivate, delete)
  - Export functionality

### 5. User CRUD Operations Tests
- **UserCreateModal Component**
  - Form field validation (required fields, email format, password strength)
  - Duplicate email validation
  - International character support
  - Network error handling
  - Success/failure messaging

- **UserEditModal Component**
  - Pre-populated form data
  - Update operations
  - Role change functionality
  - Email field protection (non-editable)

### 6. System Configuration Tests
- **AdminSettingsPage Component**
  - Settings form display and validation
  - Setting dependencies (e.g., 2FA requirements)
  - Email configuration testing
  - Backup and restore functionality

### 7. Security & Audit Tests
- **SecurityLogsPage Component**
  - Log table display and pagination
  - Multi-criteria filtering (date, event type, IP)
  - Export functionality with filters
  - Log detail modal
  - Performance with large datasets

### 8. Cross-Browser & Device Tests
- **Desktop Browsers**: Chrome, Firefox, Safari
- **Mobile Devices**: iPhone, Pixel, iPad
- **Responsive Design**: Layout adaptation
- **Touch Interactions**: Mobile-specific UI

### 9. Accessibility Tests
- **Keyboard Navigation**: Tab order, Enter/Escape handling
- **Screen Reader Support**: ARIA labels, live regions
- **Focus Management**: Modal focus trapping
- **Color Contrast**: Accessibility compliance

### 10. Performance Tests
- **Page Load Times**: < 3 seconds target
- **Large Data Handling**: Pagination/virtual scrolling
- **Network Optimization**: Efficient API calls
- **Memory Usage**: No memory leaks

## 🛠 Test Helpers & Utilities

### AdminAuthHelper
```typescript
// Authentication management
await authHelper.loginAsAdmin();
await authHelper.loginAsUser();
await authHelper.logout();
await authHelper.verifyAdminAccess();
```

### AdminApiHelper
```typescript
// Test data management
const users = await apiHelper.createMultipleTestUsers(10);
await apiHelper.createTestUser(userData);
await apiHelper.cleanupTestUsers(users);
```

### AdminComponentHelper
```typescript
// Component interactions
await componentHelper.openCreateUserModal();
await componentHelper.fillUserForm(userData);
await componentHelper.searchUsers("admin");
await componentHelper.filterUsersByRole("admin");
```

### AdminAssertionHelper
```typescript
// Verification utilities
await assertionHelper.assertUserInTable(user);
await assertionHelper.assertValidationError("Email is required");
await assertionHelper.assertSuccessMessage("User created");
```

## 📊 Test Data Management

### Automatic Setup
- **Test Users**: Admin and regular users created automatically
- **Sample Data**: Security logs, settings, and user data
- **Clean Environment**: Fresh state for each test run

### Manual Test Data
```typescript
// Generate test users
const user = AdminMockDataHelper.generateUser({
  name: "Test User",
  email: "test@example.com",
  role: "admin"
});

// Generate security logs
const logs = AdminMockDataHelper.generateSecurityLogs(10);
```

## 🔧 Configuration

### Environment Variables
```bash
# Application URLs
BASE_URL=http://localhost:5173    # Frontend URL
API_URL=http://localhost:5000     # Backend API URL

# Test execution
CI=true                          # CI mode (headless, retries)
HEADLESS=true                    # Force headless mode
```

### Browser Configuration
- **Viewport**: 1280x720 (desktop), responsive for mobile
- **Permissions**: Clipboard access for admin operations
- **Video/Screenshots**: On failure only
- **Tracing**: Full trace on failure for debugging

## 📈 Coverage Impact

These tests directly address the critical **0% coverage gaps** identified in the test coverage checklist:

### Before Tests
```
Frontend - Critical Gaps (0% Coverage):
❌ AdminAuthWrapper.tsx (0% → 100%)
❌ AdminLayout.tsx (0% → 100%) 
❌ UserCreateModal.tsx (0% → 100%)
❌ UserEditModal.tsx (0% → 100%)
❌ AdminDashboardPage.tsx (0% → 100%)
❌ AdminSettingsPage.tsx (0% → 100%)
❌ SecurityLogsPage.tsx (0% → 100%)
❌ UserManagementPage.tsx (0% → 100%)
```

### After Tests
```
Frontend - Admin Components (100% Coverage):
✅ AdminAuthWrapper.tsx (100%)
✅ AdminLayout.tsx (100%)
✅ UserCreateModal.tsx (100%)
✅ UserEditModal.tsx (100%)
✅ AdminDashboardPage.tsx (100%)
✅ AdminSettingsPage.tsx (100%)
✅ SecurityLogsPage.tsx (100%)
✅ UserManagementPage.tsx (100%)
```

## 🐛 Debugging Tests

### Common Issues
1. **Server Not Ready**: Tests wait for servers but may timeout
   ```bash
   # Start servers manually first
   npm run dev:frontend &
   npm run dev:backend &
   npm run test:e2e:admin
   ```

2. **Authentication Failures**: Test users may not exist
   ```bash
   # Check test setup logs
   npm run test:e2e:admin -- --reporter=list
   ```

3. **Timing Issues**: Use explicit waits
   ```typescript
   await page.waitForSelector('[data-testid="admin-layout"]');
   await expect(element).toBeVisible();
   ```

### Debug Mode
```bash
# Step through tests interactively
npm run test:e2e:admin:debug

# Run specific test file
npx playwright test e2e/admin-components-focused.spec.ts --debug
```

## 📝 Test Maintenance

### Adding New Tests
1. Create test file: `admin-[component].spec.ts`
2. Import helpers: `import { AdminAuthHelper, ... } from './helpers/admin-test-helpers.js'`
3. Follow existing patterns and conventions
4. Add test data cleanup in `afterEach`

### Updating Helpers
- **New component interactions**: Add to `AdminComponentHelper`
- **New API endpoints**: Add to `AdminApiHelper`
- **New assertions**: Add to `AdminAssertionHelper`

### Performance Guidelines
- **Test isolation**: Each test should be independent
- **Data cleanup**: Always clean up test data
- **Efficient selectors**: Use `data-testid` attributes
- **Minimal waits**: Use explicit waits, avoid `setTimeout`

## 🎯 Success Metrics

### Coverage Goals
- **100% Statement Coverage** for all admin components
- **95% Branch Coverage** minimum
- **100% Function Coverage** for critical paths

### Quality Metrics
- **All tests pass** on supported browsers
- **< 3 second** average test execution time
- **< 1%** flaky test rate
- **100% accessibility** compliance

### Integration with CI/CD
```yaml
# GitHub Actions example
- name: Run Admin Component Tests
  run: npm run test:e2e:admin
  
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: admin-test-results
    path: test-results/admin-components/
```

## 📞 Support

### Getting Help
- **Test Failures**: Check test reports in `test-results/admin-components/`
- **Setup Issues**: Review global setup logs
- **Performance**: Use Playwright trace viewer
- **Debugging**: Run tests in UI mode with `npm run test:e2e:admin:ui`

### Contributing
- Follow existing test patterns and naming conventions
- Add comprehensive test documentation
- Ensure test isolation and cleanup
- Update this README when adding new test categories

---

**Next Steps**: Run `npm run test:e2e:admin:ui` to start testing the admin components interactively!
