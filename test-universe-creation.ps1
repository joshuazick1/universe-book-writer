#!/usr/bin/env pwsh
<#
.SYNOPSIS
Test Universe Creation API with Authentication
.DESCRIPTION
Authenticates with the admin user and tests the simplified universe creation flow
#>

# Admin credentials from init script
$adminEmail = "admin@universe-writer.com"
$adminPassword = "WriteTheStars2025!"
$baseUrl = "http://localhost:5000"

Write-Host "Testing Universe Creation API with Authentication" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get auth cookie
Write-Host "Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email    = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -SessionVariable webSession    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Status: $($loginResponse.StatusCode)" -ForegroundColor Gray
    
    # Extract cookies for debugging
    $cookies = $webSession.Cookies.GetCookies($baseUrl)
    Write-Host "Cookies received:" -ForegroundColor Gray
    foreach ($cookie in $cookies) {
        Write-Host "  - $($cookie.Name): $($cookie.Value.Substring(0, [Math]::Min(20, $cookie.Value.Length)))..." -ForegroundColor Gray
    }
    Write-Host ""

}
catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Response: $errorContent" -ForegroundColor Red
    }
    exit 1
}

# Step 2: Test simplified universe creation
Write-Host "Creating test universe..." -ForegroundColor Yellow
$universeData = @{
    name        = "Test Universe $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    description = "A test universe created via API to verify simplified creation flow"
    settings    = @{
        is_private          = $false
        allow_collaboration = $true
    }
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/universes" `
        -Method POST `
        -ContentType "application/json" `
        -Body $universeData `
        -WebSession $webSession    Write-Host "Universe created successfully!" -ForegroundColor Green
    Write-Host "Status: $($createResponse.StatusCode)" -ForegroundColor Gray
    
    # Parse and display the response
    $responseData = $createResponse.Content | ConvertFrom-Json
    Write-Host ""
    Write-Host "Response Data:" -ForegroundColor Cyan
    Write-Host "Success: $($responseData.success)" -ForegroundColor Gray
    
    if ($responseData.data) {
        Write-Host "Universe ID: $($responseData.data.id)" -ForegroundColor Gray
        Write-Host "Name: $($responseData.data.name)" -ForegroundColor Gray
        Write-Host "Description: $($responseData.data.description)" -ForegroundColor Gray
        Write-Host "Private: $($responseData.data.settings.is_private)" -ForegroundColor Gray
        Write-Host "Allow Collaboration: $($responseData.data.settings.allow_collaboration)" -ForegroundColor Gray
    }

}
catch {
    Write-Host "Universe creation failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorBody)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Response: $errorContent" -ForegroundColor Red
            
            # Try to parse as JSON for better error display
            try {
                $errorJson = $errorContent | ConvertFrom-Json
                if ($errorJson.error) {
                    Write-Host "API Error: $($errorJson.error)" -ForegroundColor Red
                }
            }
            catch {
                # Not JSON, just display raw content
            }
        }
        catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
    exit 1
}

# Step 3: Test listing universes
Write-Host ""
Write-Host "Testing universe listing..." -ForegroundColor Yellow

try {
    $listResponse = Invoke-WebRequest -Uri "$baseUrl/api/universes" `
        -Method GET `
        -WebSession $webSession    Write-Host "Universe listing successful!" -ForegroundColor Green
    Write-Host "Status: $($listResponse.StatusCode)" -ForegroundColor Gray
    
    $listData = $listResponse.Content | ConvertFrom-Json
    if ($listData.data) {
        Write-Host "Found $($listData.data.Count) universe(s)" -ForegroundColor Gray
        foreach ($universe in $listData.data) {
            Write-Host "  - $($universe.name) (Private: $($universe.settings.is_private))" -ForegroundColor Gray
        }
    }

}
catch {
    Write-Host "Universe listing failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "API testing complete!" -ForegroundColor Green
Write-Host "The simplified universe creation flow is working!" -ForegroundColor Cyan
