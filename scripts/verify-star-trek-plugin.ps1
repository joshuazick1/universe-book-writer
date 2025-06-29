# Star Trek Plugin Verification Script
# Tests the modular component system through real API calls

Write-Host "🚀 Starting Star Trek Plugin Verification" -ForegroundColor Green
Write-Host "=" * 50

# Test 1: Check if the backend is running
Write-Host "`n🔍 Test 1: Checking Backend Status..." -ForegroundColor Yellow

try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on port 5000" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Backend responded with status: $($backendResponse.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check if the frontend is running
Write-Host "`n🔍 Test 2: Checking Frontend Status..." -ForegroundColor Yellow

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173/" -Method HEAD -UseBasicParsing -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend is running on port 5173" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Frontend responded with status: $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Frontend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check plugin registration
Write-Host "`n🔍 Test 3: Checking Plugin Registration..." -ForegroundColor Yellow

try {
    $pluginsResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/plugins" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($pluginsResponse.StatusCode -eq 200) {
        $pluginsData = $pluginsResponse.Content | ConvertFrom-Json
        $starTrekPlugin = $pluginsData | Where-Object { $_.name -eq "star-trek-universe-plugin" -or $_.type -eq "star-trek" }
        
        if ($starTrekPlugin) {
            Write-Host "✅ Star Trek plugin is registered" -ForegroundColor Green
            Write-Host "   Plugin Name: $($starTrekPlugin.name)" -ForegroundColor Cyan
            Write-Host "   Plugin Type: $($starTrekPlugin.type)" -ForegroundColor Cyan
        }
        else {
            Write-Host "⚠️  Star Trek plugin not found in registered plugins" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Failed to fetch plugins list" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Plugin registration check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test universe creation with Star Trek theme
Write-Host "`n🔍 Test 4: Testing Universe Creation with Star Trek Theme..." -ForegroundColor Yellow

$testUniverse = @{
    name        = "Test Star Trek Universe $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    description = "Test universe for plugin verification"
    type        = "star-trek"
    settings    = @{
        theme = "lcars"
        era   = "tng"
    }
} | ConvertTo-Json -Depth 3

try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/universes" -Method POST -Body $testUniverse -ContentType "application/json" -UseBasicParsing -TimeoutSec 15
    
    if ($createResponse.StatusCode -eq 201) {
        $universeData = $createResponse.Content | ConvertFrom-Json
        Write-Host "✅ Star Trek universe created successfully" -ForegroundColor Green
        Write-Host "   Universe ID: $($universeData.id)" -ForegroundColor Cyan
        Write-Host "   Universe Name: $($universeData.name)" -ForegroundColor Cyan
        Write-Host "   Theme: $($universeData.settings.theme)" -ForegroundColor Cyan
        
        # Store the ID for cleanup
        $testUniverseId = $universeData.id
        
        # Test 5: Verify universe can be retrieved
        Write-Host "`n🔍 Test 5: Verifying Universe Retrieval..." -ForegroundColor Yellow
        
        $getResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/universes/$testUniverseId" -Method GET -UseBasicParsing -TimeoutSec 10
        
        if ($getResponse.StatusCode -eq 200) {
            $retrievedUniverse = $getResponse.Content | ConvertFrom-Json
            Write-Host "✅ Universe retrieved successfully" -ForegroundColor Green
            Write-Host "   Retrieved Name: $($retrievedUniverse.name)" -ForegroundColor Cyan
            Write-Host "   Retrieved Theme: $($retrievedUniverse.settings.theme)" -ForegroundColor Cyan
        }
        else {
            Write-Host "❌ Failed to retrieve created universe" -ForegroundColor Red
        }
        
        # Test 6: Test theme-specific validation
        Write-Host "`n🔍 Test 6: Testing Star Trek Theme Validation..." -ForegroundColor Yellow
        
        $invalidStarTrekData = @{
            name           = "Invalid Starfleet Ship"
            type           = "vessel"
            classification = "InvalidClass"  # Should be validated by Star Trek plugin
            registry       = "INVALID"  # Should follow NCC-XXXX pattern
        } | ConvertTo-Json -Depth 2
        
        try {
            $validationResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/universes/$testUniverseId/entities" -Method POST -Body $invalidStarTrekData -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
            
            if ($validationResponse.StatusCode -eq 400) {
                Write-Host "✅ Theme validation is working (rejected invalid data)" -ForegroundColor Green
            }
            else {
                Write-Host "⚠️  Theme validation may not be working (accepted invalid data)" -ForegroundColor Yellow
            }
        }
        catch {
            if ($_.Exception.Message -match "400") {
                Write-Host "✅ Theme validation is working (rejected invalid data)" -ForegroundColor Green
            }
            else {
                Write-Host "⚠️  Validation test inconclusive: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        # Cleanup: Delete test universe
        Write-Host "`n🧹 Cleaning up test universe..." -ForegroundColor Yellow
        
        try {
            $deleteResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/universes/$testUniverseId" -Method DELETE -UseBasicParsing -TimeoutSec 10
            
            if ($deleteResponse.StatusCode -eq 204 -or $deleteResponse.StatusCode -eq 200) {
                Write-Host "✅ Test universe cleaned up successfully" -ForegroundColor Green
            }
            else {
                Write-Host "⚠️  Test universe cleanup returned status: $($deleteResponse.StatusCode)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "⚠️  Failed to cleanup test universe: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
    }
    else {
        Write-Host "❌ Failed to create Star Trek universe" -ForegroundColor Red
        Write-Host "   Status: $($createResponse.StatusCode)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Universe creation failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Test frontend component availability
Write-Host "`n🔍 Test 7: Testing Frontend Component Accessibility..." -ForegroundColor Yellow

try {
    # Test if we can access the developer showcase page
    $showcaseResponse = Invoke-WebRequest -Uri "http://localhost:5173/developer" -Method GET -UseBasicParsing -TimeoutSec 10
    
    if ($showcaseResponse.StatusCode -eq 200) {
        Write-Host "✅ Developer showcase page is accessible" -ForegroundColor Green
        
        # Check if LCARS components are mentioned in the page
        if ($showcaseResponse.Content -match "LCARS" -or $showcaseResponse.Content -match "Star Trek") {
            Write-Host "✅ LCARS/Star Trek content detected on showcase page" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  LCARS/Star Trek content not clearly visible on showcase page" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Developer showcase page not accessible" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Frontend component test failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Final Summary
Write-Host "`n" + "=" * 50
Write-Host "🎯 Verification Complete!" -ForegroundColor Green
Write-Host "`n📋 Summary:"
Write-Host "   • Backend connectivity: Tested"
Write-Host "   • Frontend accessibility: Tested"
Write-Host "   • Plugin registration: Tested"
Write-Host "   • Universe creation: Tested"
Write-Host "   • Theme validation: Tested"
Write-Host "   • Component accessibility: Tested"

Write-Host "`n💡 Next Steps:"
Write-Host "   1. If any tests failed, check the respective services"
Write-Host "   2. Verify plugin configuration in backend"
Write-Host "   3. Test LCARS components in the frontend manually"
Write-Host "   4. Run enhanced test suite: npm test"

Write-Host "`n🌟 Star Trek Plugin Verification Complete!" -ForegroundColor Magenta
