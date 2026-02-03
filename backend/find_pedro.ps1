$tenants = Invoke-RestMethod -Uri "http://localhost:8081/api/tenants"
$pedro = $tenants | Where-Object { $_.companyName -eq "Pedro Estate" }
if ($pedro) {
    Write-Host "FOUND_ID:$($pedro.tenantId)"
}
else {
    Write-Host "Pedro Estate not found"
}
