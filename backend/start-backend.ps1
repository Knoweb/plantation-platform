$services = @(
    @{ Name = "discovery-server"; DelaySeconds = 12 },
    @{ Name = "tenant-service"; DelaySeconds = 10 },
    @{ Name = "operation-service"; DelaySeconds = 8 },
    @{ Name = "inventory-service"; DelaySeconds = 8 },
    @{ Name = "api-gateway"; DelaySeconds = 0 }
)

$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"
$mvnExecutable = "$baseDir\tools\apache-maven-3.9.6\bin\mvn.cmd"

foreach ($service in $services) {
    $serviceName = $service.Name
    $delaySeconds = $service.DelaySeconds
    $serviceDir = Join-Path $baseDir $serviceName

    if (-not (Test-Path $serviceDir)) {
        Write-Host "Skipping missing service directory: $serviceDir" -ForegroundColor Yellow
        continue
    }

    Write-Host "Starting $serviceName..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serviceDir'; & '$mvnExecutable' spring-boot:run"

    if ($delaySeconds -gt 0) {
        Write-Host "Waiting $delaySeconds seconds before starting the next service..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $delaySeconds
    }
}
