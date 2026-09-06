# Test master data endpoints
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.data.accessToken

Write-Host "=== Testing Categories ==="
$categories = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/categories' -Method Get -Headers @{"Authorization"="Bearer $token"}
Write-Host "Categories found: $($categories.data.Length)"

Write-Host "=== Testing Brands ==="
$brandBody = @{
    name = "Samsung"
    description = "Samsung Electronics"
} | ConvertTo-Json
$brand = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/brands' -Method Post -ContentType 'application/json' -Body $brandBody -Headers @{"Authorization"="Bearer $token"}
Write-Host "Brand created: $($brand.data.name)"

Write-Host "=== Testing Units ==="
$unitBody = @{
    name = "Kilogram"
    code = "KG"
    description = "Weight measurement"
} | ConvertTo-Json
$unit = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/units' -Method Post -ContentType 'application/json' -Body $unitBody -Headers @{"Authorization"="Bearer $token"}
Write-Host "Unit created: $($unit.data.code)"

Write-Host "=== Testing Customers ==="
$customerBody = @{
    name = "John Doe"
    email = "john@example.com"
    phone = "+255123456789"
    customerType = "INDIVIDUAL"
} | ConvertTo-Json
$customer = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/customers' -Method Post -ContentType 'application/json' -Body $customerBody -Headers @{"Authorization"="Bearer $token"}
Write-Host "Customer created: $($customer.data.name)"

Write-Host "=== Testing Suppliers ==="
$supplierBody = @{
    name = "Global Supplies Ltd"
    email = "info@globalsupplies.com"
    phone = "+255987654321"
} | ConvertTo-Json
$supplier = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/suppliers' -Method Post -ContentType 'application/json' -Body $supplierBody -Headers @{"Authorization"="Bearer $token"}
Write-Host "Supplier created: $($supplier.data.name)"

Write-Host "=== Testing Locations ==="
$locationBody = @{
    name = "Main Warehouse"
    code = "MW001"
    locationType = "MAIN_STORE"
    address = "123 Industrial Area"
} | ConvertTo-Json
$location = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/locations' -Method Post -ContentType 'application/json' -Body $locationBody -Headers @{"Authorization"="Bearer $token"}
Write-Host "Location created: $($location.data.code)"

Write-Host "=== All Master Data Tests Completed Successfully ==="