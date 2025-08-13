# PowerShell script to test scheduler API endpoints

# Base URL for the API
$baseUrl = "http://localhost:5100/api/scheduler"

# Test starting the scheduler
Write-Host "Testing: Start Scheduler"
$response = Invoke-WebRequest -Uri "$baseUrl/start" -Method POST -UseBasicParsing
Write-Host "Response: $($response.StatusCode) - $($response.Content)"

# Test stopping the scheduler
Write-Host "Testing: Stop Scheduler"
$response = Invoke-WebRequest -Uri "$baseUrl/stop" -Method POST -UseBasicParsing
Write-Host "Response: $($response.StatusCode) - $($response.Content)"

# Test analyzing benchmark gaps
Write-Host "Testing: Analyze Benchmark Gaps"
$response = Invoke-WebRequest -Uri "$baseUrl/gaps" -Method GET -UseBasicParsing
Write-Host "Response: $($response.StatusCode) - $($response.Content)"
