# Test Payments Endpoints
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

# Step 2: Test Get Payments
Write-Host "`n=== Step 2: Get Payments ===" -ForegroundColor Green
try {
    $paymentsResponse = Invoke-RestMethod -Uri "$baseUrl/payments?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Payments:" -ForegroundColor Cyan
    $paymentsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get payments: $_" -ForegroundColor Red
}

# Step 3: Test Get Receipts
Write-Host "`n=== Step 3: Get Receipts ===" -ForegroundColor Green
try {
    $receiptsResponse = Invoke-RestMethod -Uri "$baseUrl/payments/receipts/all?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Receipts:" -ForegroundColor Cyan
    $receiptsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get receipts: $_" -ForegroundColor Red
}

# Step 4: Test Get Refunds
Write-Host "`n=== Step 4: Get Refunds ===" -ForegroundColor Green
try {
    $refundsResponse = Invoke-RestMethod -Uri "$baseUrl/payments/refunds/all?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Refunds:" -ForegroundColor Cyan
    $refundsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get refunds: $_" -ForegroundColor Red
}

Write-Host "`n=== Payments Tests Completed ===" -ForegroundColor Green