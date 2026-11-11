<#
.SYNOPSIS
  Starts the game server and the dashboard at Windows logon, and updates this PC from main every few minutes,
  each in a window you can see. Run it once. Pass -Remove to stop all three.

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
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Name of the logon task in Task Scheduler.
$TaskName = 'Valheim Dashboard'

# Name of the logon task that runs watch-main.ps1.
$UpdaterTaskName = 'Valheim Dashboard Updater'

# Name of the logon task that starts the game server.
$GameServerTaskName = 'Valheim Server'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Unregister-ScheduledTask -TaskName $UpdaterTaskName -Confirm:$false
  Unregister-ScheduledTask -TaskName $GameServerTaskName -Confirm:$false
  Write-Host "Removed the '$TaskName', '$UpdaterTaskName' and '$GameServerTaskName' tasks."
  return
}

# The scripts use the installed pnpm, so builds never download it. This installs the version the repo asks for.
$pnpmVersion = Get-PnpmVersion (Split-Path -Parent $PSScriptRoot)
if ((Get-InstalledPnpmVersion) -ne $pnpmVersion) {
  Write-Host "Installing pnpm $pnpmVersion"
  Invoke-Checked 'npm' @('install', '--global', "pnpm@$pnpmVersion") | Out-Null
}

$startScript = Join-Path $PSScriptRoot 'start-dashboard.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -LogFile `"$LogFile`" -Port $Port"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

# One window stays open and checks main every few minutes.
$watchScript = Join-Path $PSScriptRoot 'watch-main.ps1'
$watchArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$watchScript`" -LogFile `"$LogFile`" -Port $Port"
$watchAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $watchArguments
Register-ScheduledTask -TaskName $UpdaterTaskName -Action $watchAction -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $UpdaterTaskName

$gameServerScript = Join-Path $PSScriptRoot 'start-game-server.ps1'
$gameServerArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$gameServerScript`""
$gameServerAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $gameServerArguments
Register-ScheduledTask -TaskName $GameServerTaskName -Action $gameServerAction -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "The game server and the dashboard now start when $env:USERNAME logs on. Start the dashboard now with: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "'$UpdaterTaskName' checks main every few minutes in its own window. Its log is updater.log next to $LogFile."
