<#
.SYNOPSIS
  Runs the zrok link to the dashboard in this window, and starts it again if it stops. share-dashboard.ps1
  starts it at Windows logon.

.EXAMPLE
  .\scripts\run-dashboard-link.ps1 -Name "cotil-longhouse" -Zrok "$env:LOCALAPPDATA\zrok2\zrok2.exe"
#>
param(
  # Name in the link, for example cotil-longhouse for https://cotil-longhouse.shares.zrok.io.
  [Parameter(Mandatory)][string]$Name,
  # zrok2.exe that share-dashboard.ps1 installed.
  [Parameter(Mandatory)][string]$Zrok,
  # The Valheim server's log file. zrok's log goes in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Title of the window zrok runs in.
$WindowTitle = 'Valheim dashboard link (zrok)'

# Seconds to wait before starting zrok again after it stops, for example while the network is still coming up.
$RestartDelaySeconds = 30

# zrok's output, next to the server's log.
$ZrokLog = Join-Path (Split-Path -Parent $LogFile) 'zrok.log'

$Host.UI.RawUI.WindowTitle = $WindowTitle

while ($true) {
  # A share left from before a restart or crash keeps the name, and zrok then refuses to share on it. With no
  # other zrok running, that share is stale, so delete it. zrok answers 2 when no share has the name.
  if (-not (Get-Process -Name 'zrok2' -ErrorAction SilentlyContinue)) {
    & cmd.exe /c "`"$Zrok`" delete share public:$Name >nul 2>&1"
    if ($LASTEXITCODE -eq 0) { Write-LogLine $ZrokLog "Deleted a share left from an earlier run that kept $Name." }
  }

  # --headless swaps zrok's full-screen view for plain lines, which this window shows and the log keeps. cmd
  # merges zrok's error output, which PowerShell would stop on.
  & cmd.exe /c "`"$Zrok`" share public http://127.0.0.1:$Port --name-selection public:$Name --open --headless 2>&1" |
    ForEach-Object { $_; Add-Content -LiteralPath $ZrokLog -Value $_ -Encoding UTF8 }
  Write-LogLine $ZrokLog "zrok stopped with exit code $LASTEXITCODE. Starting again in $RestartDelaySeconds seconds."
  Start-Sleep -Seconds $RestartDelaySeconds
}
