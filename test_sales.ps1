# Test Sales Endpoints
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

# Step 2: Test Get Quotations
Write-Host "`n=== Step 2: Get Quotations ===" -ForegroundColor Green
try {
    $quotationsResponse = Invoke-RestMethod -Uri "$baseUrl/sales/quotations?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Quotations:" -ForegroundColor Cyan
    $quotationsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get quotations: $_" -ForegroundColor Red
}

# Step 3: Test Get Sales Orders
Write-Host "`n=== Step 3: Get Sales Orders ===" -ForegroundColor Green
try {
    $ordersResponse = Invoke-RestMethod -Uri "$baseUrl/sales/orders?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Sales Orders:" -ForegroundColor Cyan
    $ordersResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get sales orders: $_" -ForegroundColor Red
}

# Step 4: Test Get Invoices
Write-Host "`n=== Step 4: Get Invoices ===" -ForegroundColor Green
try {
    $invoicesResponse = Invoke-RestMethod -Uri "$baseUrl/sales/invoices?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Invoices:" -ForegroundColor Cyan
    $invoicesResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get invoices: $_" -ForegroundColor Red
}

# Step 5: Test Get Sales Returns
Write-Host "`n=== Step 5: Get Sales Returns ===" -ForegroundColor Green
try {
    $returnsResponse = Invoke-RestMethod -Uri "$baseUrl/sales/returns?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Sales Returns:" -ForegroundColor Cyan
    $returnsResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to get sales returns: $_" -ForegroundColor Red
}

Write-Host "`n=== Sales Tests Completed ===" -ForegroundColor Green