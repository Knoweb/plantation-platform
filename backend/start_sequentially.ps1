$mvnPath = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend\tools\apache-maven-3.9.6\bin\mvn.cmd"
$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"

$services = @(
    @{ Name = "discovery-server"; Path = "discovery-server"; Port = 8761 },
    @{ Name = "api-gateway"; Path = "api-gateway"; Port = 8080 },
    @{ Name = "tenant-service"; Path = "tenant-service"; Port = 8081 },
    @{ Name = "inventory-service"; Path = "inventory-service"; Port = 8082 },
    @{ Name = "operation-service"; Path = "operation-service"; Port = 8083 }
)

function Wait-For-Service {
    param (
        [string]$LogFile,
        [string]$ServiceName
    )
    Write-Host "Waiting for $ServiceName to start..."
    $timeout = 180 # seconds
    $timer = 0
    while ($timer -lt $timeout) {
        if (Test-Path $LogFile) {
            $content = Get-Content $LogFile -Tail 20
            if ($content | Select-String "Started .*Application") {
                Write-Host "$ServiceName STARTED SUCCESSFULLY." -ForegroundColor Green
                return $true
            }
            if ($content | Select-String "BUILD FAILURE") {
                Write-Host "$ServiceName FAILED TO BUILD." -ForegroundColor Red
                Get-Content $LogFile | Select-Object -Last 50
                return $false
            }
            if ($content | Select-String "APPLICATION FAILED TO START") {
                Write-Host "$ServiceName FAILED TO START." -ForegroundColor Red
                Get-Content $LogFile | Select-Object -Last 50
                return $false
            }
        }
        Start-Sleep -Seconds 2
        $timer += 2
        Write-Host -NoNewline "."
    }
    Write-Host "`nTimed out waiting for $ServiceName." -ForegroundColor Red
    return $false
}

# Stop existing java processes (harsh but necessary to ensure ports are free)
Write-Host "Stopping any existing Java processes..."
Stop-Process -Name "java" -ErrorAction SilentlyContinue -Force

foreach ($service in $services) {
    $serviceName = $service.Name
    $servicePath = Join-Path $baseDir $service.Path
    $logFile = Join-Path $baseDir "$serviceName.log"
    
    # Clean old log
    if (Test-Path $logFile) { Remove-Item $logFile }

    Write-Host "`n--------------------------------------------------"
    Write-Host "Starting $serviceName..."
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "cmd.exe"
    $processInfo.Arguments = "/c `"$mvnPath`" spring-boot:run > `"$logFile`" 2>&1"
    $processInfo.WorkingDirectory = $servicePath
    $processInfo.WindowStyle = "Hidden" 
    $processInfo.CreateNoWindow = $true
    
    # We use Start-Process to detach slightly, but since we redirect to file, we can monitor it.
    # Actually, using Start-Process with cmd /c and redirection is tricky in PS if we want to detach but keep running.
    # Let's try direct process start.
    [System.Diagnostics.Process]::Start($processInfo) | Out-Null
    
    $success = Wait-For-Service -LogFile $logFile -ServiceName $serviceName
    
    if (-not $success) {
        Write-Host "Aborting sequence due to failure in $serviceName."
        exit 1
    }
    
    # Give it a few extra seconds to settle
    Start-Sleep -Seconds 5
}

Write-Host "`nAll services attempted."
