$baseUrl = "http://localhost:8081/api"
$tenantId = "f064941a-5ee8-46e7-8fc5-8d8742a1225d"

# 1. Fetch Existing Divisions
Write-Host "Fetching Divisions..." -ForegroundColor Cyan
try {
    $divisions = Invoke-RestMethod -Uri "$baseUrl/divisions?tenantId=$tenantId" -Method Get
}
catch {
    Write-Host "Failed to fetch divisions." -ForegroundColor Red
    exit
}

Write-Host "Found $($divisions.Count) divisions total." -ForegroundColor Green

# 2. Define Keep List (Standard Names)
$keepNames = @("Lower Division", "Upper Division", "Middle Division", "Estate Division")
$preservedIds = @()

# 3. Identify Divisions to Keep vs. Delete
foreach ($name in $keepNames) {
    # Find matching divisions
    $matches = $divisions | Where-Object { $_.name -eq $name }
    
    if ($matches) {
        # Keep the FIRST one found (arbitrary but consistent)
        $keep = $matches | Select-Object -First 1
        $preservedIds += $keep.divisionId
        Write-Host "  KEEP: $($keep.name) ($($keep.divisionId))" -ForegroundColor Green
        
        # If there are duplicates of the SAME valid name, mark others for deletion
        if ($matches.Count -gt 1) {
            $dupes = $matches | Where-Object { $_.divisionId -ne $keep.divisionId }
            foreach ($d in $dupes) {
                Write-Host "  DELETE Duplicate: $($d.name) ($($d.divisionId))" -ForegroundColor Yellow
                try {
                    Invoke-RestMethod -Uri "$baseUrl/divisions/$($d.divisionId)" -Method Delete
                    Write-Host "    [Deleted]" -ForegroundColor DarkGray
                }
                catch {
                    Write-Host "    [Failed to Delete]" -ForegroundColor Red
                }
            }
        }
    }
    else {
        Write-Host "  MISSING: $name (Will stay missing until seeded again)" -ForegroundColor Red
    }
}

# 4. Delete Everything Else (Typos, weird names)
$others = $divisions | Where-Object { $keepNames -notcontains $_.name }

foreach ($d in $others) {
    # Double check it's not in the preserved list (redundant but safe)
    if ($preservedIds -notcontains $d.divisionId) {
        Write-Host "  DELETE Invalid/Typo: $($d.name) ($($d.divisionId))" -ForegroundColor Magenta
        try {
            Invoke-RestMethod -Uri "$baseUrl/divisions/$($d.divisionId)" -Method Delete
            Write-Host "    [Deleted]" -ForegroundColor DarkGray
        }
        catch {
            Write-Host "    [Failed to Delete]" -ForegroundColor Red
        }
    }
}

Write-Host "Cleanup Complete! Refresh your dashboard." -ForegroundColor Green
