<#
.SYNOPSIS
  Gives friends a link to the dashboard through zrok, started at Windows logon in its own window. Run it once.
  Pass -Remove to stop sharing.

.EXAMPLE
  .\scripts\share-dashboard.ps1 -Name "cotil-longhouse" -Token "<account token from myzrok.io>"
  .\scripts\share-dashboard.ps1 -Remove
#>
param(
  # Name in the link, for example cotil-longhouse for https://cotil-longhouse.shares.zrok.io. Lowercase letters,
  # digits and dashes. zrok keeps it for this account, so the link stays the same.
  [string]$Name,
  # Account token from https://myzrok.io. Needed the first time only. Saved in zrok's own settings, never in this repo.
  [string]$Token,
  # The Valheim server's log file. zrok's log goes in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Remove the task and stop zrok instead of sharing.
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

# Name of the logon task in Task Scheduler.
$TaskName = 'Valheim Dashboard Link'

# zrok release this script installs, and the SHA-256 of its Windows download from the release's checksums.sha256.txt.
$ZrokVersion = '2.0.9'
$ZrokSha256 = '2780e799269d92e64da5c5bfda48e76d4464925bdfcb7a11deafb40c6f25ad84'

# Folder zrok2.exe is installed in.
$ZrokFolder = Join-Path $env:LOCALAPPDATA 'zrok2'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Stop-Process -Name 'zrok2' -ErrorAction SilentlyContinue
  Write-Host "Removed the '$TaskName' task. The link no longer works."
  return
}

if ($Name -notmatch '^[a-z0-9][a-z0-9-]{2,}$') {
  throw 'Pass -Name with the name for the link: lowercase letters, digits and dashes, for example cotil-longhouse'
}

$zrok = Join-Path $ZrokFolder 'zrok2.exe'
if (-not (Test-Path $zrok)) {
  Write-Host "Installing zrok $ZrokVersion"
  $archive = Join-Path $env:TEMP "zrok_$($ZrokVersion)_windows_amd64.tar.gz"
  $url = "https://github.com/openziti/zrok/releases/download/v$ZrokVersion/zrok_$($ZrokVersion)_windows_amd64.tar.gz"
  Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
  $hash = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $ZrokSha256) { throw "The zrok download from $url has SHA-256 $hash, not $ZrokSha256. Not installing it." }
  New-Item -ItemType Directory -Force -Path $ZrokFolder | Out-Null
  & tar.exe -xzf $archive -C $ZrokFolder zrok2.exe
  if ($LASTEXITCODE -ne 0) { throw "tar could not unpack $archive, exit code $LASTEXITCODE" }
  Remove-Item $archive
}

if ($Token) {
  & $zrok enable $Token --headless --description 'Valheim dashboard'
  if ($LASTEXITCODE -ne 0) { throw "zrok did not accept the account token, exit code $LASTEXITCODE. If this PC is already enabled, run again without -Token." }
}

# Keeps the name for this account. It fails when the account already has it, which is fine. cmd keeps that
# error message away from PowerShell, which would stop on it.
& cmd.exe /c "`"$zrok`" create name $Name >nul 2>&1"
$names = & $zrok list names | Out-String
if ($names -notmatch [regex]::Escape($Name)) {
  throw "zrok could not keep the name $Name. Someone else may have it; try another -Name."
}

# run-dashboard-link.ps1 keeps zrok running in a window you can see, and clears a share an earlier run left behind.
$linkScript = Join-Path $PSScriptRoot 'run-dashboard-link.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$linkScript`" -Name $Name -Zrok `"$zrok`" -LogFile `"$LogFile`" -Port $Port"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

# zrok's list shows the full address of the name, so the link printed is the one friends really open.
$link = [regex]::Match($names, "[a-z0-9.-]*$([regex]::Escape($Name))\.[a-z0-9.-]+").Value
if (-not $link) { $link = "$Name (run '$zrok list names' for the full address)" }
Write-Host "Friends can open https://$link. It starts again each time $env:USERNAME logs on."
