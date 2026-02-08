$t = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$u = "http://localhost:8080/api"

# Get Divisions
try {
    Write-Host "Getting Divisions..."
    $dRes = Invoke-RestMethod "${u}/divisions?tenantId=${t}"
    $divId = $dRes[0].divisionId
    Write-Host "Using Division: $($dRes[0].name) ($divId)"
}
catch {
    Write-Host "Error getting divisions. Creating default..."
    # Fallback or exit
    exit
}

# Delete Existing Workers (Optional - user said 'just seed', but cleaner to wipe first if we want EXACT count)
# Assuming user wants clean slate or we append. 
# "Delete existing" ensures no duplicates from previous "REG5001".
# But `FixSchemaRunner` already clears on startup?
# Wait, user restarted Tenant Service. `FixSchemaRunner` ran.
# So DB is EMPTY.
# I will skip Delete loop to save time and errors.

# Data
$roles = @(
    "PLUCKER", "KANGANI", "SACKCOOLI", "TRANSPORT", 
    "FERTILIZER", "CHEMICAL_WEEDER", "MANUAL_WEEDER", 
    "WATCHER", "SUNDRY", "TAPPER", "WELDER", "OTHER"
)

$names = @(
    "Sunil Perera", "Nimal Silva", "Kamal Fernando", "Ajith Bandara", "Chathura De Silva",
    "Mahesh Gunaratne", "Pradeep Kumara", "Chamara Jayasinghe", "Nuwan Pradeep", "Roshan Liyanage",
    "Tharindu Senanayake", "Dinesh Chandimal", "Lahiru Thirimanne", "Kasun Rajitha", "Sanjeewa Pushpakumara",
    "Ruwan Kalpage", "Suranga Lakmal", "Upul Tharanga", "Chandana Silva", "Priyantha Kumara",
    "Sampath Perera", "Amila Bandara", "Gayan Priyadarshana", "Isuru Udana", "Dilshan Madushanka",
    "Saman Kumara", "Vikum Sanjaya", "Asela Gunaratne", "Kusal Mendis", "Dimuth Karunaratne",
    "Angelo Mathews", "Dhananjaya de Silva", "Wanindu Hasaranga", "Dushmantha Chameera", "Maheesh Theekshana",
    "Pathum Nissanka", "Charith Asalanka", "Dasun Shanaka", "Bhanuka Rajapaksa", "Chamika Karunaratne"
)

$idx = 1

foreach ($r in $roles) {
    Write-Host "Seeding $r..."
    for ($i = 1; $i -le 3; $i++) {
        $nIndex = ($idx - 1) % $names.Count
        $name = $names[$nIndex]
        
        # Formats: REG0001, A09999920210901
        $regSuffix = $idx.ToString("0000")
        $regNo = "REG$regSuffix"
        
        $epfSuffix = $idx.ToString("00")
        $epfNo = "A099999202109$epfSuffix"

        $body = @{
            tenantId           = $t
            name               = $name
            registrationNumber = $regNo
            jobRole            = $r
            epfNumber          = $epfNo
            gender             = "MALE"
            status             = "ACTIVE"
            divisionIds        = @($divId)
        }
        
        $json = $body | ConvertTo-Json -Depth 5
        try {
            Invoke-RestMethod "${u}/workers" -Method Post -Body $json -ContentType "application/json"
            Write-Host "  Added $name ($regNo)"
        }
        catch {
            Write-Host "  Failed to add $name : $_"
        }
        $idx++
    }
}
Write-Host "Seeding Complete."
