
$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$baseUrl = "http://localhost:8080/api/tenants/daily-work"

# 1. Fetch Division (Reusable)
$divUrl = "http://localhost:8080/api/divisions?tenantId=$tenantId"
try {
    $divResponse = Invoke-RestMethod -Uri $divUrl -Method Get
    $divisionId = $divResponse[0].id
    Write-Host "Using Division ID: $divisionId"
}
catch {
    Write-Host "Failed to fetch division. Using placeholder."
    $divisionId = "158afc94-1b2d-4ec7-bc3a-ed74e2442add"
}

# 2. Prepare Aggregated Payload with Worker Details
$detailsArray = @(
    @{ 
        task     = "Plucking"; 
        field    = "Field No1"; 
        workers  = 2;
        assigned = @(
            @{ id = "w1"; name = "Sunil Perera" },
            @{ id = "w2"; name = "Nimal Silva" }
        )
    },
    @{ 
        task     = "Plucking"; 
        field    = "Field No4"; 
        workers  = 3;
        assigned = @(
            @{ id = "w3"; name = "Kamal Gunarathne" },
            @{ id = "w4"; name = "Amara Bandara" },
            @{ id = "w5"; name = "Soma Wathi" }
        )
    },
    @{ 
        task     = "Weeding"; 
        field    = "Field No2"; 
        workers  = 2;
        assigned = @(
            @{ id = "w6"; name = "Rani Kanthi" },
            @{ id = "w7"; name = "Piyadasa" }
        )
    }
)
$detailsJson = $detailsArray | ConvertTo-Json -Depth 3 -Compress
# Escape quotes for JSON string inside JSON
$detailsString = $detailsJson -replace '"', '\"'

$body = @"
{
    "tenantId": "$tenantId",
    "divisionId": "$divisionId",
    "workDate": "$(Get-Date -Format 'yyyy-MM-dd')",
    "workType": "Morning Muster",
    "workerCount": 7,
    "details": "$detailsString",
    "quantity": 0
}
"@

# 3. Submit
Write-Host "Submitting Full Morning Muster with Assignments..."
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! Created Muster ID: $($response.workId)"
}
catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Response.GetResponseStream() 
}
