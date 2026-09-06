# Simple test for master data endpoints
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.data.accessToken

Write-Host "=== Testing Brands GET ==="
$brands = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/brands' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Brands found: $($brands.data.Length)"

Write-Host "=== Testing Units GET ==="
$units = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/units' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Units found: $($units.data.Length)"

Write-Host "=== Testing Customers GET ==="
$customers = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/customers' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Customers found: $($customers.data.Length)"

Write-Host "=== Testing Suppliers GET ==="
$suppliers = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/suppliers' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Suppliers found: $($suppliers.data.Length)"

Write-Host "=== Testing Locations GET ==="
$locations = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/locations' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Locations found: $($locations.data.Length)"

Write-Host "=== Master Data Endpoints Working ==="