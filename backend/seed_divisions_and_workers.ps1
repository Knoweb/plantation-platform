$baseUrl = "http://localhost:8080/api"
$tenantId = "653c31b9-b0d6-4a75-a546-a5f21c699c4e"

# 1. Fetch Existing Divisions
Write-Host "Fetching Divisions..." -ForegroundColor Cyan
try {
    $divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get
}
catch {
    Write-Host "Failed to fetch divisions. Is backend running?" -ForegroundColor Red
    exit
}

Write-Host "Found $($divisions.Count) divisions." -ForegroundColor Green

# 2. Ensure 4 Divisions (Create if missing)
$desiredDivisions = @("Lower Division", "Upper Division", "Middle Division", "Estate Division")

foreach ($divName in $desiredDivisions) {
    if (-not ($divisions | Where-Object { $_.name -eq $divName })) {
        Write-Host "Creating '$divName'..." -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "$baseUrl/divisions" -Method Post -Body (@{
                    tenantId = $tenantId
                    name     = $divName
                    status   = "ACTIVE"
                } | ConvertTo-Json) -ContentType "application/json"
        }
        catch {
            Write-Host "  Error creating $divName" -ForegroundColor Red
        }
    }
}

# Refetch to get IDs
$divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get
$lowerDivs = $divisions | Where-Object { $_.name -match "Lower" }

if (-not $lowerDivs) {
    Write-Host "Lower Division still missing!" -ForegroundColor Red
    exit
}

Write-Host "Found $($lowerDivs.Count) 'Lower Division' instances. Seeding to ALL." -ForegroundColor Cyan

# 3. Seed Extra Tappers for Lower Division(s)
$extraWorkers = @(
    @{ Name = "L-Tapper A"; Role = "TAPPER"; Gender = "MALE" },
    @{ Name = "L-Tapper B"; Role = "TAPPER"; Gender = "FEMALE" },
    @{ Name = "L-Tapper C"; Role = "TAPPER"; Gender = "MALE" },
    @{ Name = "L-Tapper D"; Role = "TAPPER"; Gender = "FEMALE" },
    @{ Name = "L-Weeder X"; Role = "MANUAL_WEEDER"; Gender = "MALE" }
)

foreach ($div in $lowerDivs) {
    # Ensure ID is a string, not array
    $divId = $div.divisionId
    if ($divId -is [Array]) { $divId = $divId[0] }
    
    Write-Host "Seeding to Lower Division ID: $divId" -ForegroundColor Cyan
    $index = 5000
    foreach ($w in $extraWorkers) {
        # Unique ID per division to allow creation
        $regNum = "TEST-$index-$($divId.ToString().Substring(0,4))"
        $body = @{
            tenantId           = $tenantId
            registrationNumber = $regNum
            name               = $w.Name
            gender             = $w.Gender
            jobRole            = $w.Role
            epfNumber          = "EPF-$index-$($divId.ToString().Substring(0,4))"
            status             = "ACTIVE"
            divisionIds        = @($divId)
        } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri "$baseUrl/workers" -Method Post -Body $body -ContentType "application/json"
            Write-Host "  + Added $($w.Name) to $divId" -ForegroundColor Gray
        }
        catch {
            Write-Host "  ! Failed to add $($w.Name)" -ForegroundColor DarkGray
        }
        $index++
    }
}

Write-Host "Seeding Complete!" -ForegroundColor Green
