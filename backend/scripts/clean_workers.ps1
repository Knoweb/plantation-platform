$t = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"
$u = "http://localhost:8081/api"

Write-Host "Fetching workers..."
try {
    $existing = Invoke-RestMethod "${u}/workers?tenantId=${t}"
    Write-Host "Found $(@($existing).Count) workers. Deleting..."
    foreach ($w in $existing) {
        Invoke-RestMethod "${u}/workers/$($w.id)" -Method Delete
        Write-Host "Deleted $($w.name)"
    }
    Write-Host "All workers deleted."
}
catch {
    Write-Host "Error: $_"
}
