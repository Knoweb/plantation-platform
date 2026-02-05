$email = "Sunil@gmail.com"
$newPassword = "Password@123"
$baseUrl = "http://localhost:8081/api/tenants"

Write-Host "Attempting to reset password for $email..."

# 1. Request Reset Token
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/forgot-password" -Method Post -Body (@{ email = $email } | ConvertTo-Json) -ContentType "application/json"
    $token = $response.token
    Write-Host "Token received: $token"

    # 2. Reset Password
    if ($token) {
        $resetBody = @{
            token       = $token
            newPassword = $newPassword
        } | ConvertTo-Json

        $resetResponse = Invoke-RestMethod -Uri "$baseUrl/reset-password" -Method Post -Body $resetBody -ContentType "application/json"
        Write-Host "Password Reset Success: $($resetResponse.message)"
        Write-Host "New Credentials > Email: $email | Password: $newPassword"
    }
}
catch {
    Write-Host "Failed to reset password for $email"
    Write-Host $_.Exception.Message
    
    # Try alternate email?
    $altEmail = "Sunil@gmail." # Based on log weirdness
    Write-Host "Trying alternate email: $altEmail..."
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/forgot-password" -Method Post -Body (@{ email = $altEmail } | ConvertTo-Json) -ContentType "application/json"
        $token = $response.token
        Write-Host "Token received: $token"
        
        $resetBody = @{ token = $token; newPassword = $newPassword } | ConvertTo-Json
        $resetResponse = Invoke-RestMethod -Uri "$baseUrl/reset-password" -Method Post -Body $resetBody -ContentType "application/json"
        Write-Host "Password Reset Success for $altEmail"
        Write-Host "New Credentials > Email: $altEmail | Password: $newPassword"
    }
    catch {
        Write-Host "Failed alternate attempt."
        Write-Host $_.Exception.Message
    }
}
