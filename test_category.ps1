# Test categories endpoint
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.data.accessToken

# Test create category
$categoryBody = @{
    name = "Construction Materials"
    description = "Building and construction materials"
} | ConvertTo-Json

$categoryResponse = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/products/categories' -Method Post -ContentType 'application/json' -Body $categoryBody -Headers @{"Authorization"="Bearer $token"}
$categoryResponse | ConvertTo-Json -Depth 10