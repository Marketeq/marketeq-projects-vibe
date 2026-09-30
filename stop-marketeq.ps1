# stop-marketeq.ps1 — Stops the local Marketeq dev stack (infra + core backend + frontend)
# Run with: powershell -ExecutionPolicy Bypass -File .\stop-marketeq.ps1

Write-Host "Stopping backend/frontend dev servers on known ports..." -ForegroundColor Yellow
$ports = 3000, 3001, 3002, 3004, 4000
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    try {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped process on port $port (PID $($conn.OwningProcess))" -ForegroundColor Green
    } catch {}
  }
}

Write-Host "Stopping infrastructure containers (postgres, rabbitmq, redis)..." -ForegroundColor Yellow
docker stop marketeq-postgres marketeq-rabbitmq marketeq-redis | Out-Null
Write-Host "Infra containers stopped." -ForegroundColor Green

Write-Host ""
Write-Host "Done. Any now-empty PowerShell windows left over from the services can be closed manually." -ForegroundColor Cyan
Write-Host "Run start-marketeq.ps1 again any time to bring the stack back up." -ForegroundColor Cyan
