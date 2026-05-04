param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Profile = "full"
)

$ErrorActionPreference = "Stop"

$root = Get-Location
$runId = Get-Date -Format "yyyyMMddHHmmss"
$resultRoot = Join-Path $root "load-tests\results\full-direct-$runId"

New-Item -ItemType Directory -Force $resultRoot | Out-Null

function Write-Section($text) {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host $text
    Write-Host "============================================================"
}

function Save-HostSnapshot($dir, $phase) {
    try {
        docker ps | Out-File (Join-Path $dir "docker-ps-$phase.txt") -Encoding UTF8
    } catch {
        "docker ps failed: $($_.Exception.Message)" | Out-File (Join-Path $dir "docker-ps-$phase.txt") -Encoding UTF8
    }

    try {
        docker stats --no-stream | Out-File (Join-Path $dir "docker-stats-$phase.txt") -Encoding UTF8
    } catch {
        "docker stats failed: $($_.Exception.Message)" | Out-File (Join-Path $dir "docker-stats-$phase.txt") -Encoding UTF8
    }

    try {
        Get-Process java -ErrorAction SilentlyContinue |
            Select-Object Id, ProcessName, CPU, WorkingSet64, PrivateMemorySize64, StartTime |
            Format-Table -AutoSize |
            Out-File (Join-Path $dir "java-process-$phase.txt") -Encoding UTF8
    } catch {
        "java process snapshot failed: $($_.Exception.Message)" | Out-File (Join-Path $dir "java-process-$phase.txt") -Encoding UTF8
    }
}

function Run-Case($Name, $Vus, $Duration, $SleepSeconds) {
    $caseDir = Join-Path $resultRoot $Name
    New-Item -ItemType Directory -Force $caseDir | Out-Null

    Write-Section "RUN $Name | VUS=$Vus | DURATION=$Duration | SLEEP=$SleepSeconds"

    Save-HostSnapshot $caseDir "before"

    $consoleLog = Join-Path $caseDir "console-log.txt"

    $env:BASE_URL = $BaseUrl
    $env:VUS = "$Vus"
    $env:DURATION = $Duration
    $env:SLEEP_SECONDS = "$SleepSeconds"
    $env:RUN_ID = "$runId-$Name"

    Write-Host "BASE_URL=$env:BASE_URL"
    Write-Host "VUS=$env:VUS"
    Write-Host "DURATION=$env:DURATION"
    Write-Host "SLEEP_SECONDS=$env:SLEEP_SECONDS"
    Write-Host "RUN_ID=$env:RUN_ID"
    Write-Host "CASE_DIR=$caseDir"

    & .\load-tests\run-direct-smoke.ps1 `
        -BaseUrl $BaseUrl `
        -Vus $Vus `
        -Duration $Duration `
        -SleepSeconds $SleepSeconds *>&1 |
        Tee-Object -FilePath $consoleLog

    Save-HostSnapshot $caseDir "after"

    Write-Host "Saved case results to: $caseDir"
}

Write-Section "FULL DIRECT LOAD BATTERY"
Write-Host "Profile: $Profile"
Write-Host "Result root: $resultRoot"

if ($Profile -eq "quick") {
    Run-Case "01-baseline-5vu-1m-sleep1"       5   "1m"   1
    Run-Case "02-heavy-2vu-5m-sleep0"          2   "5m"   0
    Run-Case "03-parallel-10vu-5m-sleep0"      10  "5m"   0
}
elseif ($Profile -eq "full") {
    Run-Case "01-baseline-5vu-2m-sleep1"       5   "2m"   1
    Run-Case "02-normal-25vu-5m-sleep1"        25  "5m"   1
    Run-Case "03-heavy-2vu-10m-sleep0"         2   "10m"  0
    Run-Case "04-stress-10vu-10m-sleep0"       10  "10m"  0
    Run-Case "05-spike-50vu-5m-sleep0"         50  "5m"   0
    Run-Case "06-soak-5vu-30m-sleep0"          5   "30m"  0
}
elseif ($Profile -eq "brutal") {
    Run-Case "01-baseline-10vu-2m-sleep1"      10  "2m"   1
    Run-Case "02-stress-25vu-10m-sleep0"       25  "10m"  0
    Run-Case "03-spike-75vu-5m-sleep0"         75  "5m"   0
    Run-Case "04-soak-10vu-30m-sleep0"         10  "30m"  0
    Run-Case "05-brutal-50vu-15m-sleep0"       50  "15m"  0
}
else {
    throw "Unknown profile: $Profile. Use quick, full, or brutal."
}

Write-Section "DONE"
Write-Host "All results saved to: $resultRoot"
