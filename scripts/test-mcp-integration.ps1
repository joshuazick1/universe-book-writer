# MCP Integration Test Script
# This script tests MCP server functionality and VS Code integration

Write-Host "=== MCP Integration Test ===" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Test 1: Verify MCP servers are installed
Write-Host "=== Test 1: Checking MCP Server Installations ===" -ForegroundColor Yellow
$mcpServers = @{
    "filesystem" = "@cyanheads/filesystem-mcp-server"
    "playwright" = "@playwright/mcp"
}

$allInstalled = $true
foreach ($server in $mcpServers.GetEnumerator()) {
    try {
        $version = (npm list -g $server.Value --depth=0 2>$null | Select-String $server.Value)
        if ($version) {
            Write-Host "[OK] $($server.Key): $version" -ForegroundColor Green
        }
        else {
            Write-Host "[MISSING] $($server.Key): Not installed" -ForegroundColor Red
            $allInstalled = $false
        }
    }
    catch {
        Write-Host "[ERROR] $($server.Key): Failed to check" -ForegroundColor Red
        $allInstalled = $false
    }
}

if ($allInstalled) {
    Write-Host "[PASS] All MCP servers are installed" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Some MCP servers are missing" -ForegroundColor Red
}
Write-Host ""

# Test 2: Test filesystem MCP server directly
Write-Host "=== Test 2: Testing Filesystem MCP Server ===" -ForegroundColor Yellow
try {
    # Test if the server can be invoked
    $filesystemTest = (npx @cyanheads/filesystem-mcp-server --version 2>$null)
    if ($LASTEXITCODE -eq 0 -or $filesystemTest) {
        Write-Host "[PASS] Filesystem MCP server responds" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] Filesystem MCP server not responding" -ForegroundColor Red
    }
}
catch {
    Write-Host "[FAIL] Filesystem MCP server error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Test Playwright MCP server directly  
Write-Host "=== Test 3: Testing Playwright MCP Server ===" -ForegroundColor Yellow
try {
    # Test if the server can be invoked
    $playwrightTest = (npx @playwright/mcp --version 2>$null)
    if ($LASTEXITCODE -eq 0 -or $playwrightTest) {
        Write-Host "[PASS] Playwright MCP server responds" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] Playwright MCP server not responding" -ForegroundColor Red
    }
}
catch {
    Write-Host "[FAIL] Playwright MCP server error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check VS Code settings
Write-Host "=== Test 4: Checking VS Code MCP Configuration ===" -ForegroundColor Yellow
$settingsPath = ".vscode\settings.json"
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
        
        # Check if MCP is enabled
        if ($settings.'chat.mcp.enabled' -eq $true) {
            Write-Host "[PASS] MCP is enabled in VS Code settings" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] MCP is not enabled in VS Code settings" -ForegroundColor Red
        }
        
        # Check if Agent mode is enabled
        if ($settings.'chat.agent.enabled' -eq $true) {
            Write-Host "[PASS] Agent mode is enabled in VS Code settings" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] Agent mode is not enabled in VS Code settings" -ForegroundColor Red
        }
        
        # Check if servers are configured
        if ($settings.mcp -and $settings.mcp.servers) {
            $serverCount = ($settings.mcp.servers | Get-Member -MemberType NoteProperty).Count
            Write-Host "[PASS] $serverCount MCP servers configured in VS Code" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] No MCP servers configured in VS Code settings" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] Failed to parse VS Code settings: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "[FAIL] VS Code settings file not found" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check if VS Code is running with MCP support
Write-Host "=== Test 5: VS Code Process Check ===" -ForegroundColor Yellow
$vscodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
if ($vscodeProcesses) {
    Write-Host "[INFO] VS Code is currently running ($($vscodeProcesses.Count) process(es))" -ForegroundColor Cyan
    Write-Host "[INFO] You may need to restart VS Code to load MCP changes" -ForegroundColor Yellow
}
else {
    Write-Host "[INFO] VS Code is not currently running" -ForegroundColor Cyan
}
Write-Host ""

# Test 6: Create test files for MCP to interact with
Write-Host "=== Test 6: Creating Test Files for MCP ===" -ForegroundColor Yellow
$testDir = "test-mcp-files"
try {
    if (-not (Test-Path $testDir)) {
        New-Item -ItemType Directory -Path $testDir -Force | Out-Null
    }
    
    # Create a test JavaScript file
    @"
// Test file for MCP integration
const message = "Hello from MCP test!";
console.log(message);

function testFunction() {
    return "MCP can read this function";
}

module.exports = { testFunction };
"@ | Out-File -FilePath "$testDir\test-script.js" -Encoding UTF8
    
    # Create a test README
    @"
# MCP Test Files

This directory contains test files for MCP integration testing.

## Files:
- test-script.js: Sample JavaScript file
- README.md: This documentation file

## Usage:
These files can be used to test if MCP servers can properly read and analyze project files.
"@ | Out-File -FilePath "$testDir\README.md" -Encoding UTF8
    
    Write-Host "[PASS] Test files created in $testDir/" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Failed to create test files: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary and next steps
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Manual Testing Steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code if it's currently running" -ForegroundColor White
Write-Host "2. Open this project in VS Code" -ForegroundColor White
Write-Host "3. Enable GitHub Copilot Agent Mode:" -ForegroundColor White
Write-Host "   - Open Command Palette (Ctrl+Shift+P)" -ForegroundColor Gray
Write-Host "   - Search for 'GitHub Copilot: Toggle Agent Mode'" -ForegroundColor Gray
Write-Host "   - Enable it if not already enabled" -ForegroundColor Gray
Write-Host "4. Test MCP functionality:" -ForegroundColor White
Write-Host "   - Ask Copilot: 'Can you read the README.md file?'" -ForegroundColor Gray
Write-Host "   - Ask Copilot: 'What files are in the test-mcp-files directory?'" -ForegroundColor Gray
Write-Host "   - Ask Copilot: 'Can you analyze the test-script.js file?'" -ForegroundColor Gray
Write-Host "5. Check for MCP logs:" -ForegroundColor White
Write-Host "   - Open Output panel (View > Output)" -ForegroundColor Gray
Write-Host "   - Select 'MCP' from the dropdown" -ForegroundColor Gray
Write-Host "   - Look for server connection logs" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected Results:" -ForegroundColor Yellow
Write-Host "- Copilot should be able to read and analyze files" -ForegroundColor White
Write-Host "- MCP servers should appear in the Output panel" -ForegroundColor White
Write-Host "- No error messages in the MCP logs" -ForegroundColor White
Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green
