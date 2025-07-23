# Enhanced Test Runner PowerShell Script
# Usage: .\run-tests.ps1 [target] [options]
# Examples:
#   .\run-tests.ps1 -All
#   .\run-tests.ps1 -Backend -Pattern "auth"
#   .\run-tests.ps1 -Frontend -Comment "Testing new UI components"

param(
    [switch]$All,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$AiServer,
    [switch]$CollaborationServer,
    [switch]$Packages,
    [switch]$E2E,
    [string]$Pattern = "",
    [string]$Comment = "",
    [switch]$Coverage,
    [switch]$Watch,
    [switch]$Verbose,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host "Enhanced Test Runner PowerShell Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\run-tests.ps1 [target] [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Targets:" -ForegroundColor Green
    Write-Host "  -All                    Run all tests (default)"
    Write-Host "  -Backend               Run backend tests only"
    Write-Host "  -Frontend              Run frontend tests only"
    Write-Host "  -AiServer              Run AI server tests only"
    Write-Host "  -CollaborationServer   Run collaboration server tests only"
    Write-Host "  -Packages              Run package tests only"
    Write-Host "  -E2E                   Run end-to-end tests only"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Green
    Write-Host "  -Pattern <text>        Run tests matching pattern"
    Write-Host "  -Comment <text>        Add a comment to the test run"
    Write-Host "  -Coverage             Generate coverage report"
    Write-Host "  -Watch                Run tests in watch mode"
    Write-Host "  -Verbose              Verbose output"
    Write-Host "  -Help                 Show this help"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\run-tests.ps1 -All"
    Write-Host "  .\run-tests.ps1 -Backend -Pattern 'auth'"
    Write-Host "  .\run-tests.ps1 -Frontend -Comment 'Testing new UI components'"
    Write-Host "  .\run-tests.ps1 -Coverage"
    exit 0
}

# Determine target
$target = "all"
if ($Backend) { $target = "backend" }
elseif ($Frontend) { $target = "frontend" }
elseif ($AiServer) { $target = "ai-server" }
elseif ($CollaborationServer) { $target = "collaboration-server" }
elseif ($Packages) { $target = "packages" }
elseif ($E2E) { $target = "e2e" }

# Build command arguments
$testArgs = @()
$testArgs += $target

if ($Pattern) {
    $testArgs += "--pattern"
    $testArgs += $Pattern
}

if ($Comment) {
    $testArgs += "--comment"  
    $testArgs += $Comment
}

if ($Coverage) {
    $testArgs += "--coverage"
}

if ($Watch) {
    $testArgs += "--watch"
}

if ($Verbose) {
    $testArgs += "--verbose"
}

# Display what we're about to run
Write-Host "🚀 Enhanced Test Runner" -ForegroundColor Cyan
Write-Host "Target: $target" -ForegroundColor Yellow
if ($Pattern) { Write-Host "Pattern: $Pattern" -ForegroundColor Yellow }
if ($Comment) { Write-Host "Comment: $Comment" -ForegroundColor Yellow }
Write-Host ""

# Run the test command
try {
    $commandArgs = @("scripts/run-tests-with-output.js") + $testArgs
    & node $commandArgs
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Tests completed with errors (exit code: $exitCode)" -ForegroundColor Red
    }
    
    exit $exitCode
} catch {
    Write-Host "❌ Failed to run tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
