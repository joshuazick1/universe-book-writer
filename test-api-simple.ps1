# Test Universe Creation API with Authentication
# Admin credentials from init script
$adminEmail = "admin@universe-writer.com"
$adminPassword = "WriteTheStars2025!"
$baseUrl = "http://localhost:5000"

Write-Host "Testing Universe Creation API with Authentication" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get auth cookie
Write-Host "Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -SessionVariable webSession
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Status: $($loginResponse.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test simplified universe creation
Write-Host ""
Write-Host "Creating test universe..." -ForegroundColor Yellow
$universeData = @{
    name = "Test Universe $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    description = "A test universe created via API to verify simplified creation flow"
    settings = @{
        is_private = $false
        allow_collaboration = $true
    }
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/universes" -Method POST -ContentType "application/json" -Body $universeData -WebSession $webSession
    Write-Host "Universe created successfully!" -ForegroundColor Green
    Write-Host "Status: $($createResponse.StatusCode)" -ForegroundColor Gray
    
    $responseData = $createResponse.Content | ConvertFrom-Json
    Write-Host "Response Data:" -ForegroundColor Cyan
    Write-Host "Success: $($responseData.success)" -ForegroundColor Gray
    
    if ($responseData.data) {
        Write-Host "Universe ID: $($responseData.data.id)" -ForegroundColor Gray
        Write-Host "Name: $($responseData.data.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Universe creation failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Test listing universes
Write-Host ""
Write-Host "Testing universe listing..." -ForegroundColor Yellow

try {
    $listResponse = Invoke-WebRequest -Uri "$baseUrl/api/universes" -Method GET -WebSession $webSession
    Write-Host "Universe listing successful!" -ForegroundColor Green
    Write-Host "Status: $($listResponse.StatusCode)" -ForegroundColor Gray
    
    $listData = $listResponse.Content | ConvertFrom-Json
    if ($listData.data) {
        Write-Host "Found $($listData.data.Count) universe(s)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Universe listing failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "API testing complete!" -ForegroundColor Green
