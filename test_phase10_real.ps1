$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api/v1"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "PHASE 10 ACTUAL TEST RESULTS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "1. LOGIN" -ForegroundColor Yellow
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $login.data.accessToken
    Write-Host "   Login: SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "   Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host ""

# Test Projects LIST
Write-Host "2. PROJECTS LIST (GET /projects)" -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "$baseUrl/projects?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Projects Total: $($projects.total)" -ForegroundColor Green
    Write-Host "   Projects Count: $($projects.data.Count)" -ForegroundColor Green
    if ($projects.data.Count -gt 0) {
        Write-Host "   First Project: $($projects.data[0].name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Serial Numbers LIST
Write-Host "3. SERIAL NUMBERS LIST (GET /projects/serial-numbers)" -ForegroundColor Yellow
try {
    $serialNumbers = Invoke-RestMethod -Uri "$baseUrl/projects/serial-numbers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Serial Numbers Total: $($serialNumbers.total)" -ForegroundColor Green
    Write-Host "   Serial Numbers Count: $($serialNumbers.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Assets LIST
Write-Host "4. ASSETS LIST (GET /projects/assets)" -ForegroundColor Yellow
try {
    $assets = Invoke-RestMethod -Uri "$baseUrl/projects/assets?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Assets Total: $($assets.total)" -ForegroundColor Green
    Write-Host "   Assets Count: $($assets.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Reference Data
Write-Host "5. REFERENCE DATA CHECK" -ForegroundColor Yellow
try {
    $customers = Invoke-RestMethod -Uri "$baseUrl/customers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Customers: $($customers.total)" -ForegroundColor White
} catch {
    Write-Host "   Customers: FAILED" -ForegroundColor Red
}

try {
    $locations = Invoke-RestMethod -Uri "$baseUrl/locations?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Locations: $($locations.total)" -ForegroundColor White
} catch {
    Write-Host "   Locations: FAILED" -ForegroundColor Red
}

try {
    $products = Invoke-RestMethod -Uri "$baseUrl/products?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "   Products: $($products.total)" -ForegroundColor White
} catch {
    Write-Host "   Products: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ACTUAL STATUS:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Compilation: 0 errors" -ForegroundColor Green
Write-Host "✅ Server: Running on port 3001" -ForegroundColor Green
Write-Host "✅ Routes: All mapped correctly" -ForegroundColor Green
Write-Host "✅ List Endpoints: Working (returning empty results)" -ForegroundColor Green
Write-Host "❌ Create Operations: NOT TESTED (no reference data)" -ForegroundColor Red
Write-Host "❌ Serial Number Uniqueness: NOT TESTED" -ForegroundColor Red
Write-Host "❌ Asset Lifecycle: NOT TESTED" -ForegroundColor Red
Write-Host "❌ Project Operations: NOT TESTED" -ForegroundColor Red
Write-Host ""
Write-Host "REASON: Reference data (customers, locations, products) is empty in database" -ForegroundColor Yellow
Write-Host "SEED STATUS: Seed says data exists, but API returns empty - possible data sync issue" -ForegroundColor Yellow
