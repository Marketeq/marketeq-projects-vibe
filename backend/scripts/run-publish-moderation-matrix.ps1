param(
  [string]$GatewayBase = "http://localhost:4000",
  [string]$Token = "",
  [string]$GoodImagePath = "",
  [string]$BadImagePath = ""
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-EnvValueFromFile {
  param(
    [string]$EnvFilePath,
    [string[]]$Keys
  )

  if (-not (Test-Path $EnvFilePath)) {
    return $null
  }

  $lines = Get-Content -Path $EnvFilePath -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith("#")) { continue }

    foreach ($key in $Keys) {
      if ($trimmed -match "^(?:export\s+)?$([regex]::Escape($key))\s*=\s*(.*)$") {
        $value = $matches[1].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
          $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
          $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [string]::IsNullOrWhiteSpace($value)) {
          return $value
        }
      }
    }
  }

  return $null
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  $Token = $env:ACCESS_TOKEN
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  $envFile = Join-Path $scriptRoot "..\\.env"
  $Token = Get-EnvValueFromFile -EnvFilePath $envFile -Keys @(
    "ACCESS_TOKEN",
    "TEST_ACCESS_TOKEN",
    "E2E_ACCESS_TOKEN",
    "JWT_TOKEN",
    "AUTH_TOKEN",
    "BEARER_TOKEN"
  )
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Host "Missing token. Set ACCESS_TOKEN env var, add token in backend/.env, or pass -Token <jwt>." -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($GoodImagePath)) {
  $GoodImagePath = Join-Path $scriptRoot "..\\..\\frontend\\public\\coding.jpg"
}
if ([string]::IsNullOrWhiteSpace($BadImagePath)) {
  $primaryBadImagePath = Join-Path $scriptRoot "..\\fixtures\\bad-image-emoji.png"
  $fallbackBadImagePath = Join-Path $scriptRoot "fixtures\\bad-image-emoji.png"
  if (Test-Path $primaryBadImagePath) {
    $BadImagePath = $primaryBadImagePath
  } else {
    $BadImagePath = $fallbackBadImagePath
  }
}

$GoodImagePath = [System.IO.Path]::GetFullPath($GoodImagePath)
$BadImagePath = [System.IO.Path]::GetFullPath($BadImagePath)

if (-not (Test-Path $GoodImagePath)) {
  Write-Host "Good image not found: $GoodImagePath" -ForegroundColor Red
  exit 1
}

$headers = @{ Authorization = "Bearer $Token" }
$projectUrl = "$GatewayBase/publish/project"
$mediaUrl = "$GatewayBase/publish/media"

function New-Payload($title, $shortDesc, $fullDesc) {
  return @{
    title = $title
    shortDescription = $shortDesc
    fullDescription = $fullDesc
    categories = @("Software Development")
    subCategories = @("Web Development")
    industries = @("Technology")
    tags = @("test")
    skills = @("typescript")
  }
}

function Extract-ProjectId($obj) {
  if ($null -eq $obj) { return $null }
  if ($obj.id) { return $obj.id }
  if ($obj.projectId) { return $obj.projectId }
  if ($obj.data) {
    if ($obj.data.id) { return $obj.data.id }
    if ($obj.data.projectId) { return $obj.data.projectId }
    if ($obj.data.project -and $obj.data.project.id) { return $obj.data.project.id }
  }
  if ($obj.project -and $obj.project.id) { return $obj.project.id }
  return $null
}

function Invoke-MediaUpload($projectId, $imagePath) {
  $authHeader = "Authorization: Bearer $Token"
  $args = @(
    "-sS",
    "-X", "POST",
    "-H", $authHeader,
    "-F", "projectId=$projectId",
    "-F", "featuredImage=@$imagePath",
    $mediaUrl
  )

  $raw = & curl.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw "Media upload failed (curl exit code $LASTEXITCODE)."
  }

  try {
    return $raw | ConvertFrom-Json
  } catch {
    return @{ raw = $raw }
  }
}

$cases = @(
  @{
    Name = "bad title + good image"
    Payload = (New-Payload "buy followers and fake reviews now" "Legit short description" "Legit full description")
    ImagePath = $GoodImagePath
  },
  @{
    Name = "bad short/long description + good image"
    Payload = (New-Payload "Normal title" "We can cheat and scam users quickly" "This project includes fraud and phishing campaigns")
    ImagePath = $GoodImagePath
  },
  @{
    Name = "bad image + good content"
    Payload = (New-Payload "Normal title" "Legit short description" "Legit full description")
    ImagePath = $BadImagePath
  },
  @{
    Name = "good content + good image"
    Payload = (New-Payload "Build responsive website" "Create a modern responsive web app" "Need full-stack implementation with testing and deployment")
    ImagePath = $GoodImagePath
  }
)

$results = @()

foreach ($case in $cases) {
  Write-Host "`n=== Running: $($case.Name) ===" -ForegroundColor Cyan

  if (-not (Test-Path $case.ImagePath)) {
    Write-Host "Skipping: image file not found -> $($case.ImagePath)" -ForegroundColor Yellow
    $results += [pscustomobject]@{
      Case = $case.Name
      ProjectStatus = "skipped"
      MediaStatus = "skipped"
      ProjectId = ""
      Reason = "Image missing"
    }
    continue
  }

  try {
    $projectResponse = Invoke-RestMethod -Method Post -Uri $projectUrl -Headers $headers -Body ($case.Payload | ConvertTo-Json -Depth 8) -ContentType "application/json"
    $projectId = Extract-ProjectId $projectResponse

    if ([string]::IsNullOrWhiteSpace($projectId)) {
      $results += [pscustomobject]@{
        Case = $case.Name
        ProjectStatus = "ok"
        MediaStatus = "failed"
        ProjectId = ""
        Reason = "projectId not found in create-project response"
      }
      Write-Host "projectId missing in response" -ForegroundColor Yellow
      continue
    }

    $mediaResponse = Invoke-MediaUpload -projectId $projectId -imagePath $case.ImagePath
    $reasonText = ""
    if ($mediaResponse.PSObject.Properties.Name -contains "reason" -and $mediaResponse.reason) {
      $reasonText = $mediaResponse.reason
    } elseif ($mediaResponse.PSObject.Properties.Name -contains "message" -and $mediaResponse.message) {
      $reasonText = $mediaResponse.message
    }

    $results += [pscustomobject]@{
      Case = $case.Name
      ProjectStatus = "ok"
      MediaStatus = "ok"
      ProjectId = $projectId
      Reason = $reasonText
    }

    Write-Host "ProjectId: $projectId" -ForegroundColor Green
    if ($mediaResponse.reason) {
      Write-Host "Moderation: $($mediaResponse.reason)" -ForegroundColor Gray
    }
  } catch {
    $results += [pscustomobject]@{
      Case = $case.Name
      ProjectStatus = "failed"
      MediaStatus = "failed"
      ProjectId = ""
      Reason = $_.Exception.Message
    }
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n=== Summary ===" -ForegroundColor Magenta
$results | Format-Table -AutoSize
