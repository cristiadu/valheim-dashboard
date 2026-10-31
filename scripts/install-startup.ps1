<#
.SYNOPSIS
  Starts the dashboard at Windows logon, and updates this PC from main every few minutes, with no windows.
  Run it once. Pass -Remove to stop both.

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
  # Remove the tasks instead of adding them.
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

# Name of the logon task in Task Scheduler.
$TaskName = 'Valheim Dashboard'

# Name of the task that runs update-from-main.ps1.
$UpdaterTaskName = 'Valheim Dashboard Updater'

# Minutes between update runs.
$UpdateIntervalMinutes = 5

# Longest an update run may take, such as a build plus waiting for the game server to save, in minutes.
$UpdateTimeLimitMinutes = 30

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Unregister-ScheduledTask -TaskName $UpdaterTaskName -Confirm:$false
  Write-Host "Removed the '$TaskName' and '$UpdaterTaskName' tasks."
  return
}

$startScript = Join-Path $PSScriptRoot 'start-dashboard.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -LogFile `"$LogFile`" -Port $Port"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

# conhost --headless gives PowerShell a console with no window, so a run never flashes or takes focus.
$updateScript = Join-Path $PSScriptRoot 'update-from-main.ps1'
$updateArguments = "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$updateScript`" -LogFile `"$LogFile`" -Port $Port"
$updateAction = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument $updateArguments
$updateTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $UpdateIntervalMinutes)
$updateSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $UpdateTimeLimitMinutes)
Register-ScheduledTask -TaskName $UpdaterTaskName -Action $updateAction -Trigger $updateTrigger -Settings $updateSettings -Force | Out-Null

Write-Host "The dashboard now starts when $env:USERNAME logs on. Start it now with: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "'$UpdaterTaskName' checks main every $UpdateIntervalMinutes minutes. Its log is updater.log next to $LogFile."
