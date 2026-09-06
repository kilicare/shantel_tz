$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api/v1"

# Login
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.data.accessToken

$headers = @{
    Authorization = "Bearer $token"
}

# Check customers
$customers = Invoke-RestMethod -Uri "$baseUrl/customers?page=1&limit=10" -Method Get -Headers $headers
Write-Host "Customers: $($customers.total)"
if ($customers.data.Count -gt 0) {
    Write-Host "First customer: $($customers.data[0].name) - $($customers.data[0].id)"
}

# Check locations
$locations = Invoke-RestMethod -Uri "$baseUrl/locations?page=1&limit=10" -Method Get -Headers $headers
Write-Host "Locations: $($locations.total)"
if ($locations.data.Count -gt 0) {
    Write-Host "First location: $($locations.data[0].name) - $($locations.data[0].id)"
}

# Check products
$products = Invoke-RestMethod -Uri "$baseUrl/products?page=1&limit=10" -Method Get -Headers $headers
Write-Host "Products: $($products.total)"
if ($products.data.Count -gt 0) {
    Write-Host "First product: $($products.data[0].name) - $($products.data[0].id)"
}
