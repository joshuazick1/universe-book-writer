# Test Playwright MCP Server
# This script helps test the Playwright MCP server integration

Write-Host "🎭 Testing Playwright MCP Server Integration..." -ForegroundColor Green

# Check if Playwright MCP server is installed
Write-Host "📦 Checking Playwright MCP installation..." -ForegroundColor Yellow

try {
    $result = npm list -g @executeautomation/playwright-mcp-server 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Playwright MCP server is installed globally" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Playwright MCP server not found. Installing..." -ForegroundColor Yellow
        npm install -g @executeautomation/playwright-mcp-server
    }
} catch {
    Write-Host "❌ Error checking Playwright MCP installation" -ForegroundColor Red
}

# Test VS Code MCP integration
Write-Host "🔍 Testing VS Code MCP integration..." -ForegroundColor Yellow

if (Test-Path ".vscode/settings.json") {
    $settings = Get-Content ".vscode/settings.json" -Raw | ConvertFrom-Json
    if ($settings.mcp.servers.playwright) {
        Write-Host "✅ Playwright MCP server configured in VS Code settings" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Playwright MCP server not found in VS Code settings" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ VS Code settings.json not found" -ForegroundColor Red
}

# Check if Playwright is installed in the project
Write-Host "🔍 Checking project Playwright installation..." -ForegroundColor Yellow

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $hasPlaywright = $false
    
    if ($packageJson.dependencies -and $packageJson.dependencies.playwright) {
        $hasPlaywright = $true
    }
    if ($packageJson.devDependencies -and $packageJson.devDependencies.playwright) {
        $hasPlaywright = $true
    }
    if ($packageJson.dependencies -and $packageJson.dependencies.'@playwright/test') {
        $hasPlaywright = $true
    }
    if ($packageJson.devDependencies -and $packageJson.devDependencies.'@playwright/test') {
        $hasPlaywright = $true
    }
    
    if ($hasPlaywright) {
        Write-Host "✅ Playwright is installed in the project" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Playwright not found in project dependencies" -ForegroundColor Yellow
        Write-Host "   Consider installing: npm install -D @playwright/test" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ package.json not found in current directory" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎭 Playwright MCP Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To test the integration:" -ForegroundColor Yellow
Write-Host "1. Open VS Code in this project directory" -ForegroundColor White
Write-Host "2. Enable Agent Mode in GitHub Copilot" -ForegroundColor White
Write-Host "3. Try asking Copilot: '@copilot Can you use Playwright MCP to analyze our frontend?'" -ForegroundColor White
Write-Host "4. Look for MCP server indicators in the Copilot chat panel" -ForegroundColor White
Write-Host ""
Write-Host "For direct testing, check the Playwright MCP server documentation:" -ForegroundColor Cyan
Write-Host "https://github.com/executeautomation/playwright-mcp-server" -ForegroundColor Gray
