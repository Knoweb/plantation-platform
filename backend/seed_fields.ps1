$baseUrl = "http://localhost:8081/api"

# 1. Get Tenant (Pedro Estate)
$tenants = Invoke-RestMethod -Uri "$baseUrl/tenants" -Method Get
$pedro = $tenants | Where-Object { $_.companyName -match "Pedro" }

if (-not $pedro) {
    Write-Host "Pedro Estate not found!" -ForegroundColor Red
    exit
}

$tenantId = $pedro.tenantId
Write-Host "Found Pedro Estate: $tenantId" -ForegroundColor Green

# 2. Get Divisions
$divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get

if (-not $divisions) {
    Write-Host "No divisions found for Pedro Estate." -ForegroundColor Yellow
    exit
}

# 3. Define Fields to Seed
$fieldsToSeed = @(
    @{ Name = "Field No 1"; Crop = "TEA" },
    @{ Name = "Lower Valley Patch"; Crop = "TEA" },
    @{ Name = "Hillside A"; Crop = "TEA" },
    @{ Name = "Riverside Block"; Crop = "RUBBER" }
)

# 4. Seed Fields per Division
foreach ($div in $divisions) {
    Write-Host "Seeding fields for Division: $($div.name)" -ForegroundColor Cyan
    
    foreach ($fieldData in $fieldsToSeed) {
        $body = @{
            tenantId   = $tenantId
            divisionId = $div.divisionId
            name       = "$($fieldData.Name) - $($div.name)" # Make name unique per division
            acreage    = 0.0
            cropType   = $fieldData.Crop
        } | ConvertTo-Json -Depth 10

        try {
            Invoke-RestMethod -Uri "$baseUrl/fields" -Method Post -Body $body -ContentType "application/json"
            Write-Host "  + Added $($fieldData.Name)" -ForegroundColor Gray
        }
        catch {
            Write-Host "  ! Failed to add $($fieldData.Name) (Might already exist)" -ForegroundColor DarkGray
        }
    }
}

Write-Host "Seeding Complete!" -ForegroundColor Green
