<#
.SYNOPSIS
  Runs update-from-main.ps1 every few minutes in this one window. install-startup.ps1 starts it at Windows logon.

.EXAMPLE
  .\scripts\watch-main.ps1
  .\scripts\watch-main.ps1 -LogFile "D:\Valheim\logs.txt" -Port 8080
#>
param(
  # The Valheim server's log file.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

# Minutes between update runs.
$UpdateIntervalMinutes = 5

# Title of the window the updater runs in.
$WindowTitle = 'Valheim dashboard updater'

$updateScript = Join-Path $PSScriptRoot 'update-from-main.ps1'
$Host.UI.RawUI.WindowTitle = $WindowTitle

while ($true) {
  # Each run is its own PowerShell inside this window, so a failed run never ends the loop, and each run reads
  # update-from-main.ps1 as main has it now.
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $updateScript -LogFile $LogFile -Port $Port
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Checked main. Next check in $UpdateIntervalMinutes minutes."
  Start-Sleep -Seconds ($UpdateIntervalMinutes * 60)
}
