# Test Inventory Endpoints
$baseUrl = "http://localhost:3001/api/v1"

# Step 1: Login to get token
Write-Host "=== Step 1: Login ===" -ForegroundColor Green
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    Write-Host "Login successful! Token acquired" -ForegroundColor Green
    Write-Host "Token: $token" -ForegroundColor Yellow
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Test Inventory Summary
Write-Host "`n=== Step 2: Get Inventory Summary ===" -ForegroundColor Green
try {
    $summaryResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/summary" -Method Get -Headers $headers
    Write-Host "Inventory Summary:" -ForegroundColor Cyan
    $summaryResponse.data | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Failed to get inventory summary: $_" -ForegroundColor Red
}

# Step 3: Test Stock Balances
Write-Host "`n=== Step 3: Get Stock Balances ===" -ForegroundColor Green
try {
    $balancesResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/balances" -Method Get -Headers $headers
    Write-Host "Stock Balances:" -ForegroundColor Cyan
    $balancesResponse.data | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get stock balances: $_" -ForegroundColor Red
}

# Step 4: Test Inventory Movements
Write-Host "`n=== Step 4: Get Inventory Movements ===" -ForegroundColor Green
try {
    $movementsResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/movements?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Inventory Movements:" -ForegroundColor Cyan
    $movementsResponse.data | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get inventory movements: $_" -ForegroundColor Red
}

# Step 5: Test Stock Transfers
Write-Host "`n=== Step 5: Get Stock Transfers ===" -ForegroundColor Green
try {
    $transfersResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/transfers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Stock Transfers:" -ForegroundColor Cyan
    $transfersResponse.data | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get stock transfers: $_" -ForegroundColor Red
}

# Step 6: Test Stock Adjustments
Write-Host "`n=== Step 6: Get Stock Adjustments ===" -ForegroundColor Green
try {
    $adjustmentsResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/adjustments?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Stock Adjustments:" -ForegroundColor Cyan
    $adjustmentsResponse.data | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get stock adjustments: $_" -ForegroundColor Red
}

# Step 7: Test Stock Audits
Write-Host "`n=== Step 7: Get Stock Audits ===" -ForegroundColor Green
try {
    $auditsResponse = Invoke-RestMethod -Uri "$baseUrl/inventory/audits?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Stock Audits:" -ForegroundColor Cyan
    $auditsResponse.data | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get stock audits: $_" -ForegroundColor Red
}

Write-Host "`n=== Inventory Tests Completed ===" -ForegroundColor Green