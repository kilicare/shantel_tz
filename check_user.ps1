$loginBody = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.data.accessToken

$headers = @{
    Authorization = "Bearer $token"
}

$user = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/users/me" -Method Get -Headers $headers
Write-Host "User ID: $($user.data.id)"
Write-Host "User Email: $($user.data.email)"
Write-Host "User Roles: $($user.data.roles | ConvertTo-Json -Depth 3)"
