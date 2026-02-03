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
    
    # Remove old log
    if (Test-Path $logFile) { Remove-Item $logFile }

    Write-Host "Starting $serviceName..."
    
    # Start process strictly using Start-Process to handle spaces and redirection correctly
    $p = Start-Process -FilePath $mvnPath -ArgumentList "spring-boot:run" -WorkingDirectory $servicePath -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru -NoNewWindow
    
    # Wait for success in log
    $started = $false
    $timer = 0
    $initialWait = 10 # Wait a bit for file to be created
    Start-Sleep -Seconds 5
    
    $timeout = 240 # 4 minutes max per service
    
    while ($timer -lt $timeout) {
        if ($p.HasExited) {
            Write-Host "PROCESS EXITED PREMATURELY." -ForegroundColor Red
            if (Test-Path $logFile) { Get-Content $logFile | Select-Object -Last 20 }
            exit 1
        }

        if (Test-Path $logFile) {
            try {
                # Read with sharing allowed using .NET as Get-Content can sometimes lock
                $stream = [System.IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                
                if ($content -match "Started .*Application") {
                    Write-Host "SUCCESS: $serviceName is up." -ForegroundColor Green
                    $started = $true
                    break
                }
                if ($content -match "BUILD FAILURE") {
                    Write-Host "FAILURE: $serviceName build failed." -ForegroundColor Red
                    $content.Split("`n") | Select-Object -Last 20
                    exit 1
                }
                if ($content -match "APPLICATION FAILED TO START") {
                    Write-Host "FAILURE: $serviceName failed to start (app error)." -ForegroundColor Red
                    $content.Split("`n") | Select-Object -Last 20
                    exit 1
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
