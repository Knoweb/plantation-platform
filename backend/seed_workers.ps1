$baseUrl = "http://localhost:8080/api"

# 1. Set Tenant ID (Hayleys Estate)
$tenantId = "653c31b9-b0d6-4a75-a546-a5f21c699c4e"
Write-Host "Using Tenant ID: $tenantId" -ForegroundColor Green

# 2. Get Divisions
$divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get

if (-not $divisions) {
    Write-Host "No divisions found." -ForegroundColor Yellow
    exit
}

$lowerDiv = $divisions | Where-Object { $_.name -match "Lower" }
$upperDiv = $divisions | Where-Object { $_.name -match "Upper" }

if (-not $lowerDiv) { $lowerDiv = $divisions[0] }
if (-not $upperDiv) { $upperDiv = $divisions[-1] } # Fallback

Write-Host "Targeting Divisions: Lower($($lowerDiv.name)), Upper($($upperDiv.name))" -ForegroundColor Cyan

# 3. Define Workers to Seed (Expanded List)
$workersToSeed = @(
    # --- Lower Division ---
    @{ Name = "L-Tapper 1"; Role = "TAPPER"; Gender = "MALE"; Div = $lowerDiv },
    @{ Name = "L-Tapper 2"; Role = "TAPPER"; Gender = "FEMALE"; Div = $lowerDiv },
    @{ Name = "L-Tapper 3"; Role = "TAPPER"; Gender = "MALE"; Div = $lowerDiv },
    @{ Name = "L-Tapper 4"; Role = "TAPPER"; Gender = "FEMALE"; Div = $lowerDiv },
    @{ Name = "L-Weeder 1"; Role = "MANUAL_WEEDER"; Gender = "MALE"; Div = $lowerDiv },
    
    # --- Upper Division ---
    @{ Name = "U-Tapper 1"; Role = "TAPPER"; Gender = "MALE"; Div = $upperDiv },
    @{ Name = "U-Tapper 2"; Role = "TAPPER"; Gender = "FEMALE"; Div = $upperDiv },
    @{ Name = "U-Plucker 1"; Role = "PLUCKER"; Gender = "FEMALE"; Div = $upperDiv }
)

# 4. Seed Workers
$workerIndex = 3000

foreach ($workerData in $workersToSeed) {
    $body = @{
        tenantId           = $tenantId
        registrationNumber = "WORK-$workerIndex"
        name               = $workerData.Name
        gender             = $workerData.Gender
        jobRole            = $workerData.Role
        epfNumber          = "EPF-$workerIndex"
        status             = "ACTIVE"
        divisionIds        = @($workerData.Div.divisionId)
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$baseUrl/workers" -Method Post -Body $body -ContentType "application/json"
        Write-Host "  + Added $($workerData.Name) to $($workerData.Div.name)" -ForegroundColor Gray
    }
    catch {
        Write-Host "  ! Failed (Duplicate?): $($workerData.Name)" -ForegroundColor DarkGray
    }
    
    $workerIndex++
}

Write-Host " Additional Seeding Complete!" -ForegroundColor Green
