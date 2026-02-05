$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$baseUrl = "http://localhost:8081/api"

# Get Divisions
$divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get
$upperDiv = $divisions | Where-Object { $_.name -eq "Upper Division" }
$lowerDiv = $divisions | Where-Object { $_.name -eq "Lower Division" }

if (-not $upperDiv -or -not $lowerDiv) {
    Write-Host "Divisions not found!" -ForegroundColor Red
    exit
}

$upperId = $upperDiv.divisionId
$lowerId = $lowerDiv.divisionId

$workers = @(
    # Tappers (Upper)
    @{ Name = "Letschimi"; Gender = "FEMALE"; Role = "TAPPER"; Div = $upperId; Reg = "TAP001"; Epf = "8001" },
    @{ Name = "Selvi"; Gender = "FEMALE"; Role = "TAPPER"; Div = $upperId; Reg = "TAP002"; Epf = "8002" },
    @{ Name = "Kamala"; Gender = "FEMALE"; Role = "TAPPER"; Div = $upperId; Reg = "TAP003"; Epf = "8003" },
    
    # Tappers (Lower)
    @{ Name = "Rani"; Gender = "FEMALE"; Role = "TAPPER"; Div = $lowerId; Reg = "TAP004"; Epf = "8004" },
    @{ Name = "Valli"; Gender = "FEMALE"; Role = "TAPPER"; Div = $lowerId; Reg = "TAP005"; Epf = "8005" },
    @{ Name = "Meena"; Gender = "FEMALE"; Role = "TAPPER"; Div = $lowerId; Reg = "TAP006"; Epf = "8006" },

    # Fertilizers (Upper)
    @{ Name = "Kumar"; Gender = "MALE"; Role = "FERTILIZER"; Div = $upperId; Reg = "FRT001"; Epf = "9001" },
    @{ Name = "Ravi"; Gender = "MALE"; Role = "FERTILIZER"; Div = $upperId; Reg = "FRT002"; Epf = "9002" },

    # Fertilizers (Lower)
    @{ Name = "Siva"; Gender = "MALE"; Role = "FERTILIZER"; Div = $lowerId; Reg = "FRT003"; Epf = "9003" },
    @{ Name = "Ganesh"; Gender = "MALE"; Role = "FERTILIZER"; Div = $lowerId; Reg = "FRT004"; Epf = "9004" },

    # Welders (Upper)
    @{ Name = "Silva"; Gender = "MALE"; Role = "WELDER"; Div = $upperId; Reg = "WLD001"; Epf = "7001" },
    @{ Name = "Perera"; Gender = "MALE"; Role = "WELDER"; Div = $upperId; Reg = "WLD002"; Epf = "7002" },

    # Welders (Lower)
    @{ Name = "Fernando"; Gender = "MALE"; Role = "WELDER"; Div = $lowerId; Reg = "WLD003"; Epf = "7003" },
    @{ Name = "De Silva"; Gender = "MALE"; Role = "WELDER"; Div = $lowerId; Reg = "WLD004"; Epf = "7004" }
)

foreach ($w in $workers) {
    $body = @{
        name               = $w.Name
        registrationNumber = $w.Reg
        gender             = $w.Gender
        jobRole            = $w.Role
        epfNumber          = $w.Epf
        tenantId           = $tenantId
        status             = "ACTIVE"
        divisionIds        = @($w.Div)
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$baseUrl/workers" -Method Post -Body $body -ContentType "application/json"
        Write-Host "Created $($w.Role): $($w.Name)" -ForegroundColor Green
    }
    catch {
        $msg = $_.Exception.Message
        $body = "No details"
        if ($_.Exception.Response) {
            # Read the error stream
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
            }
        }
        Write-Host "Failed to create $($w.Name): $msg | Body: $body" -ForegroundColor Red
    }
}
