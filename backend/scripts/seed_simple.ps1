$t = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$u = "http://localhost:8081/api"

Write-Host "Getting Divs..."
try {
    $d = Invoke-RestMethod "${u}/divisions?tenantId=${t}"
}
catch {
    Write-Host "Error fetching divisions"
    exit
}

if ($d.Count -eq 0) { Write-Host "No divisions"; exit }
$did = $d[0].divisionId

# Cleanup existing workers
Write-Host "Cleaning up existing workers..."
try {
    $existing = Invoke-RestMethod "${u}/workers?tenantId=${t}"
    foreach ($w in $existing) {
        Invoke-RestMethod "${u}/workers/$($w.id)" -Method Delete
    }
    Write-Host "Cleanup complete."
}
catch {
    Write-Host "Cleanup failed. Error: $_"
    exit
}

$roles = @("PLUCKER", "KANGANI", "SACKCOOLI", "TRANSPORT", "FERTILIZER", "CHEMICAL_WEEDER", "MANUAL_WEEDER", "WATCHER", "SUNDRY", "TAPPER", "WELDER", "OTHER")

$maleNames = @("Sunil Perera", "Nimal Silva", "Kamal Fernando", "Priyantha Bandara", "Rohana Dissanayake", "Ruwan Weerasinghe", "Anura Herath", "Chandana Rajapaksa", "Dhammika Gunawardena", "Mahesh Senanayake", "Lasantha Wickremasinghe", "Nuwan Pradeep", "Roshan Ranasinghe", "Thilak Kumara", "Ajith Rathnayake", "Kumara Sangakkara", "Mahela Jayawardene", "Sanath Jayasuriya", "Muttiah Muralitharan", "Chaminda Vaas", "Arjuna Ranatunga", "Hashan Tillakaratne", "Upul Chandana", "rvan Atapattu", "Rangana Herath", "Angelo Mathews")
$femaleNames = @("Chitra Gamage", "Malini Jayasuriya", "Lakshmi Karunaratne", "Kusum Perera", "Champa Silva", "Nadeesha Fernando", "Dilani Bandara", "Kumari Ekanayake", "Nilanthi Herath", "Renuka Samarasinghe", "Indrani Gunawardena", "Manel Wickremasinghe", "Soma Rathnayake", "Kanthi Alwis", "Menaka Peiris", "Sandya De Silva", "Priyanthi Jayasinghe", "Anoma Senanayake", "Chandani Dissanayake", "Inoka Weerasinghe", "Geetha Kumarasinghe", "Swarna Rajapaksa", "Rupa Liyanage", "Deepa Amarasinghe")

$idx = 1
$nameIdx = 0

foreach ($r in $roles) {
    # 4 workers: 2 Male, 2 Female
    for ($i = 0; $i -lt 4; $i++) {
        $isMale = ($i % 2) -eq 0
        if ($isMale) {
            $name = $maleNames[$nameIdx % $maleNames.Count]
            $gender = "MALE"
        }
        else {
            $name = $femaleNames[$nameIdx % $femaleNames.Count]
            $gender = "FEMALE"
        }
        $nameIdx++
        
        $regNo = "REG{0:D4}" -f $idx
        # EPF: A + 6 digit index + Date
        $epfNo = "A{0:D6}20240903" -f $idx

        $body = @{
            name               = $name
            registrationNumber = $regNo
            gender             = $gender
            jobRole            = $r
            epfNumber          = $epfNo
            tenantId           = $t
            status             = "ACTIVE"
            divisionIds        = @($did)
        } | ConvertTo-Json

        try {
            Invoke-RestMethod "${u}/workers" -Method Post -Body $body -ContentType "application/json" | Out-Null
            Write-Host "Added $name ($r) - $regNo / $epfNo"
        }
        catch {
            Write-Host "Failed $name : $_"
        }
        $idx++
    }
}
