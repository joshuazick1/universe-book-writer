# PowerShell script to clean up TypeScript build artifacts
# Removes .d.ts.map and .js.map files

Write-Host "Starting build artifacts cleanup..." -ForegroundColor Green

# Define the file patterns to clean
$patterns = @("*.d.ts.map", "*.js.map")

# Define directories to clean
$directories = @(
    ".",
    "ai-server",
    "backend",
    "frontend", 
    "packages\core",
    "packages\plugin-sdk",
    "packages\ui-core"
)

$totalRemoved = 0

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "Cleaning directory: $directory" -ForegroundColor Cyan
        
        foreach ($pattern in $patterns) {
            $files = Get-ChildItem -Path $directory -Filter $pattern -Recurse -File
            
            if ($files.Count -gt 0) {
                Write-Host "  Found $($files.Count) $pattern files" -ForegroundColor Yellow
                
                foreach ($file in $files) {
                    try {
                        Remove-Item $file.FullName -Force
                        Write-Host "    Removed: $($file.Name)" -ForegroundColor Gray
                        $totalRemoved++
                    }
                    catch {
                        Write-Host "    Failed to remove: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
            }
        }
    }
    else {
        Write-Host "Directory not found: $directory" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Cleanup complete! Removed $totalRemoved build artifact files." -ForegroundColor Green

# Also clean up any additional build artifacts in the root
Write-Host ""
Write-Host "Checking for additional build artifacts in root..." -ForegroundColor Cyan

$rootArtifacts = @(
    "jest.setup.js",
    "jest.setup.js.map", 
    "jest.setup.d.ts.map",
    "tsconfig.tsbuildinfo"
)

foreach ($artifact in $rootArtifacts) {
    if (Test-Path $artifact) {
        try {
            Remove-Item $artifact -Force
            Write-Host "  Removed root artifact: $artifact" -ForegroundColor Gray
            $totalRemoved++
        }
        catch {
            Write-Host "  Failed to remove: $artifact - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Final cleanup complete! Total files removed: $totalRemoved" -ForegroundColor Green
Write-Host "These files will be regenerated when you build the project." -ForegroundColor Blue
