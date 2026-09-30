# start-marketeq.ps1 — Starts the local Marketeq dev stack (infra + core backend + frontend)
# Run with: powershell -ExecutionPolicy Bypass -File .\start-marketeq.ps1

$root = $PSScriptRoot

Write-Host "Starting infrastructure containers (postgres, rabbitmq, redis)..." -ForegroundColor Yellow
docker start marketeq-postgres marketeq-rabbitmq marketeq-redis 2>$null | Out-Null
Start-Sleep -Seconds 3
Write-Host "Infra containers started." -ForegroundColor Green

$services = @(
  @{ Name = "api-gateway";      Port = 4000 },
  @{ Name = "auth-service";     Port = 3001 },
  @{ Name = "user-service";     Port = 3002 },
  @{ Name = "listings-service"; Port = 3004 }
)

foreach ($svc in $services) {
  $title = $svc.Name
  $cmd = "`$Host.UI.RawUI.WindowTitle = '$title'; cd '$root\backend'; `$env:PORT='$($svc.Port)'; npx nest start $($svc.Name) --watch"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
  Write-Host "Launched $($svc.Name) on port $($svc.Port) in a new window." -ForegroundColor Green
}

$frontendCmd = "`$Host.UI.RawUI.WindowTitle = 'frontend'; cd '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Write-Host "Launched frontend in a new window." -ForegroundColor Green

Write-Host ""
Write-Host "All services are launching in separate windows. Give them 20-30s to compile," -ForegroundColor Cyan
Write-Host "then open http://localhost:3000" -ForegroundColor Cyan
