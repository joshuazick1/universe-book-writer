# PowerShell Script to Remove Defunct Queue System Files
# This script removes old queue system files and backs them up first

Write-Host "🧹 Starting cleanup of defunct queue system files..." -ForegroundColor Green

# Define the base path
$BasePath = "C:\Users\jzick\Universe_Book_Writer\ai-server"
$BackupPath = "$BasePath\backup-old-queue-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Create backup directory
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "📁 Created backup directory: $BackupPath" -ForegroundColor Yellow
}

# List of defunct files to remove
$DefunctFiles = @(
    "src\queueSystem.ts",
    "src\queue-integration.ts", 
    "src\services\queue-system.factory.ts",
    "src\services\queue-system-examples.ts",
    "benchmarking\orchestrateEnhancedBenchmarks.ts",
    "benchmarking\queueWorker.ts",
    "src\controllers\benchmarkManualController.ts"
)

# List of defunct directories to remove (if empty after file removal)
$DefunctDirectories = @(
    "benchmarking\db",
    "benchmarking\benchmarks"
)

Write-Host "📋 Files to be removed:" -ForegroundColor Cyan
foreach ($file in $DefunctFiles) {
    $fullPath = Join-Path $BasePath $file
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ $file (not found)" -ForegroundColor Red
    }
}

# Ask for confirmation
$confirmation = Read-Host "`n🔍 Do you want to proceed with removal? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled by user." -ForegroundColor Red
    exit 0
}

Write-Host "`n🚀 Starting file removal process..." -ForegroundColor Green

# Backup and remove files
foreach ($file in $DefunctFiles) {
    $fullPath = Join-Path $BasePath $file
    $backupFile = Join-Path $BackupPath $file
    
    if (Test-Path $fullPath) {
        try {
            # Create backup directory structure
            $backupDir = Split-Path $backupFile -Parent
            if (!(Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            }
            
            # Backup the file
            Copy-Item $fullPath $backupFile -Force
            Write-Host "💾 Backed up: $file" -ForegroundColor Blue
            
            # Remove the original file
            Remove-Item $fullPath -Force
            Write-Host "🗑️  Removed: $file" -ForegroundColor Yellow
        }
        catch {
            Write-Host "❌ Failed to process $file`: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  File not found: $file" -ForegroundColor DarkYellow
    }
}

# Remove empty directories
Write-Host "`n🧹 Checking for empty directories..." -ForegroundColor Green
foreach ($dir in $DefunctDirectories) {
    $fullPath = Join-Path $BasePath $dir
    if (Test-Path $fullPath) {
        $items = Get-ChildItem $fullPath -Recurse
        if ($items.Count -eq 0) {
            try {
                Remove-Item $fullPath -Force -Recurse
                Write-Host "🗂️  Removed empty directory: $dir" -ForegroundColor Yellow
            }
            catch {
                Write-Host "❌ Failed to remove directory $dir`: $_" -ForegroundColor Red
            }
        }
        else {
            Write-Host "📁 Directory not empty, keeping: $dir" -ForegroundColor Cyan
        }
    }
}

Write-Host "`n✅ Cleanup completed!" -ForegroundColor Green
Write-Host "📦 Backup location: $BackupPath" -ForegroundColor Cyan
Write-Host "`n📋 Summary of actions:" -ForegroundColor White
Write-Host "  • Old queue system files backed up and removed" -ForegroundColor Gray
Write-Host "  • Orchestrator.ts updated to remove old queue dependencies" -ForegroundColor Gray  
Write-Host "  • App.ts updated to remove queue integration" -ForegroundColor Gray
Write-Host "  • New queue system services are ready for implementation" -ForegroundColor Gray

Write-Host "`n🎯 Next steps:" -ForegroundColor Green
Write-Host "  1. Complete implementation of new queue services" -ForegroundColor White
Write-Host "  2. Wire new UniversalQueueService into routes" -ForegroundColor White
Write-Host "  3. Test API compatibility" -ForegroundColor White
Write-Host "  4. Run: npm run build" -ForegroundColor White

# Optional: Show disk space saved
try {
    $backupSize = (Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($backupSize / 1MB, 2)
    Write-Host "`n💾 Backup size: $sizeMB MB" -ForegroundColor Cyan
}
catch {
    # Ignore if we can't calculate size
}

Write-Host "`n🎉 Old queue system successfully removed!" -ForegroundColor Green
