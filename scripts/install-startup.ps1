<#
.SYNOPSIS
  Starts the dashboard at Windows logon, in a hidden window. Run it once.
  Pass -Remove to stop starting it at logon.

.EXAMPLE
  .\scripts\install-startup.ps1
  .\scripts\install-startup.ps1 -LogFile "D:\Valheim\logs.txt" -Port 8080
  .\scripts\install-startup.ps1 -Remove
#>
param(
  # The Valheim server's log file.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Remove the logon task instead of adding it.
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

# Name of the task in Task Scheduler.
$TaskName = 'Valheim Dashboard'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed the '$TaskName' task."
  return
}

$startScript = Join-Path $PSScriptRoot 'start-dashboard.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -LogFile `"$LogFile`" -Port $Port"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "The dashboard now starts when $env:USERNAME logs on. Start it now with: Start-ScheduledTask -TaskName '$TaskName'"
