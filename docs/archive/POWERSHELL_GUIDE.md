# PowerShell Development Guide

This guide provides common PowerShell commands and patterns used in the development of the Multi-Universe Book Series Writing Assistant.

## Common Commands

### Project Setup

```powershell
# Enable script execution for current session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Navigate to project directory
Set-Location -Path $env:USERPROFILE\verseforge

# Install dependencies across all workspaces
npm install
```

### Development Server

```powershell
# Start frontend development server
Set-Location -Path frontend
npm run dev

# Start backend server (in new terminal)
Set-Location -Path backend
npm run dev

# Start AI server (in new terminal)
Set-Location -Path ai-server
npm run dev
```

### Testing

```powershell
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test-file.test.ts
```

### Database Operations

```powershell
# Start MongoDB
mongod --dbpath ./data/db

# Start Redis
redis-server
```

### Build Commands

```powershell
# Build all packages
npm run build --workspaces

# Build specific package
npm run build --workspace=packages/core
```

## Command Chaining

In PowerShell, use semicolons (;) instead of && for command chaining:

```powershell
Set-Location -Path frontend; npm install; npm run dev
```

## Environment Variables

```powershell
# Set environment variable
$env:NODE_ENV = "development"

# List all environment variables
Get-ChildItem Env:

# Remove environment variable
Remove-Item Env:NODE_ENV
```

## Useful Scripts

### Health Check

```powershell
function Test-ServiceHealth {
    param (
        [string]$ServiceName,
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method HEAD -UseBasicParsing
        Write-Host "$ServiceName is running (Status: $($response.StatusCode))"
    }
    catch {
        Write-Host "$ServiceName is not responding"
    }
}

# Check frontend
Test-ServiceHealth -ServiceName "Frontend" -Url "http://localhost:5173"

# Check backend
Test-ServiceHealth -ServiceName "Backend" -Url "http://localhost:5000/api/health"
```

### Workspace Navigation

```powershell
function Set-ProjectLocation {
    param (
        [Parameter(Mandatory=$true)]
        [ValidateSet("frontend", "backend", "ai-server", "packages")]
        [string]$Workspace
    )

    Set-Location -Path "$env:USERPROFILE\verseforge\$Workspace"
}

# Usage
Set-ProjectLocation -Workspace "frontend"
```

## Best Practices

1. **Script Execution Policy**

   - Always use `-Scope Process` for temporary execution policy changes
   - Avoid changing machine-wide policies

2. **Error Handling**

   - Use try/catch blocks for error-prone operations
   - Provide meaningful error messages

3. **Path Handling**

   - Use `Join-Path` for path concatenation
   - Always use relative paths from project root

4. **Environment Management**

   - Use .env files for environment variables
   - Don't commit sensitive information

5. **Performance**
   - Use background jobs for long-running tasks
   - Cleanup resources after use
