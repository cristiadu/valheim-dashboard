<#
.SYNOPSIS
  Builds the dashboard when needed, starts it, and starts it again if it stops.

.EXAMPLE
  .\scripts\start-dashboard.ps1
  .\scripts\start-dashboard.ps1 -LogFile "D:\Valheim\logs.txt" -Port 8080 -Rebuild
#>
param(
  # The Valheim server's log file.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Build again even when a build exists, for example after a git pull.
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'

# Seconds to wait before starting again after the dashboard stops.
$RestartDelaySeconds = 5

# pnpm version the repo uses, run through npx so it needs no global install.
$Pnpm = 'pnpm@12.16.1'

# Repo folder, one level above this script.
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Built server entry point.
$BuildEntry = Join-Path $RepoRoot 'apps\dashboard\build\index.js'

# File that collects the dashboard's output, next to the server's log so every log stays in one folder.
$OutputLog = Join-Path (Split-Path -Parent $LogFile) 'dashboard.log'

# Writes [Message] with the time to the screen and the output log.
function Write-Status([string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Write-Host $line
  Add-Content -Path $OutputLog -Value $line
}

# Runs a pnpm command in the repo folder and stops the script if it fails.
function Invoke-Pnpm([string[]]$Arguments) {
  & npx --yes $Pnpm @Arguments
  if ($LASTEXITCODE -ne 0) { throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

Set-Location $RepoRoot
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputLog) | Out-Null

if ($Rebuild -or -not (Test-Path $BuildEntry)) {
  Write-Status 'Installing packages and building the dashboard'
  Invoke-Pnpm @('install', '--frozen-lockfile')
  Invoke-Pnpm @('--filter', 'dashboard', 'build')
}

if (-not (Test-Path $LogFile)) {
  Write-Status "Warning: $LogFile does not exist yet. The dashboard waits for it."
}

$env:LOG_FILE = $LogFile
$env:PORT = "$Port"

while ($true) {
  Write-Status "Starting the dashboard on http://localhost:$Port"
  # cmd redirects the output as-is: PowerShell 5.1 would write UTF-16 and stop on node's stderr.
  & cmd.exe /c "node `"$BuildEntry`" >> `"$OutputLog`" 2>&1"
  Write-Status "The dashboard stopped with exit code $LASTEXITCODE. Starting again in $RestartDelaySeconds seconds."
  Start-Sleep -Seconds $RestartDelaySeconds
}
