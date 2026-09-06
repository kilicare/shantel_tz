$body = @{
    email = "admin@shantel.local"
    password = "Admin@123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $body
$response | ConvertTo-Json -Depth 10