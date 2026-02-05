$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$baseUrl = "http://localhost:8081/api/workers"

# Fetch all workers
$url = "http://localhost:8081/api/workers?tenantId=$tenantId"
Write-Host "Fetching all workers from $url..." -ForegroundColor Cyan
try {
    $workers = Invoke-RestMethod -Uri $url -Method Get
}
catch {
    Write-Host "Failed to fetch workers: $_" -ForegroundColor Red
    exit
}

if ($workers.Count -eq 0) {
    Write-Host "No workers found to delete." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($workers.Count) workers. Deleting..." -ForegroundColor Cyan

foreach ($w in $workers) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/$($w.id)" -Method Delete
        Write-Host "Deleted $($w.name) ($($w.jobRole))" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to delete $($w.name): $_" -ForegroundColor Red
    }
}
Write-Host "All workers deleted." -ForegroundColor Green
