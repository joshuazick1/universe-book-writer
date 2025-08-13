# Comprehensive Multi-Model Benchmark Script
# Tests all specified models with all available benchmark types

# Configuration
$serverUrl = "http://209.145.63.44:11434"
$aiServerEndpoint = "http://localhost:5100/api/manual/benchmark"

# All models to test
$models = @(
    "mistral:latest",
    "mattw/pygmalion:latest",
    "llama3.2:latest",
    "mario:latest",
    "llama3.1:8b",
    "phi3:mini",
    "deepseek-coder:1.3b",
    "neural-chat:latest"
)

# All available benchmark types (matching actual exported functions)
$benchmarkTypes = @(
    # Core Content Generation Benchmarks
    "style-transfer",           # evaluateStyleTransfer 
    "advanced-code-generation", # evaluateAdvancedCodeGeneration
    "node-graph-construction",  # evaluateNodeGraphConstruction
    "long-form-generation",     # evaluateLongFormGeneration
    "permissive-content",       # evaluatePermissiveContent
    "dialogue-generation",      # evaluateDialogueGeneration
    "fact-extraction",          # evaluateFactExtraction
    "summarization",            # evaluateSummarization
    "content-moderation",       # evaluateContentModeration
    
    # Book Writing Specific Benchmarks
    "character-consistency",    # evaluateCharacterConsistency
    "plot-coherence",          # evaluatePlotCoherence
    "world-building",          # evaluateWorldBuilding
    
    # Technical Evaluation Benchmarks (existing)
    "json-assembly",           # evaluateJSONAssembly
    "task-planning",           # evaluateTaskPlanning
    "creative-writing",        # evaluateCreativeWriting
    "typescript-quality"       # evaluateTypescriptQuality
)

Write-Host "Starting comprehensive benchmark of $($models.Count) models with $($benchmarkTypes.Count) benchmark types" -ForegroundColor Green
Write-Host "Total benchmark jobs: $($models.Count * $benchmarkTypes.Count)" -ForegroundColor Yellow
Write-Host "Estimated time: ~$(($models.Count * $benchmarkTypes.Count * 2) / 60) minutes" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0
$startTime = Get-Date

foreach ($model in $models) {
    Write-Host "Testing model: $model" -ForegroundColor Magenta
    
    # Create request body
    $requestBody = @{
        serverIdOrUrl  = $serverUrl
        modelId        = $model
        benchmarkTypes = $benchmarkTypes
    } | ConvertTo-Json -Depth 10
    
    try {
        Write-Host "   Submitting $($benchmarkTypes.Count) benchmark types..." -ForegroundColor White
        
        $response = Invoke-WebRequest -Uri $aiServerEndpoint -Method POST -Body $requestBody -ContentType 'application/json' -TimeoutSec 300
        
        if ($response.StatusCode -eq 200) {
            $result = $response.Content | ConvertFrom-Json
            Write-Host "   SUCCESS: $model benchmarks queued" -ForegroundColor Green
            
            # Show benchmark scores if available
            if ($result.results -and $result.results.benchmarks) {
                $benchmarks = $result.results.benchmarks
                $scores = @()
                foreach ($prop in $benchmarks.PSObject.Properties) {
                    if ($prop.Value -and $prop.Value.score) {
                        $scores += "$($prop.Name): $($prop.Value.score)"
                    }
                }
                if ($scores.Count -gt 0) {
                    Write-Host "   Sample scores: $($scores[0..2] -join ', ')..." -ForegroundColor Cyan
                }
            }
            
            $successCount++
        }
        else {
            Write-Host "   FAILED: $model (Status: $($response.StatusCode))" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        Write-Host "   ERROR: $model - $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    # Small delay between models to avoid overwhelming the server
    Start-Sleep -Seconds 2
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "Benchmark Summary:" -ForegroundColor Green
Write-Host "   Successful models: $successCount" -ForegroundColor Green
Write-Host "   Failed models: $failCount" -ForegroundColor Red
Write-Host "   Total time: $($duration.ToString('mm\:ss'))" -ForegroundColor Cyan
Write-Host "   Total benchmark jobs queued: $($successCount * $benchmarkTypes.Count)" -ForegroundColor Yellow

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "Monitor progress with:" -ForegroundColor Blue
    Write-Host "   Get-Content 'ai-server\logs\ai-server-2025-08-05.log' -Wait -Tail 20" -ForegroundColor White
    Write-Host "   Get-Content 'ai-server\logs\servers\159.89.92.29_11434-2025-08-05.log' -Wait -Tail 20" -ForegroundColor White
}
