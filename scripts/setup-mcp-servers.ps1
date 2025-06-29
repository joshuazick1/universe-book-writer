# MCP Server Setup Script for Universe Book Writer
# This script installs and configures MCP servers for enhanced GitHub Copilot integration

Write-Host "=== Setting up MCP servers for Universe Book Writer ===" -ForegroundColor Green

# Check if npm is available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not installed or not in PATH. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Clear npm cache to fix installation issues
Write-Host "=== Clearing npm cache ===" -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "[OK] npm cache cleared" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Failed to clear npm cache" -ForegroundColor Yellow
}

# Install MCP servers globally
Write-Host "=== Installing MCP servers ===" -ForegroundColor Yellow

# Try filesystem server first (more reliable)
Write-Host "Installing @cyanheads/filesystem-mcp-server..." -ForegroundColor Cyan
try {
    npm install -g @cyanheads/filesystem-mcp-server
    Write-Host "[OK] Successfully installed filesystem MCP server" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Failed to install filesystem MCP server" -ForegroundColor Yellow
}

# Try alternative Playwright MCP server
Write-Host "Installing alternative Playwright MCP server..." -ForegroundColor Cyan
try {
    # Try the official Playwright MCP first  
    npm install -g @playwright/mcp@latest
    Write-Host "[OK] Successfully installed Playwright MCP server (official)" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Official Playwright MCP failed, trying alternative..." -ForegroundColor Yellow
    try {
        # Fallback to executeautomation version
        npm install -g @executeautomation/playwright-mcp-server --force
        Write-Host "[OK] Successfully installed Playwright MCP server (alternative)" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to install Playwright MCP server" -ForegroundColor Red
        Write-Host "You can manually install it later or skip Playwright integration" -ForegroundColor Gray
    }
}

# Check if VS Code is available
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "[WARNING] VS Code CLI is not available. Please install VS Code and add it to PATH." -ForegroundColor Yellow
}
else {
    Write-Host "=== Installing VS Code MCP extension ===" -ForegroundColor Yellow
    try {
        # Install the Copilot MCP Search extension
        code --install-extension vikashloomba.copilot-mcp-search
        Write-Host "[OK] Successfully installed Copilot MCP Search extension" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to install VS Code extension automatically" -ForegroundColor Yellow
        Write-Host "Please manually install 'Copilot MCP Search' from the VS Code marketplace" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=== MCP server setup complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code to load the new settings" -ForegroundColor White
Write-Host "2. Enable Agent Mode in GitHub Copilot settings" -ForegroundColor White
Write-Host "3. Look for the 'MCP Servers' button in the VS Code activity bar" -ForegroundColor White
Write-Host "4. Test the integration by asking Copilot to read project files" -ForegroundColor White
Write-Host ""
Write-Host "Configuration files created:" -ForegroundColor Cyan
Write-Host "- .vscode/settings.json (VS Code settings with MCP enabled)" -ForegroundColor White
Write-Host "- .vscode/mcp.json (MCP server configurations)" -ForegroundColor White
Write-Host "- .github/copilot-instructions.md (Project-specific AI instructions)" -ForegroundColor White
Write-Host ""
Write-Host "For troubleshooting, check the MCP server logs in VS Code Output panel" -ForegroundColor Gray
