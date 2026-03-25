
# Service definitions with their health-check ports
$services = @(
    @{ Name = "discovery-server"; Port = 8761 },
    @{ Name = "tenant-service";   Port = 8081 },
    @{ Name = "operation-service"; Port = 8084 },
    @{ Name = "inventory-service"; Port = 8083 },
    @{ Name = "api-gateway";       Port = $null } # Gateway starts last, no waiting needed
)

$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"
$mvnExecutable = "$baseDir\tools\apache-maven-3.9.6\bin\mvn.cmd"

function Wait-ForPort {
    param(
        [string]$ServiceName,
        [int]$Port,
        [int]$TimeoutSeconds = 90
    )

    Write-Host "  Waiting for $ServiceName on port $Port..." -ForegroundColor DarkGray

    $elapsed = 0
    $interval = 3

    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", $Port)
            $tcp.Close()
            Write-Host "  [OK] $ServiceName is listening on :$Port (${elapsed}s)" -ForegroundColor Green
            # Extra 3s buffer for Spring to finish wiring up after port opens
            Start-Sleep -Seconds 3
            return $true
        } catch {
            # Port not open yet, keep polling
        }
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }

    Write-Host "  [WARN] $ServiceName port $Port not ready after ${TimeoutSeconds}s. Proceeding anyway." -ForegroundColor Yellow
    return $false
}

foreach ($service in $services) {
    $serviceName = $service.Name
    $serviceDir = Join-Path $baseDir $serviceName

    if (-not (Test-Path $serviceDir)) {
        Write-Host "Skipping missing service directory: $serviceDir" -ForegroundColor Yellow
        continue
    }

    Write-Host "Starting $serviceName..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serviceDir'; & '$mvnExecutable' spring-boot:run"

    # Wait for port to open (all services except gateway)
    if ($service.Port) {
        Wait-ForPort -ServiceName $serviceName -Port $service.Port
    }
}

# Finally, start the Python AI Service!
$aiServiceDir = Join-Path $baseDir "ai-service"
if (Test-Path $aiServiceDir) {
    Write-Host "Starting ai-service (Python CrewAI)..." -ForegroundColor Magenta
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$aiServiceDir'; py -3.12 main.py"
    Write-Host "AI Service launched!" -ForegroundColor Green
} else {
    Write-Host "Skipping ai-service directory: not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All services are UP!" -ForegroundColor Green
