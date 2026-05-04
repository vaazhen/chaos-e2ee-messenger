param(
    [string]$BaseUrl = "http://localhost:8080",
    [int]$Vus = 2,
    [string]$Duration = "30s",
    [double]$SleepSeconds = 1
)

$ErrorActionPreference = "Stop"

$env:BASE_URL = $BaseUrl
$env:VUS = "$Vus"
$env:DURATION = $Duration
$env:SLEEP_SECONDS = "$SleepSeconds"
$env:RUN_ID = (Get-Date -Format "yyyyMMddHHmmss")

New-Item -ItemType Directory -Force ".\load-tests\results" | Out-Null

$k6Command = Get-Command k6 -ErrorAction SilentlyContinue

if ($k6Command) {
    $k6Exe = $k6Command.Source
} else {
    $k6Exe = Get-ChildItem "C:\Program Files", "$env:LOCALAPPDATA" -Filter k6.exe -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $k6Exe) {
    throw "k6.exe not found. Reopen PowerShell or reinstall k6."
}

$safeDuration = $Duration -replace '[^a-zA-Z0-9]', ''
$safeSleep = "$SleepSeconds" -replace '[^a-zA-Z0-9]', ''
$summaryPath = ".\load-tests\results\direct-vus-$Vus-duration-$safeDuration-sleep-$safeSleep-$env:RUN_ID.json"

Write-Host "K6=$k6Exe"
Write-Host "BASE_URL=$env:BASE_URL"
Write-Host "VUS=$env:VUS"
Write-Host "DURATION=$env:DURATION"
Write-Host "SLEEP_SECONDS=$env:SLEEP_SECONDS"
Write-Host "RUN_ID=$env:RUN_ID"
Write-Host "SUMMARY=$summaryPath"

& $k6Exe run `
  --summary-export $summaryPath `
  ".\load-tests\k6\direct-smoke.js"
