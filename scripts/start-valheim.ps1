<#
.SYNOPSIS
  Runs the dashboard, shares it with zrok, and keeps both the dashboard and the event log plugin in sync with
  main. Every few minutes it checks main. A commit that changes the dashboard or its packages rebuilds and restarts
  the dashboard.
  When the plugin changed and nobody is online, it builds the plugin, asks the game server to save and exit,
  copies the DLL in, and starts the server again.

.EXAMPLE
  .\scripts\start-valheim.ps1
  .\scripts\start-valheim.ps1 -ZrokToken "<account token from myzrok.io>"   # the first time only
  .\scripts\start-valheim.ps1 -LogFile "D:\Valheim\logs.txt" -Port 8080
#>
param(
  # Name in the friends' link, for example cotil-longhouse for https://cotil-longhouse.shares.zrok.io. Lowercase
  # letters, digits and dashes. zrok keeps it for this account, so the link stays the same.
  [string]$LinkName = 'cotil-longhouse',
  # Account token from https://myzrok.io. Needed the first time only. Saved in zrok's own settings, never in this repo.
  [string]$ZrokToken,
  # The Valheim server's log file. The dashboard log, the zrok log and the sync log go in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Valheim dedicated server folder, with start_headless_server.bat and BepInEx.
  [string]$ServerDir = 'C:\Program Files (x86)\Steam\steamapps\common\Valheim dedicated server',
  # Checkout to update. The default is the repo folder this script is in.
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  # Which window this run is. All starts the dashboard and the link, then keeps checking main. Each of the
  # others is one window's job, started by All.
  [ValidateSet('All', 'Dashboard', 'Link')]
  [string]$Part = 'All',
  # When set, this run only sends Ctrl+C to that process's console, then exits. Stopping the game server
  # starts a separate PowerShell for this, because attaching to the server's console detaches from this one.
  # Exits with 1 when it cannot attach, and 2 when it cannot send Ctrl+C.
  [int]$ProcessId = 0
)

if ($ProcessId -ne 0) {
  $ProgressPreference = 'SilentlyContinue'
  Add-Type -Namespace Win32 -Name Console -MemberDefinition @"
[DllImport("kernel32.dll")] public static extern bool FreeConsole();
[DllImport("kernel32.dll")] public static extern bool AttachConsole(uint processId);
[DllImport("kernel32.dll")] public static extern bool SetConsoleCtrlHandler(System.IntPtr handler, bool add);
[DllImport("kernel32.dll")] public static extern bool GenerateConsoleCtrlEvent(uint ctrlEvent, uint processGroupId);
"@
  [Win32.Console]::FreeConsole() | Out-Null
  if (-not [Win32.Console]::AttachConsole($ProcessId)) { exit 1 }
  # Ignore the Ctrl+C here, so only the server's console reacts to it.
  [Win32.Console]::SetConsoleCtrlHandler([System.IntPtr]::Zero, $true) | Out-Null
  if (-not [Win32.Console]::GenerateConsoleCtrlEvent(0, 0)) { exit 2 }
  exit 0
}

$ErrorActionPreference = 'Stop'

# Folder of the event log plugin's source, as git names it.
$PluginSourceFolder = 'plugins/event-log/'

# Paths the dashboard build reads, as git names them. A folder ends with a slash; a file is named whole.
# packages/valheim-log is the workspace package the dashboard imports.
$DashboardInputs = @(
  'apps/dashboard/',
  'packages/valheim-log/',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml'
)

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

# Name of the CI job on GitHub that must pass on a commit before this PC runs it.
$CiCheckName = 'ci'

# A full git commit hash: 40 lowercase hex characters.
$CommitHashPattern = '^[0-9a-f]{40}$'

# A URL with a user name or token before the host, such as https://<token>@github.com/...
$UrlWithCredentialsPattern = '^[a-z][a-z0-9+.-]*://[^/]*@'

# Windows calls that read and set a console's mode flags, as in the event log plugin's ConsoleWindow.cs.
$ConsoleModeCalls = @'
[DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int handleNumber);
[DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr console, out uint mode);
[DllImport("kernel32.dll")] public static extern bool SetConsoleMode(IntPtr console, uint mode);
'@

# Handle number of the console's input, as GetStdHandle takes it.
$StdInputHandle = -10

# Console mode flag that lets a click start a text selection.
$QuickEditMode = 0x0040

# Console mode flag that must be set for a change to QuickEditMode to apply.
$ExtendedFlags = 0x0080

# Titles of the windows.
$DashboardWindowTitle = 'Valheim dashboard'
$LinkWindowTitle = 'Valheim dashboard link (zrok)'

# Seconds to wait before starting the dashboard again after it stops.
$DashboardRestartSeconds = 5

# Seconds to wait before starting zrok again after it stops, for example while the network is still coming up.
$LinkRestartSeconds = 30

# Minutes between checks of main.
$UpdateIntervalMinutes = 5

# zrok release this script installs, and the SHA-256 of its Windows download from the release's checksums.sha256.txt.
$ZrokVersion = '2.0.9'
$ZrokSha256 = '2780e799269d92e64da5c5bfda48e76d4464925bdfcb7a11deafb40c6f25ad84'

# zrok2.exe, installed by this script.
$Zrok = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'zrok2\zrok2.exe'

# Branch this PC runs.
$Branch = 'main'

# GitHub repo, as owner/name, whose CI must pass on a commit before this PC runs it.
$GitHubRepo = 'cristiadu/valheim-dashboard'

# Seconds to wait for GitHub to answer.
$GitHubTimeoutSeconds = 30

# Seconds to wait for the dashboard to answer after it restarts.
$DashboardStartSeconds = 120

# Seconds the game server gets to save and exit after Ctrl+C.
$GameServerStopSeconds = 300

# Plugin project and the DLL its Release build makes.
$PluginProject = Join-Path $RepoRoot 'plugins\event-log'
$PluginDll = Join-Path $PluginProject 'bin\Release\netstandard2.1\ValheimDashboard.EventLog.dll'

# Built dashboard entry point.
$DashboardEntry = Join-Path $RepoRoot 'apps\dashboard\build\index.js'

# Folder of every log, next to the server's log.
$LogFolder = Split-Path -Parent $LogFile

# The dashboard's output, zrok's output, and what the updater did and why.
$DashboardLog = Join-Path $LogFolder 'dashboard.log'
$ZrokLog = Join-Path $LogFolder 'zrok.log'
$UpdaterLog = Join-Path $LogFolder 'updater.log'

# Commits the running dashboard and the installed plugin were built from, as JSON:
# { "dashboardCommit": "2d8cf20...", "pluginCommit": "2d8cf20..." }
$StateFile = Join-Path $LogFolder 'updater-state.json'

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
    throw "pnpm $wantedVersion is needed, but the installed version is $installedVersion. Run scripts\start-valheim.cmd to install it."
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
  Tells whether any of [ChangedFiles], paths as `git diff --name-only` prints them, is an input of the dashboard
  build, as listed in $DashboardInputs.
#>
function Test-DashboardChanged([string[]]$ChangedFiles) {
  foreach ($file in $ChangedFiles) {
    foreach ($input in $DashboardInputs) {
      if ($file -eq $input -or ($input.EndsWith('/') -and $file.StartsWith($input))) { return $true }
    }
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
  & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $PSCommandPath -ProcessId $Server.Id
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
  Stops clicks from selecting text in this window. A selection pauses every write to the window, which would
  freeze the loop running in it. Does nothing without a console.
#>
function Disable-ConsoleQuickEdit {
  $console = Add-Type -Namespace 'ValheimDashboard' -Name 'ConsoleMode' -MemberDefinition $ConsoleModeCalls -PassThru
  $inputHandle = $console::GetStdHandle($StdInputHandle)
  $mode = [uint32]0
  if ($console::GetConsoleMode($inputHandle, [ref]$mode)) {
    [void]$console::SetConsoleMode($inputHandle, ($mode -band (-bnot $QuickEditMode)) -bor $ExtendedFlags)
  }
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

<#
.SYNOPSIS
  Tells whether a window this script started for [WindowPart] is still running.
#>
function Test-PartRunning([string]$WindowPart) {
  $processes = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
    Where-Object { $_.CommandLine -like "*start-valheim.ps1*-Part $WindowPart*" }
  return [bool]$processes
}

<#
.SYNOPSIS
  Opens a new window that runs this script for [WindowPart].
#>
function Start-Part([string]$WindowPart) {
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Part $WindowPart -LinkName $LinkName " +
    "-LogFile `"$LogFile`" -Port $Port -ServerDir `"$ServerDir`" -RepoRoot `"$RepoRoot`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $RepoRoot
}

<#
.SYNOPSIS
  Builds the dashboard if it has not been built, then runs it and starts it again after it stops.
#>
function Start-DashboardLoop {
  $Host.UI.RawUI.WindowTitle = $DashboardWindowTitle
  Disable-ConsoleQuickEdit
  Set-Location $RepoRoot
  if (-not (Test-Path $DashboardEntry)) {
    Write-LogLine $DashboardLog 'Installing packages and building the dashboard'
    Invoke-Pnpm $RepoRoot @('install', '--frozen-lockfile')
    Invoke-Pnpm $RepoRoot @('--filter', 'dashboard', 'build')
  }
  if (-not (Test-Path $LogFile)) {
    Write-LogLine $DashboardLog "Warning: $LogFile does not exist yet. The dashboard waits for it."
  }

  $env:LOG_FILE = $LogFile
  $env:PORT = "$Port"
  # Only this PC reaches the dashboard directly. Friends come in through the zrok link.
  $env:HOST = '127.0.0.1'
  $env:DASHBOARD_PASSWORD = Get-GameServerPassword $ServerDir
  if (-not $env:DASHBOARD_PASSWORD) {
    Write-LogLine $DashboardLog "Warning: no -password in the server's start file in $ServerDir. The shared link turns everyone away."
  }

  while ($true) {
    Write-LogLine $DashboardLog "Starting the dashboard on http://localhost:$Port"
    # cmd redirects the output as-is: PowerShell 5.1 would write UTF-16 and stop on node's stderr.
    & cmd.exe /c "node `"$DashboardEntry`" >> `"$DashboardLog`" 2>&1"
    Write-LogLine $DashboardLog "The dashboard stopped with exit code $LASTEXITCODE. Starting again in $DashboardRestartSeconds seconds."
    Start-Sleep -Seconds $DashboardRestartSeconds
  }
}

<#
.SYNOPSIS
  Shares the dashboard with zrok and starts the share again after zrok stops.
#>
function Start-LinkLoop {
  $Host.UI.RawUI.WindowTitle = $LinkWindowTitle
  Disable-ConsoleQuickEdit
  while ($true) {
    # A share left from before a restart or crash keeps the name, and zrok then refuses to share on it. With no
    # other zrok running, that share is stale, so delete it. zrok answers 2 when no share has the name.
    if (-not (Get-Process -Name 'zrok2' -ErrorAction SilentlyContinue)) {
      & cmd.exe /c "`"$Zrok`" delete share public:$LinkName >nul 2>&1"
      if ($LASTEXITCODE -eq 0) { Write-LogLine $ZrokLog "Deleted a share left from an earlier run that kept $LinkName." }
    }
    # --headless swaps zrok's full-screen view for plain lines, which this window shows and the log keeps. cmd
    # merges zrok's error output, which PowerShell would stop on.
    & cmd.exe /c "`"$Zrok`" share public http://127.0.0.1:$Port --name-selection public:$LinkName --open --headless 2>&1" |
      ForEach-Object { $_; Add-Content -LiteralPath $ZrokLog -Value $_ -Encoding UTF8 }
    Write-LogLine $ZrokLog "zrok stopped with exit code $LASTEXITCODE. Starting again in $LinkRestartSeconds seconds."
    Start-Sleep -Seconds $LinkRestartSeconds
  }
}

<#
.SYNOPSIS
  Pulls main when CI has passed. A commit that changes the dashboard's build inputs rebuilds and restarts the
  dashboard. A commit that changes the event log plugin installs it when nobody is online. Each check is
  independent, and a wait or a failure leaves its own commit unchanged, so the next pass tries again.
#>
function Update-FromMain {
  Set-Location $RepoRoot
  $checkedOutBranch = Invoke-Checked 'git' @('rev-parse', '--abbrev-ref', 'HEAD')
  if ($checkedOutBranch -ne $Branch) {
    Write-LogLine $UpdaterLog "Skipped: the checkout is on $checkedOutBranch, not $Branch."
    return
  }
  if (Invoke-Checked 'git' @('status', '--porcelain', '--untracked-files=no')) {
    Write-LogLine $UpdaterLog 'Skipped: the checkout has uncommitted changes.'
    return
  }

  if (Test-UrlHasCredentials (Invoke-Checked 'git' @('remote', 'get-url', 'origin'))) {
    Write-LogLine $UpdaterLog "Skipped: the origin URL has a user name or token in it. Remove it with: git remote set-url origin https://github.com/$GitHubRepo.git"
    return
  }

  Invoke-Checked 'git' @('fetch', '--quiet', 'origin', $Branch) | Out-Null
  $head = Invoke-Checked 'git' @('rev-parse', 'HEAD')
  $latest = Invoke-Checked 'git' @('rev-parse', "origin/$Branch")
  if ($latest -ne $head) {
    # Only commits that passed CI on GitHub run here. The repo is public, so this needs no token.
    $checkRunsUrl = "https://api.github.com/repos/$GitHubRepo/commits/$latest/check-runs"
    $checkRuns = Invoke-RestMethod -Uri $checkRunsUrl -TimeoutSec $GitHubTimeoutSeconds
    if (Test-CiPassed $checkRuns) {
      Invoke-Checked 'git' @('merge', '--quiet', '--ff-only', $latest) | Out-Null
      $head = $latest
    } else {
      Write-LogLine $UpdaterLog "Waiting: CI has not passed on $latest yet. Staying on $head."
    }
  }

  # The first check builds the dashboard once and takes the installed plugin as current.
  $state = [pscustomobject]@{ dashboardCommit = ''; pluginCommit = $head }
  if (Test-Path $StateFile) {
    $savedState = Get-Content $StateFile -Raw | ConvertFrom-Json
    if ((Test-CommitHash $savedState.dashboardCommit) -and (Test-CommitHash $savedState.pluginCommit)) {
      $state = $savedState
    } else {
      Write-LogLine $UpdaterLog "Warning: $StateFile does not hold two commit hashes, so this check starts over."
    }
  }

  if ($state.dashboardCommit -ne $head) {
    # Rebuild only when this commit's changes reach the dashboard build. The first check has no commit to
    # compare with, so it always builds.
    $dashboardChanged = $true
    if (Test-CommitHash $state.dashboardCommit) {
      $changedDashboardFiles = Invoke-Checked 'git' @('diff', '--name-only', $state.dashboardCommit, $head)
      $dashboardChanged = Test-DashboardChanged $changedDashboardFiles
    }
    if ($dashboardChanged) {
      Write-LogLine $UpdaterLog "Building the dashboard at $head."
      Invoke-Pnpm $RepoRoot @('install', '--frozen-lockfile') | Out-Null
      Invoke-Pnpm $RepoRoot @('--filter', 'dashboard', 'build') | Out-Null
      # The dashboard window starts node again 5 seconds after it stops.
      Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object { $_.CommandLine -like "*$DashboardEntry*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
      Write-LogLine $UpdaterLog 'Restarted the dashboard.'
    }
    $state.dashboardCommit = $head
    $state | ConvertTo-Json | Set-Content $StateFile
  }

  if ($state.pluginCommit -eq $head) { return }

  $changedFiles = Invoke-Checked 'git' @('diff', '--name-only', $state.pluginCommit, $head)
  if (Test-PluginChanged $changedFiles) {
    Invoke-Checked 'dotnet' @('build', $PluginProject, '-c', 'Release', '--nologo', '-v', 'quiet') | Out-Null
    $snapshot = Get-DashboardSnapshot "http://127.0.0.1:$Port/api/status" $DashboardStartSeconds
    if (-not $snapshot) {
      Write-LogLine $UpdaterLog 'Plugin update waiting: the dashboard did not answer, so nobody can tell who is online.'
      return
    }
    $onlineCount = Get-OnlinePlayerCount $snapshot
    if ($onlineCount -gt 0) {
      Write-LogLine $UpdaterLog "Plugin update waiting: $onlineCount player(s) online."
      return
    }

    $server = Get-GameServer
    if ($server) {
      Write-LogLine $UpdaterLog "Nobody is online. Stopping the game server to install the plugin from $head."
      Stop-GameServer $server $GameServerStopSeconds
    }
    Copy-Item $PluginDll (Join-Path $ServerDir 'BepInEx\plugins') -Force
    # A server that was already stopped stays stopped.
    if ($server) { Start-GameServer $ServerDir }
    Write-LogLine $UpdaterLog 'Installed the event log plugin.'
  }

  $state.pluginCommit = $head
  $state | ConvertTo-Json | Set-Content $StateFile
}

New-Item -ItemType Directory -Force -Path $LogFolder | Out-Null

if ($Part -eq 'Dashboard') {
  Start-DashboardLoop
  return
}
if ($Part -eq 'Link') {
  Start-LinkLoop
  return
}

# Builds use the installed pnpm, so nothing downloads it while nobody watches. This installs the version
# the repo asks for.
$pnpmVersion = Get-PnpmVersion $RepoRoot
if ((Get-InstalledPnpmVersion) -ne $pnpmVersion) {
  Write-Host "Installing pnpm $pnpmVersion"
  Invoke-Checked 'npm' @('install', '--global', "pnpm@$pnpmVersion") | Out-Null
}

if (-not (Test-Path $Zrok)) {
  Write-Host "Installing zrok $ZrokVersion"
  $archive = Join-Path $env:TEMP "zrok_$($ZrokVersion)_windows_amd64.tar.gz"
  $url = "https://github.com/openziti/zrok/releases/download/v$ZrokVersion/zrok_$($ZrokVersion)_windows_amd64.tar.gz"
  Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
  $hash = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $ZrokSha256) { throw "The zrok download from $url has SHA-256 $hash, not $ZrokSha256. Not installing it." }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Zrok) | Out-Null
  & tar.exe -xzf $archive -C (Split-Path -Parent $Zrok) zrok2.exe
  if ($LASTEXITCODE -ne 0) { throw "tar could not unpack $archive, exit code $LASTEXITCODE" }
  Remove-Item $archive
}
if ($ZrokToken) {
  & $Zrok enable $ZrokToken --headless --description 'Valheim dashboard'
  if ($LASTEXITCODE -ne 0) { throw "zrok did not accept the account token, exit code $LASTEXITCODE. If this PC is already enabled, run again without -ZrokToken." }
}
# Keeps the name for this account. It fails when the account already has it, which is fine. cmd keeps that
# error message away from PowerShell, which would stop on it.
& cmd.exe /c "`"$Zrok`" create name $LinkName >nul 2>&1"

if (Test-PartRunning 'Dashboard') {
  Write-Host 'Dashboard: already running.'
} else {
  # A dashboard without its window is stopped with the loop that restarts it (node's parent is cmd, whose
  # parent is that loop), so the new window can take the port.
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like "*$DashboardEntry*" } |
    ForEach-Object {
      $cmd = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.ParentProcessId)"
      if ($cmd) { Stop-Process -Id $cmd.ParentProcessId -Force -ErrorAction SilentlyContinue }
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
  Start-Part 'Dashboard'
  Write-Host 'Dashboard: started.'
}

if (Get-Process -Name 'zrok2' -ErrorAction SilentlyContinue) {
  Write-Host 'Link: already running.'
} else {
  Start-Part 'Link'
  Write-Host "Link: started, for https://$LinkName.shares.zrok.io."
}

$Host.UI.RawUI.WindowTitle = 'Valheim dashboard updater'
Disable-ConsoleQuickEdit

# A second updater exits. An abandoned lock, from a copy that was killed, is taken over.
$mutex = New-Object System.Threading.Mutex($false, 'ValheimDashboardUpdater')
$acquired = $false
try {
  $acquired = $mutex.WaitOne(0)
} catch [System.Threading.AbandonedMutexException] {
  $acquired = $true
}
if (-not $acquired) {
  Write-Host 'The updater is already running.'
  return
}

try {
  while ($true) {
    try {
      Update-FromMain
    } catch {
      Write-LogLine $UpdaterLog "Update failed: $_"
    }
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Checked main. Next check in $UpdateIntervalMinutes minutes."
    Start-Sleep -Seconds ($UpdateIntervalMinutes * 60)
  }
} finally {
  $mutex.ReleaseMutex()
}
