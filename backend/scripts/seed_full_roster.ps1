$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$baseUrl = "http://localhost:8081/api"

# Get Divisions
Write-Host "Fetching Divisions..." -ForegroundColor Cyan
try {
    $divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get
}
catch {
    Write-Host "Failed to fetch divisions. Is Tenant Service (8081) running?" -ForegroundColor Red
    exit
}

if ($divisions.Count -eq 0) {
    Write-Host "No divisions found. Please seed divisions first." -ForegroundColor Yellow
    exit
}

$divIds = $divisions | Select-Object -ExpandProperty divisionId
$divCount = $divIds.Count

function Get-RandomDiv {
    return $divIds[(Get-Random -Maximum $divCount)]
}

$roles = @(
    "PLUCKER", "KANGANI", "SACKCOOLI", "TRANSPORT", "FERTILIZER",
    "CHEMICAL_WEEDER", "MANUAL_WEEDER", "WATCHER", "SUNDRY", "TAPPER", "WELDER", "OTHER"
)

$names = @(
    "Sunil Perera", "Nimal Silva", "Kamal Fernando", "Priyantha Bandara", "Rohana Dissanayake",
    "Chitra Gamage", "Malini Jayasuriya", "Lakshmi Karunaratne", "Saman Ekanayake", "Ruwan Weerasinghe",
    "Anura Herath", "Chandana Rajapaksa", "Dhammika Gunawardena", "Mahesh Senanayake", "Lasantha Wickremasinghe",
    "Nuwan Pradeep", "Roshan Ranasinghe", "Thilak Kumara", "Ajith Rathnayake", "Kumara Sangakkara",
    "Mahela Jayawardene", "Sanath Jayasuriya", "Muttiah Muralitharan", "Chaminda Vaas", "Arjuna Ranatunga",
    "Aravinda de Silva", "Romesh Kaluwitharana", "Hashan Tillakaratne", "Upul Chandana", "Marvan Atapattu",
    "Rangana Herath", "Angelo Mathews", "Dimuth Karunaratne", "Dinesh Chandimal", "Kusal Perera",
    "T.M. Dilshan", "Lasith Malinga", "Suranga Lakmal", "Nuwan Kulasekara", "Farveez Maharoof"
)

$nameIndex = 0

foreach ($role in $roles) {
    Write-Host "Seeding $role..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le 3; $i++) {
        if ($nameIndex -ge $names.Count) { $nameIndex = 0 } # Cycle names if needed
        $fullName = $names[$nameIndex]
        $nameIndex++
        
        $code = $role.Substring(0, 3) + $i.ToString("000")
        $epf = (1000 + $nameIndex).ToString()
        
        $body = @{
            name               = $fullName
            registrationNumber = $code
            gender             = "MALE" # Simplifying for bulk
            jobRole            = $role
            epfNumber          = $epf
            tenantId           = $tenantId
            status             = "ACTIVE"
            divisionIds        = @($(Get-RandomDiv))
        } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri "$baseUrl/workers" -Method Post -Body $body -ContentType "application/json" | Out-Null
            Write-Host "  + Created $fullName ($role)" -ForegroundColor Green
        }
        catch {
            $err = $_.Exception.Message
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $err = $reader.ReadToEnd()
            }
            Write-Host "  - Failed $fullName: $err" -ForegroundColor Red
        }
    }
}
Write-Host "Seeding Complete!" -ForegroundColor Cyan
