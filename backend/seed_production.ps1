# Seed REMOTE Production Database
$baseUrl = "http://wevili.com/api"

Write-Host "Seeding PRODUCTION at $baseUrl..." -ForegroundColor Yellow

# 1. Create Tenant (Pedro Estate)
$tenantPayload = @{
    companyName = "Pedro Estate"
    adminEmail = "admin@pedro.com"
    adminPassword = "password123" # Change this!
    adminUsername = "pedro_admin"
}
$tenantJson = $tenantPayload | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tenants" -Method Post -Body $tenantJson -ContentType "application/json"
    $tenantId = $response.tenantId
    Write-Host "✅ Created Tenant: Pedro Estate ($tenantId)" -ForegroundColor Green
    
    # 2. Login to get Token (if needed, but for now just public endpoints or basic setup)
    # The seeds below use $tenantId
    
    # 3. Create Divisions
    $divisions = @("Upper", "Lower", "Factory_Main")
    foreach ($div in $divisions) {
        $divPayload = @{
            name = $div
            type = "FIELD"
            location = "Pedro $div"
            tenantId = $tenantId
        }
        try {
            Invoke-RestMethod -Uri "$baseUrl/divisions" -Method Post -Body ($divPayload | ConvertTo-Json) -ContentType "application/json" | Out-Null
            Write-Host "  - Created Division: $div" -ForegroundColor Cyan
        } catch {
             Write-Host "  ! Division $div already exists or error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host "`n🎉 Seeding Complete! You can now login with:" -ForegroundColor White
    Write-Host "Username: pedro_admin" -ForegroundColor Green
    Write-Host "Password: password123" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create tenant: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
