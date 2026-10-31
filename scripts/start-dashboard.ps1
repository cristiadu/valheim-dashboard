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
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Seconds to wait before starting again after the dashboard stops.
$RestartDelaySeconds = 5

# Repo folder, one level above this script.
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Built server entry point.
$BuildEntry = Join-Path $RepoRoot 'apps\dashboard\build\index.js'

# File that collects the dashboard's output, next to the server's log so every log stays in one folder.
$OutputLog = Join-Path (Split-Path -Parent $LogFile) 'dashboard.log'

Set-Location $RepoRoot
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputLog) | Out-Null

if ($Rebuild -or -not (Test-Path $BuildEntry)) {
  Write-LogLine $OutputLog 'Installing packages and building the dashboard'
  Invoke-Pnpm $RepoRoot @('install', '--frozen-lockfile')
  Invoke-Pnpm $RepoRoot @('--filter', 'dashboard', 'build')
}

if (-not (Test-Path $LogFile)) {
  Write-LogLine $OutputLog "Warning: $LogFile does not exist yet. The dashboard waits for it."
}

$env:LOG_FILE = $LogFile
$env:PORT = "$Port"

while ($true) {
  Write-LogLine $OutputLog "Starting the dashboard on http://localhost:$Port"
  # cmd redirects the output as-is: PowerShell 5.1 would write UTF-16 and stop on node's stderr.
  & cmd.exe /c "node `"$BuildEntry`" >> `"$OutputLog`" 2>&1"
  Write-LogLine $OutputLog "The dashboard stopped with exit code $LASTEXITCODE. Starting again in $RestartDelaySeconds seconds."
  Start-Sleep -Seconds $RestartDelaySeconds
}
