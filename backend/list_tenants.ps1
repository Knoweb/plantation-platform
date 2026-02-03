$tenants = Invoke-RestMethod -Uri "http://localhost:8081/api/tenants"
foreach ($t in $tenants) {
    Write-Host "$($t.id) : $($t.companyName)"
}
