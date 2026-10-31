<#
.SYNOPSIS
  Shared steps for the start and update scripts: logging, running commands, reading the dashboard, and
  stopping and starting the Valheim server.
#>

# Folder of the event log plugin's source, as git names it.
$PluginSourceFolder = 'plugins/event-log/'

# Game server process name, without .exe.
$GameServerProcessName = 'valheim_server'

# Batch file Valheim ships to start the dedicated server, in the server folder.
$GameServerStartFile = 'start_headless_server.bat'

# The -password argument in the start file, quoted or not, for example -password "skol123".
$GameServerPasswordPattern = '-password\s+(?:"(?<password>[^"]*)"|(?<password>\S+))'

# Title of the game server's console window.
$GameServerWindowTitle = 'Valheim server'

# Lines of a failed command's output kept in its error message.
$FailureOutputLines = 20

# Seconds between tries while waiting for the dashboard to answer.
$DashboardRetrySeconds = 2

# Seconds one request to the dashboard may take. Its first answer after a restart can take a few seconds.
$DashboardRequestSeconds = 10

# Script that sends Ctrl+C to the game server's console, next to this module.
$CtrlCSender = Join-Path $PSScriptRoot 'Send-CtrlC.ps1'

# Name of the CI job on GitHub that must pass on a commit before this PC runs it.
$CiCheckName = 'ci'

# A full git commit hash: 40 lowercase hex characters.
$CommitHashPattern = '^[0-9a-f]{40}$'

# A URL with a user name or token before the host, such as https://<token>@github.com/...
$UrlWithCredentialsPattern = '^[a-z][a-z0-9+.-]*://[^/]*@'

<#
.SYNOPSIS
  Writes [Message] with the local time to the screen and appends it to [Path].
#>
function Write-LogLine([string]$Path, [string]$Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Write-Host $line
  Add-Content -Path $Path -Value $line
}

<#
.SYNOPSIS
  Runs [FilePath] with [Arguments] and returns its output lines, errors included. Throws when it exits with a
  code other than 0, with the last lines of output in the message.
#>
function Invoke-Checked([string]$FilePath, [string[]]$Arguments) {
  # Commands such as git write progress to stderr, which must not stop the script.
  $ErrorActionPreference = 'Continue'
  $output = & $FilePath @Arguments 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) {
    $lastLines = ($output | Select-Object -Last $FailureOutputLines) -join "`n"
    throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE`n$lastLines"
  }
  return $output
}

<#
.SYNOPSIS
  Returns the pnpm version [RepoRoot]'s package.json asks for, such as 12.16.1.
#>
function Get-PnpmVersion([string]$RepoRoot) {
  $packageManager = (Get-Content (Join-Path $RepoRoot 'package.json') -Raw | ConvertFrom-Json).packageManager
  return $packageManager -replace '^pnpm@', ''
}

<#
.SYNOPSIS
  Returns the version of the pnpm on the PATH, or 'none' when there is none.
#>
function Get-InstalledPnpmVersion {
  if (-not (Get-Command 'pnpm' -ErrorAction SilentlyContinue)) { return 'none' }
  return Invoke-Checked 'pnpm' @('--version')
}

<#
.SYNOPSIS
  Runs pnpm [Arguments] in the current folder with the installed pnpm. Throws when that is not the version
  [RepoRoot]'s package.json asks for, so nothing downloads pnpm while nobody watches. Returns its output lines.
#>
function Invoke-Pnpm([string]$RepoRoot, [string[]]$Arguments) {
  $wantedVersion = Get-PnpmVersion $RepoRoot
  $installedVersion = Get-InstalledPnpmVersion
  if ($installedVersion -ne $wantedVersion) {
    throw "pnpm $wantedVersion is needed, but the installed version is $installedVersion. Run scripts\install-startup.cmd again to install it."
  }
  return Invoke-Checked 'pnpm' $Arguments
}

<#
.SYNOPSIS
  Tells whether any of [ChangedFiles], paths as `git diff --name-only` prints them, is in the plugin's source.
#>
function Test-PluginChanged([string[]]$ChangedFiles) {
  foreach ($file in $ChangedFiles) {
    if ($file.StartsWith($PluginSourceFolder)) { return $true }
  }
  return $false
}

<#
.SYNOPSIS
  Tells whether [Value] is a full git commit hash. Anything else must not reach git as an argument.
#>
function Test-CommitHash([string]$Value) {
  return $Value -cmatch $CommitHashPattern
}

<#
.SYNOPSIS
  Tells whether [Url], a git remote URL, holds a user name or token. Git can print it in error messages.
#>
function Test-UrlHasCredentials([string]$Url) {
  return $Url -match $UrlWithCredentialsPattern
}

<#
.SYNOPSIS
  Tells whether the CI job passed, from [CheckRuns] as GitHub's commit check-runs API returns them.
#>
function Test-CiPassed([psobject]$CheckRuns) {
  $passedRuns = @($CheckRuns.check_runs | Where-Object {
      $_.name -eq $CiCheckName -and $_.status -eq 'completed' -and $_.conclusion -eq 'success'
    })
  return $passedRuns.Count -gt 0
}

<#
.SYNOPSIS
  Counts the players online in a dashboard [Snapshot]: the sessions that have not ended.
#>
function Get-OnlinePlayerCount([psobject]$Snapshot) {
  return @($Snapshot.sessions | Where-Object { -not $_.endUtc }).Count
}

<#
.SYNOPSIS
  Reads the dashboard snapshot from [Url], trying again for up to [TimeoutSeconds] while the dashboard starts.
  Returns $null when it does not answer in time.
#>
function Get-DashboardSnapshot([string]$Url, [int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      return Invoke-RestMethod -Uri $Url -TimeoutSec $DashboardRequestSeconds
    } catch {
      Start-Sleep -Seconds $DashboardRetrySeconds
    }
  }
  return $null
}

<#
.SYNOPSIS
  Returns the running game server process, or $null when the server is not running.
#>
function Get-GameServer {
  return Get-Process -Name $GameServerProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
}

<#
.SYNOPSIS
  Stops the game [Server] the way Ctrl+C in its window does, so it saves the world first, then closes the
  batch file that started it. Throws when it is still running after [TimeoutSeconds].
#>
function Stop-GameServer([System.Diagnostics.Process]$Server, [int]$TimeoutSeconds) {
  $batchId = (Get-CimInstance Win32_Process -Filter "ProcessId=$($Server.Id)").ParentProcessId
  & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $CtrlCSender -ProcessId $Server.Id
  if ($LASTEXITCODE -ne 0) {
    throw "Could not send Ctrl+C to the game server (process $($Server.Id)), exit code $LASTEXITCODE"
  }
  if (-not $Server.WaitForExit($TimeoutSeconds * 1000)) {
    throw "The game server (process $($Server.Id)) did not stop within $TimeoutSeconds seconds of Ctrl+C"
  }
  # The batch file asks "Terminate batch job (Y/N)?" after Ctrl+C and waits for an answer nobody gives.
  $batch = Get-Process -Id $batchId -ErrorAction SilentlyContinue
  if ($batch -and $batch.ProcessName -eq 'cmd') { Stop-Process -Id $batchId -Force }
}

<#
.SYNOPSIS
  Starts the game server from [ServerDir] with Valheim's batch file, in its own console window in the
  foreground.
#>
function Start-GameServer([string]$ServerDir) {
  # The batch file runs valheim_server from the current folder, which cmd skips when this variable is set.
  Remove-Item Env:NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue
  # conhost keeps it a classic console window, which Ctrl+C can reach, whatever the default terminal app is.
  $arguments = @('/c', 'start', "`"$GameServerWindowTitle`"", 'conhost.exe', 'cmd.exe', '/c', $GameServerStartFile)
  Start-Process -FilePath 'cmd.exe' -ArgumentList $arguments -WorkingDirectory $ServerDir -WindowStyle Hidden
}

<#
.SYNOPSIS
  Returns the server password from the -password argument in the start file in [ServerDir], or $null when
  the file or the argument is missing. Friends type the same password on the dashboard.
#>
function Get-GameServerPassword([string]$ServerDir) {
  $startFile = Join-Path $ServerDir $GameServerStartFile
  if (-not (Test-Path $startFile)) { return $null }
  $match = [regex]::Match((Get-Content -Path $startFile -Raw), $GameServerPasswordPattern)
  if (-not $match.Success) { return $null }
  return $match.Groups['password'].Value
}

Export-ModuleMember -Function *
