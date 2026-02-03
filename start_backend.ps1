$baseDir = "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\plantation2\Plantation-Platform\backend"
$mvn = "$baseDir\tools\apache-maven-3.9.6\bin\mvn.cmd"

Write-Host "Starting Plantation Platform Backend Cluster..." -ForegroundColor Green
Write-Host "Using Maven at: $mvn" -ForegroundColor Gray

# 1. Start Discovery Server
Write-Host "1. Launching Discovery Server (Eureka)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\discovery-server'; & '$mvn' spring-boot:run"

# Wait for Eureka to initiate
Write-Host "   Waiting 10 seconds for Eureka to warm up..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 2. Start Tenant Service
Write-Host "2. Launching Tenant Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\tenant-service'; & '$mvn' spring-boot:run"

# 3. Start Inventory Service
Write-Host "3. Launching Inventory Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\inventory-service'; & '$mvn' spring-boot:run"

# 4. Start Operation Service
Write-Host "4. Launching Operation Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\operation-service'; & '$mvn' spring-boot:run"

# 3. Start API Gateway
Write-Host "3. Launching API Gateway..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\api-gateway'; & '$mvn' spring-boot:run"

Write-Host "All services sent to launch. Please check the new popup windows for logs." -ForegroundColor Green
Write-Host "Discovery Console: http://localhost:8761"
Write-Host "Gateway: http://localhost:8080"
