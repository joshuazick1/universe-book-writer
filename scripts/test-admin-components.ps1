# Quick Admin Component Test Runner
# Run this script to test admin components immediately

Write-Host "=== Admin Component Test Runner ===" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if Playwright is installed
Write-Host "=== Checking Playwright Installation ===" -ForegroundColor Yellow
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npx is not available. Please install Node.js first." -ForegroundColor Red
    exit 1
}

try {
    $playwrightVersion = (npx playwright --version 2>$null)
    if ($playwrightVersion) {
        Write-Host "[OK] Playwright is installed: $playwrightVersion" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Playwright not found. Installing..." -ForegroundColor Yellow
        npm install -D @playwright/test
        npx playwright install
        Write-Host "[OK] Playwright installed successfully" -ForegroundColor Green
    }
}
catch {
    Write-Host "[ERROR] Failed to check/install Playwright" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if servers are running
Write-Host "=== Checking Development Servers ===" -ForegroundColor Yellow

# Check frontend server
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Frontend server is running (http://localhost:5173)" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Frontend server not running. Starting..." -ForegroundColor Yellow
    Write-Host "Please start the frontend server manually:" -ForegroundColor Cyan
    Write-Host "cd frontend && npm run dev" -ForegroundColor White
}

# Check backend server
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "[OK] Backend server is running (http://localhost:5000)" -ForegroundColor Green
    } else {
        throw "Backend not responding"
    }
}
catch {
    Write-Host "[WARNING] Backend server not running. Starting..." -ForegroundColor Yellow
    Write-Host "Please start the backend server manually:" -ForegroundColor Cyan
    Write-Host "cd backend && npm run dev" -ForegroundColor White
}

Write-Host ""

# Present test options
Write-Host "=== Test Execution Options ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose how you want to run the admin component tests:" -ForegroundColor White
Write-Host ""
Write-Host "1. [RECOMMENDED] UI Mode - Interactive test runner" -ForegroundColor Cyan
Write-Host "2. Headed Mode - See tests run in browser" -ForegroundColor Cyan
Write-Host "3. Headless Mode - Fast execution (CI style)" -ForegroundColor Cyan
Write-Host "4. Debug Mode - Step through tests" -ForegroundColor Cyan
Write-Host "5. Focused Tests Only - Run edge case tests" -ForegroundColor Cyan
Write-Host "6. View Last Test Report" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "Starting Playwright UI mode..." -ForegroundColor Green
        npm run test:e2e:admin:ui
    }
    "2" {
        Write-Host "Running tests in headed mode..." -ForegroundColor Green
        npm run test:e2e:admin:headed
    }
    "3" {
        Write-Host "Running tests in headless mode..." -ForegroundColor Green
        npm run test:e2e:admin
    }
    "4" {
        Write-Host "Starting debug mode..." -ForegroundColor Green
        npm run test:e2e:admin:debug
    }
    "5" {
        Write-Host "Running focused tests..." -ForegroundColor Green
        npx playwright test e2e/admin-components-focused.spec.ts --config=e2e/playwright.admin.config.ts --ui
    }
    "6" {
        Write-Host "Opening test report..." -ForegroundColor Green
        npm run test:e2e:admin:report
    }
    default {
        Write-Host "Invalid choice. Running UI mode by default..." -ForegroundColor Yellow
        npm run test:e2e:admin:ui
    }
}

Write-Host ""
Write-Host "=== Test Information ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Coverage Target: Admin components (currently 0% coverage)" -ForegroundColor White
Write-Host "🎯 Components Tested:" -ForegroundColor White
Write-Host "   - AdminAuthWrapper (Authentication & Authorization)" -ForegroundColor Gray
Write-Host "   - AdminLayout (Navigation & Layout)" -ForegroundColor Gray
Write-Host "   - AdminDashboardPage (Statistics & Quick Actions)" -ForegroundColor Gray
Write-Host "   - UserManagementPage (User CRUD Operations)" -ForegroundColor Gray
Write-Host "   - UserCreateModal (User Creation & Validation)" -ForegroundColor Gray
Write-Host "   - UserEditModal (User Editing)" -ForegroundColor Gray
Write-Host "   - AdminSettingsPage (System Configuration)" -ForegroundColor Gray
Write-Host "   - SecurityLogsPage (Audit Logs & Filtering)" -ForegroundColor Gray
Write-Host ""
Write-Host "📁 Test Files:" -ForegroundColor White
Write-Host "   - e2e/admin-components.spec.ts (Comprehensive tests)" -ForegroundColor Gray
Write-Host "   - e2e/admin-components-focused.spec.ts (Edge cases)" -ForegroundColor Gray
Write-Host "   - e2e/helpers/admin-test-helpers.ts (Utilities)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor White
Write-Host "   1. Review test results in the UI" -ForegroundColor Gray
Write-Host "   2. Fix any failing tests" -ForegroundColor Gray  
Write-Host "   3. Add tests for new admin components" -ForegroundColor Gray
Write-Host "   4. Integrate with CI/CD pipeline" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentation: e2e/README.md" -ForegroundColor White
Write-Host ""
