$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$gateway = "http://localhost:8080"

# 1. Get Divisions
try {
    $divResponse = Invoke-RestMethod -Uri "$gateway/api/divisions?tenantId=$tenantId" -Method Get
    $divisionId = $divResponse[0].divisionId
    Write-Host "Found Division: $divisionId"
}
catch {
    Write-Host "Failed to fetch divisions. Using fallback ID."
    $divisionId = "DIV-Test"
}

# 2. Submit Daily Work (Pending)
$work = @{
    tenantId    = $tenantId
    divisionId  = $divisionId
    workDate    = (Get-Date).ToString("yyyy-MM-dd")
    workType    = "Plucking"
    details     = "Fields: A1, A2 (Debug Submission)"
    workerCount = 15
    quantity    = 0
}
$json = $work | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$gateway/api/tenants/daily-work" -Method Post -Body $json -ContentType "application/json"
    Write-Host "Successfully Submitted Work: $json"
}
catch {
    Write-Error "Failed to submit work: $_"
}
