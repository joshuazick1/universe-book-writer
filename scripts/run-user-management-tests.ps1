# User Management E2E Test Runner (PowerShell)
# Runs user management tests with proper setup and environment checks

param(
    [string]$TestPattern = "user-management-*.spec.ts",
    [switch]$Debug,
    [switch]$Headed,
    [switch]$Verbose,
    [switch]$Help
)

# Display help
if ($Help) {
    Write-Host "🎭 User Management E2E Test Runner" -ForegroundColor Cyan
    Write-Host "===================================="
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\run-user-management-tests.ps1 [options]"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -TestPattern <pattern>   Test file pattern (default: user-management-*.spec.ts)"
    Write-Host "  -Debug                   Run tests in debug mode"
    Write-Host "  -Headed                  Run tests in headed mode (show browser)"
    Write-Host "  -Verbose                 Use verbose reporter"
    Write-Host "  -Help                    Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\scripts\run-user-management-tests.ps1"
    Write-Host "  .\scripts\run-user-management-tests.ps1 -Headed -Verbose"
    Write-Host "  .\scripts\run-user-management-tests.ps1 -TestPattern 'user-management-core.spec.ts'"
    exit 0
}

Write-Host "🎭 User Management E2E Test Runner" -ForegroundColor Cyan
Write-Host "====================================="

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "💡 Make sure you are in the project root directory" -ForegroundColor Yellow
    exit 1
}

# Check if config file exists
$configFile = "playwright.user-management.config.ts"
if (-not (Test-Path $configFile)) {
    Write-Host "❌ Error: Config file not found: $configFile" -ForegroundColor Red
    Write-Host "💡 Make sure the config file exists in the project root" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Project Root: $PWD" -ForegroundColor Gray
Write-Host "⚙️  Config File: $configFile" -ForegroundColor Gray
Write-Host "🎯 Test Pattern: $TestPattern" -ForegroundColor Gray
Write-Host ""

# Build Playwright command arguments
$playwrightArgs = @(
    "test",
    "--config", $configFile,
    $TestPattern
)

if ($Debug) {
    $playwrightArgs += "--debug"
}

if ($Headed) {
    $playwrightArgs += "--headed"
}

if ($Verbose) {
    $playwrightArgs += "--reporter=verbose"
}

# Check if frontend and backend are running
Write-Host "🔍 Checking services..." -ForegroundColor Blue

# Check frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method Head -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend is running (http://localhost:5173)" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Frontend may not be running (http://localhost:5173)" -ForegroundColor Yellow
    Write-Host "💡 Start frontend: cd frontend && npm run dev" -ForegroundColor Gray
}

# Check backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Head -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is running (http://localhost:5000)" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Backend may not be running (http://localhost:5000)" -ForegroundColor Yellow
    Write-Host "💡 Start backend: cd backend && npm run dev" -ForegroundColor Gray
}

Write-Host ""

# Run Playwright tests
Write-Host "🚀 Starting Playwright tests..." -ForegroundColor Blue
Write-Host "📝 Command: npx playwright $($playwrightArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

try {
    & npx playwright @playwrightArgs
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Tests completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Reports available:" -ForegroundColor Blue
        Write-Host "   • HTML Report: playwright-report/index.html" -ForegroundColor Gray
        Write-Host "   • JSON Results: test-results/user-management-results.json" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 To view HTML report:" -ForegroundColor Yellow
        Write-Host "   npx playwright show-report" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ Tests failed with exit code: $exitCode" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
        Write-Host "   • Check that frontend and backend are running" -ForegroundColor Gray
        Write-Host "   • Verify admin user exists with credentials: admin@test.com" -ForegroundColor Gray
        Write-Host "   • Check browser console and network tabs for errors" -ForegroundColor Gray
        Write-Host "   • Review HTML report for detailed failure information" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 View detailed report:" -ForegroundColor Yellow
        Write-Host "   npx playwright show-report" -ForegroundColor Gray
    }
    
    exit $exitCode
    
}
catch {
    Write-Host "❌ Failed to run Playwright tests: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Possible solutions:" -ForegroundColor Yellow
    Write-Host "   • Install Playwright: npm install @playwright/test" -ForegroundColor Gray
    Write-Host "   • Install browsers: npx playwright install" -ForegroundColor Gray
    Write-Host "   • Check that you have Node.js installed" -ForegroundColor Gray
    Write-Host "   • Verify you are in the correct directory" -ForegroundColor Gray
    
    exit 1
}
