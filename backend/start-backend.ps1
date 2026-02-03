$services = @(
    "discovery-server",
    "api-gateway",
    "tenant-service",
    "inventory-service",
    "operation-service"
)

$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"
$mvnExecutable = "$baseDir\tools\apache-maven-3.9.6\bin\mvn.cmd"

foreach ($service in $services) {
    Write-Host "Starting $service..."
    $serviceDir = Join-Path $baseDir $service
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serviceDir'; & '$mvnExecutable' spring-boot:run"
}
