# MCP Troubleshooting and Testing Script
# This script helps diagnose and fix MCP server issues

Write-Host "=== MCP Troubleshooting Script ===" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Check npm and node versions
Write-Host "=== System Information ===" -ForegroundColor Yellow
Write-Host "Node.js version: $((node --version) 2>$null)" -ForegroundColor White
Write-Host "npm version: $((npm --version) 2>$null)" -ForegroundColor White
Write-Host ""

# Clear npm cache
Write-Host "=== Clearing npm cache ===" -ForegroundColor Yellow
try {
    npm cache clean --force 2>$null
    Write-Host "[OK] npm cache cleared successfully" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to clear npm cache" -ForegroundColor Red
}
Write-Host ""

# Check for existing MCP installations
Write-Host "=== Checking existing MCP server installations ===" -ForegroundColor Yellow
$mcpServers = @(
    "@cyanheads/filesystem-mcp-server",
    "@executeautomation/playwright-mcp-server",
    "@playwright/mcp"
)

foreach ($server in $mcpServers) {
    try {
        $version = (npm list -g $server --depth=0 2>$null | Select-String $server)
        if ($version) {
            Write-Host "[OK] $server is installed: $version" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] $server is not installed" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] $server is not installed" -ForegroundColor Red
    }
}
Write-Host ""

# Test filesystem MCP server
Write-Host "=== Testing Filesystem MCP Server ===" -ForegroundColor Yellow
try {    $filesystemTest = (npx @cyanheads/filesystem-mcp-server --help 2>$null)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Filesystem MCP server is working" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Filesystem MCP server has issues" -ForegroundColor Red
    }
}
catch {
    Write-Host "[ERROR] Filesystem MCP server failed to run" -ForegroundColor Red
    Write-Host "Installing filesystem MCP server..." -ForegroundColor Cyan
    try {
        npm install -g @cyanheads/filesystem-mcp-server --force
        Write-Host "[OK] Filesystem MCP server installed" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to install filesystem MCP server" -ForegroundColor Red
    }
}
Write-Host ""

# Check VS Code MCP extension
Write-Host "=== Checking VS Code MCP extension ===" -ForegroundColor Yellow
if (Get-Command code -ErrorAction SilentlyContinue) {
    try {
        $extensions = (code --list-extensions 2>$null)
        if ($extensions -like "*copilot-mcp*") {
            Write-Host "[OK] Copilot MCP Search extension is installed" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] Copilot MCP Search extension is not installed" -ForegroundColor Red
            Write-Host "Installing Copilot MCP Search extension..." -ForegroundColor Cyan
            code --install-extension vikashloomba.copilot-mcp-search
        }
    }
    catch {
        Write-Host "[WARNING] Could not check VS Code extensions" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] VS Code CLI not available" -ForegroundColor Yellow
}
Write-Host ""

# Recommendations
Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start with just the Filesystem MCP server (most reliable)" -ForegroundColor White
Write-Host "2. Restart VS Code after making configuration changes" -ForegroundColor White
Write-Host "3. Check VS Code Output panel for MCP server logs" -ForegroundColor White
Write-Host "4. If Playwright MCP fails, you can add it later manually" -ForegroundColor White
Write-Host ""

# Minimal working configuration
Write-Host "=== Minimal Working MCP Configuration ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add this to your VS Code settings.json:" -ForegroundColor Gray

$minimalConfig = @'
{
  "chat.agent.enabled": true,
  "chat.mcp.enabled": true,
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["@cyanheads/filesystem-mcp-server"],
        "env": {
          "ALLOWED_DIRECTORIES": "./src,./docs,./backend,./frontend"
        }
      }
    }
  }
}
'@

Write-Host $minimalConfig -ForegroundColor White

Write-Host ""
Write-Host "=== Troubleshooting complete! ===" -ForegroundColor Green
Write-Host "If you're still having issues, try restarting VS Code and testing with just the filesystem server first." -ForegroundColor Cyan
