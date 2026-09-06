# Test Purchasing Endpoints
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
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Test Get Requisitions
Write-Host "`n=== Step 2: Get Requisitions ===" -ForegroundColor Green
try {
    $requisitionsResponse = Invoke-RestMethod -Uri "$baseUrl/purchasing/requisitions?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Requisitions:" -ForegroundColor Cyan
    $requisitionsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get requisitions: $_" -ForegroundColor Red
}

# Step 3: Test Get Purchase Orders
Write-Host "`n=== Step 3: Get Purchase Orders ===" -ForegroundColor Green
try {
    $posResponse = Invoke-RestMethod -Uri "$baseUrl/purchasing/purchase-orders?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Purchase Orders:" -ForegroundColor Cyan
    $posResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get purchase orders: $_" -ForegroundColor Red
}

# Step 4: Test Get GRNs
Write-Host "`n=== Step 4: Get GRNs ===" -ForegroundColor Green
try {
    $grnsResponse = Invoke-RestMethod -Uri "$baseUrl/purchasing/grns?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "GRNs:" -ForegroundColor Cyan
    $grnsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get GRNs: $_" -ForegroundColor Red
}

# Step 5: Test Get Purchase Returns
Write-Host "`n=== Step 5: Get Purchase Returns ===" -ForegroundColor Green
try {
    $returnsResponse = Invoke-RestMethod -Uri "$baseUrl/purchasing/purchase-returns?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Purchase Returns:" -ForegroundColor Cyan
    $returnsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get purchase returns: $_" -ForegroundColor Red
}

Write-Host "`n=== Purchasing Tests Completed ===" -ForegroundColor Green