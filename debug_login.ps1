$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api/v1"

# Login
$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

Write-Host "Logging in..."
$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.data.accessToken
Write-Host "Token: $($token.Substring(0, 30))..."

$headers = @{
    Authorization = "Bearer $token"
}

# Check customers
Write-Host "Checking customers..."
try {
    $customers = Invoke-RestMethod -Uri "$baseUrl/customers?page=1&limit=10" -Method Get -Headers $headers
    Write-Host "Customers total: $($customers.total)"
    Write-Host "Customers count: $($customers.data.Count)"
    if ($customers.data.Count -gt 0) {
        Write-Host "First customer: $($customers.data[0].name) - $($customers.data[0].id)"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
