# PowerShell startup script for Relay
$ErrorActionPreference = "Stop"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  RELAY - TCP/HTTP Session Proxy and Load Balancer" -ForegroundColor Cyan
Write-Host "  Computer Networks Monorepo" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Resolve JDK
$javaCandidates = @(
    $env:JAVA_HOME,
    "E:\jdk-21\jdk-21.0.6+7",
    "C:\Users\DELL\AppData\Local\jdk-21\jdk-21.0.6+7",
    "C:\Program Files\Java\jdk-21",
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
)

$foundJava = $null
foreach ($cand in $javaCandidates) {
    if ($cand -and (Test-Path "$cand\bin\java.exe")) {
        $foundJava = $cand
        break
    }
}

if (-not $foundJava) {
    $whereJava = (Get-Command java -ErrorAction SilentlyContinue).Source
    if ($whereJava) {
        $foundJava = (Split-Path (Split-Path $whereJava -Parent) -Parent)
    }
}

if (-not $foundJava) {
    Write-Host "[ERROR] JAVA_HOME is not set or invalid. Please configure a Java 17+ JDK." -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $foundJava
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
Write-Host "[INFO] Using Java at $env:JAVA_HOME" -ForegroundColor Green

# 2. Build UI if needed
if (-not (Test-Path "web\dist\index.html")) {
    Write-Host "[1/3] Building Web Dashboard bundle..." -ForegroundColor Yellow
    Push-Location web
    npm install
    npm run build
    Pop-Location
} else {
    Write-Host "[1/3] Web Dashboard bundle is ready." -ForegroundColor Green
}

# 3. Banner
Write-Host "[2/3] Compiling and starting Relay Engine and Control-Plane..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  SERVICES LISTENING:" -ForegroundColor White
Write-Host "  - Web Management UI:      http://localhost:8000/" -ForegroundColor Green
Write-Host "  - Control-Plane REST API: http://localhost:8000/api/..." -ForegroundColor Green
Write-Host "  - Live WebSocket Stream:  ws://localhost:8000/live" -ForegroundColor Green
Write-Host "  - Raw Socket Load Balancer Engine: http://localhost:8080/" -ForegroundColor Green
Write-Host "    - /api/*    --> API Pool (Ports 9001, 9002)" -ForegroundColor Gray
Write-Host "    - /static/* --> Static Pool (Ports 9003, 9004)" -ForegroundColor Gray
Write-Host ""
Write-Host "  DEMO CREDENTIALS:" -ForegroundColor Yellow
Write-Host "  - Email:    demo@relay.dev" -ForegroundColor White
Write-Host "  - Password: Demo@1234" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

& .\gradlew.bat :api:run
