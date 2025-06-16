# Frontend Test Fixes Implementation Checklist

## 🎯 **Priority Order (Highest Impact First)**

### **Priority 1: API Mocking Infrastructure (Fixes ~45 failures)**

- [ ] **1.1** Create centralized API mock setup utility
- [ ] **1.2** Fix auth store test mocking with proper module isolation
- [ ] **1.3** Update auth hooks tests to use proper API mocks
- [ ] **1.4** Verify API mocking works across all auth test files

### **Priority 2: Component Test Alignment (Fixes ~15 failures)**

- [ ] **2.1** Fix LoginForm loading state test selector
- [ ] **2.2** Fix RegisterForm component test issues
- [ ] **2.3** Fix ProtectedRoute component test issues
- [ ] **2.4** Align all component tests with actual implementations

### **Priority 3: State Management & Hook Tests (Fixes ~5 failures)**

- [ ] **3.1** Fix TestWrapper to provide proper mock store
- [ ] **3.2** Update hook tests to use consistent mock patterns
- [ ] **3.3** Fix auth state management test expectations
- [ ] **3.4** Resolve edge case and detailed test scenarios

## 📋 **Detailed Implementation Plan**

### **Phase 1: API Mocking Infrastructure**

#### **Task 1.1: Create Centralized API Mock Setup**

- **File:** `frontend/test/mocks/api.mock.ts` (new)
- **Purpose:** Centralized mock for all auth API calls
- **Impact:** Eliminates all "Network Error" failures

#### **Task 1.2: Fix Auth Store Test Mocking**

- **File:** `frontend/test/stores/auth.store.test.ts`
- **Issue:** Module mocking not working, real HTTP calls being made
- **Fix:** Proper `jest.isolateModules()` and `jest.doMock()` setup

#### **Task 1.3: Update Auth Hooks Tests**

- **File:** `frontend/test/hooks/auth.hooks.test.ts`
- **Issue:** TestWrapper not providing mocked store
- **Fix:** Create proper mock provider wrapper

### **Phase 2: Component Test Alignment**

#### **Task 2.1: Fix LoginForm Loading State**

- **File:** `frontend/test/components/LoginForm.test.tsx`
- **Issue:** Test looks for `role="button"` with `/loading/i` name
- **Reality:** Component shows `<span>Loading</span>` inside disabled button
- **Fix:** Update test selector to match actual implementation

#### **Task 2.2: Fix RegisterForm Tests**

- **File:** `frontend/test/components/RegisterForm.test.tsx`
- **Issue:** Similar API mocking and component alignment issues
- **Fix:** Apply same patterns as LoginForm

### **Phase 3: State Management Cleanup**

#### **Task 3.1: Fix Hook Test Wrappers**

- **Files:** All hook test files
- **Issue:** TestWrapper not using mocked store instances
- **Fix:** Implement proper mock store provider

## 🔧 **Implementation Strategy**

1. **Start with API mocks** (highest impact - fixes majority of failures)
2. **Test incrementally** after each major change
3. **Use enhanced test runner** to verify progress
4. **Document patterns** for future test consistency

## 📊 **Success Metrics**

- **Current:** 65 failed, 197 passed (74.9%)
- **Target after Phase 1:** ~20 failed, 242 passed (92.0%)
- **Target after Phase 2:** ~5 failed, 257 passed (97.7%)
- **Target after Phase 3:** 0 failed, 262 passed (99.6%)

## 🚀 **Ready to Execute**

Starting implementation with **Task 1.1: Create Centralized API Mock Setup** as it will have the highest immediate impact on test success rate.
