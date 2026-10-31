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

# Title of the game server's console window.
$GameServerWindowTitle = 'Valheim server'

# Lines of a failed command's output kept in its error message.
$FailureOutputLines = 20

# Seconds between tries while waiting for the dashboard to answer.
$DashboardRetrySeconds = 2

# Runs in a separate PowerShell to send Ctrl+C to the console of process __PID__. The process attaches to that
# console, so it cannot be this one. The game saves the world and exits on Ctrl+C.
$CtrlCSender = @'
$ProgressPreference = 'SilentlyContinue'
Add-Type -Namespace Win32 -Name Console -MemberDefinition @"
[DllImport("kernel32.dll")] public static extern bool FreeConsole();
[DllImport("kernel32.dll")] public static extern bool AttachConsole(uint processId);
[DllImport("kernel32.dll")] public static extern bool SetConsoleCtrlHandler(System.IntPtr handler, bool add);
[DllImport("kernel32.dll")] public static extern bool GenerateConsoleCtrlEvent(uint ctrlEvent, uint processGroupId);
"@
[Win32.Console]::FreeConsole() | Out-Null
if (-not [Win32.Console]::AttachConsole(__PID__)) { exit 1 }
[Win32.Console]::SetConsoleCtrlHandler([System.IntPtr]::Zero, $true) | Out-Null
if (-not [Win32.Console]::GenerateConsoleCtrlEvent(0, 0)) { exit 2 }
exit 0
'@

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
  Runs pnpm [Arguments] in the current folder with the pnpm version in [RepoRoot]'s package.json, through npx,
  so it needs no global install. Returns its output lines.
#>
function Invoke-Pnpm([string]$RepoRoot, [string[]]$Arguments) {
  $pnpm = (Get-Content (Join-Path $RepoRoot 'package.json') -Raw | ConvertFrom-Json).packageManager
  return Invoke-Checked 'npx' (@('--yes', $pnpm) + $Arguments)
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
      return Invoke-RestMethod -Uri $Url -TimeoutSec $DashboardRetrySeconds
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
  $script = $CtrlCSender -replace '__PID__', $Server.Id
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
  & powershell.exe -NoProfile -NonInteractive -EncodedCommand $encoded
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

Export-ModuleMember -Function *
