#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts all I.P. & M.D Platform services.
.DESCRIPTION
    Launches Docker infrastructure, FastAPI backend, AI service, and Next.js frontend.
    Press Ctrl+C to stop all services.
#>

$ErrorActionPreference = "Continue"
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  I.P. & M.D Platform — Starting Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Docker Infrastructure ───
Write-Host "[1/4] Starting Docker infrastructure..." -ForegroundColor Yellow
$dockerRunning = $false
try { docker info 2>&1 | Out-Null; $dockerRunning = $true } catch {}

if ($dockerRunning) {
    docker-compose up -d 2>&1
    Write-Host "  OK   PostgreSQL (port 5434) + Redis (port 6379)" -ForegroundColor Green
    Write-Host "  Waiting for PostgreSQL..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 3
} else {
    Write-Host "  SKIP Docker Desktop not running. Starting services without Docker." -ForegroundColor DarkYellow
    Write-Host "  (Start Docker Desktop manually if you need the database)" -ForegroundColor DarkGray
}

# ─── 2. Database Migrations ───
Write-Host "[2/4] Running database migrations..." -ForegroundColor Yellow
$apiDir = Join-Path $PROJECT_ROOT "services\api"
$venvPython = Join-Path $apiDir ".venv\Scripts\python.exe"
$pyExe = if (Test-Path $venvPython) { $venvPython } else { "python" }

Push-Location $apiDir
& $pyExe -m alembic upgrade head 2>&1 | Out-Null
Pop-Location
Write-Host "  OK   Migrations done" -ForegroundColor Green

# ─── 3. Seed Demo Users ───
Write-Host "[3/4] Seeding demo users..." -ForegroundColor Yellow
Push-Location $apiDir
& $pyExe -m app.seed 2>&1
Pop-Location
Write-Host "  OK   Seed done" -ForegroundColor Green

# ─── 4. Start All Services ───
Write-Host "[4/4] Starting services..." -ForegroundColor Yellow
Write-Host ""

$venvUvicorn = Join-Path $apiDir ".venv\Scripts\uvicorn.exe"
$uvicornExe = if (Test-Path $venvUvicorn) { $venvUvicorn } else { "uvicorn" }

# API Backend (port 8000)
$apiJob = Start-Job -ScriptBlock {
    param($apiDir, $uvicornExe)
    Set-Location $apiDir
    & $uvicornExe app.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $apiDir, $uvicornExe
Write-Host "  API Backend    → http://localhost:8000  (job $($apiJob.Id))" -ForegroundColor Green

# AI Service (port 8001)
$aiDir = Join-Path $PROJECT_ROOT "services\ai"
$aiJob = Start-Job -ScriptBlock {
    param($aiDir, $uvicornExe)
    Set-Location $aiDir
    & $uvicornExe app.main:app --host 0.0.0.0 --port 8001 --reload
} -ArgumentList $aiDir, $uvicornExe
Write-Host "  AI Service     → http://localhost:8001  (job $($aiJob.Id))" -ForegroundColor Green

# Next.js Frontend (port 3000)
$webDir = Join-Path $PROJECT_ROOT "apps\web"
$webJob = Start-Job -ScriptBlock {
    param($webDir)
    Set-Location $webDir
    npm run dev
} -ArgumentList $webDir
Write-Host "  Web Frontend   → http://localhost:3000  (job $($webJob.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:       http://localhost:8000/docs" -ForegroundColor White
Write-Host "  AI:        http://localhost:8001/docs" -ForegroundColor White
Write-Host "  Database:  localhost:5434 (if Docker running)" -ForegroundColor White
Write-Host "  Redis:     localhost:6379 (if Docker running)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        Receive-Job -Job $apiJob, $aiJob, $webJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    Stop-Job -Job $apiJob, $aiJob, $webJob -ErrorAction SilentlyContinue
    Remove-Job -Job $apiJob, $aiJob, $webJob -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
