$mvnPath = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend\tools\apache-maven-3.9.6\bin\mvn.cmd"
$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"

$services = @(
    @{ Name = "discovery-server"; Path = "discovery-server" },
    @{ Name = "api-gateway"; Path = "api-gateway" },
    @{ Name = "tenant-service"; Path = "tenant-service" },
    @{ Name = "inventory-service"; Path = "inventory-service" },
    @{ Name = "operation-service"; Path = "operation-service" }
)

Write-Host "Stopping any existing Java processes..."
Stop-Process -Name "java" -ErrorAction SilentlyContinue -Force

foreach ($service in $services) {
    $serviceName = $service.Name
    $servicePath = Join-Path $baseDir $service.Path
    $logFile = Join-Path $baseDir "$serviceName.log"
    
    Write-Host "Starting $serviceName..."
    
    # Start process with native PowerShell redirection using Start-Process
    # We must call cmd /c to run the batch file
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$mvnPath`" spring-boot:run" -WorkingDirectory $servicePath -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru -NoNewWindow
    
    # Wait for success in log
    $started = $false
    $timer = 0
    $timeout = 240 # 4 minutes max per service (first time build can be slow)
    
    while ($timer -lt $timeout) {
        if (Test-Path $logFile) {
            # Read shared allowing others to write is cleaner, but Get-Content usually handles it.
            # Using -Tail to avoid reading huge files repeatedly
            try {
                $content = Get-Content $logFile -Tail 50 -ErrorAction SilentlyContinue
                if ($content) {
                    if ($content | Select-String "Started .*Application") {
                        Write-Host "SUCCESS: $serviceName is up." -ForegroundColor Green
                        $started = $true
                        break
                    }
                    if ($content | Select-String "BUILD FAILURE") {
                        Write-Host "FAILURE: $serviceName build failed." -ForegroundColor Red
                        $content | Select-Object -Last 20
                        exit 1
                    }
                    if ($content | Select-String "APPLICATION FAILED TO START") {
                        Write-Host "FAILURE: $serviceName failed to start." -ForegroundColor Red
                        $content | Select-Object -Last 20
                        exit 1
                    }
                }
            }
            catch {
                # file locked or not ready
            }
        }
        Start-Sleep -Seconds 3
        $timer += 3
        Write-Host -NoNewline "."
    }
    
    if (-not $started) {
        Write-Host "TIMEOUT: $serviceName did not start in time."
        if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
        exit 1
    }
    
    # Small buffer
    Start-Sleep -Seconds 5
}

Write-Host "`nAll backend services started successfully."
