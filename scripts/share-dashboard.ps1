<#
.SYNOPSIS
  Gives friends a link to the dashboard through ngrok, started at Windows logon with no window. Run it once.
  Pass -Remove to stop sharing.

.EXAMPLE
  .\scripts\share-dashboard.ps1 -Domain "longhouse.ngrok-free.app" -AuthToken "<token from ngrok>"
  .\scripts\share-dashboard.ps1 -Remove
#>
param(
  # Free domain from the ngrok dashboard, under Domains, for example longhouse.ngrok-free.app.
  [string]$Domain,
  # Auth token from the ngrok dashboard. Saved in ngrok's own settings, never in this repo.
  [string]$AuthToken,
  # The Valheim server's log file. ngrok's log goes in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Remove the task and stop ngrok instead of sharing.
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

# Name of the logon task in Task Scheduler.
$TaskName = 'Valheim Dashboard Link'

# Where winget puts the ngrok command, for when this PowerShell started before ngrok was installed.
$WingetNgrok = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\ngrok.exe'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Stop-Process -Name 'ngrok' -ErrorAction SilentlyContinue
  Write-Host "Removed the '$TaskName' task. The link no longer works."
  return
}

if (-not $Domain) {
  throw 'Pass -Domain with the free domain from https://dashboard.ngrok.com/domains'
}

$ngrok = (Get-Command 'ngrok' -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
  Write-Host 'Installing ngrok'
  & winget install --id Ngrok.Ngrok --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget could not install ngrok, exit code $LASTEXITCODE" }
  $ngrok = $WingetNgrok
}

if ($AuthToken) {
  & $ngrok config add-authtoken $AuthToken | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "ngrok did not accept the auth token, exit code $LASTEXITCODE" }
}

$ngrokLog = Join-Path (Split-Path -Parent $LogFile) 'ngrok.log'
# conhost --headless gives ngrok a console with no window, so it never flashes or takes focus.
$arguments = "--headless `"$ngrok`" http $Port --url `"https://$Domain`" --log `"$ngrokLog`" --log-level warn --log-format logfmt"
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Friends can open https://$Domain. It starts again each time $env:USERNAME logs on."
