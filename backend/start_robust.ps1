$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"
$mvnCmd = "$baseDir\tools\apache-maven-3.9.6\bin\mvn.cmd"

function Start-ServiceWithDelay {
    param($name, $path, $delay)
    Write-Host "Starting $name..."
    $serviceDir = Join-Path $baseDir $path
    # We use -NoExit so the window stays open if it fails
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serviceDir'; & '$mvnCmd' spring-boot:run"
    Write-Host "Waiting $delay seconds for $name to initialize..."
    Start-Sleep -Seconds $delay
}

Start-ServiceWithDelay "Discovery Server" "discovery-server" 25
Start-ServiceWithDelay "API Gateway" "api-gateway" 15
Start-ServiceWithDelay "Tenant Service" "tenant-service" 10
Start-ServiceWithDelay "Inventory Service" "inventory-service" 10
Start-ServiceWithDelay "Operation Service" "operation-service" 5

Write-Host "All services triggered. Check the individual windows for status."
