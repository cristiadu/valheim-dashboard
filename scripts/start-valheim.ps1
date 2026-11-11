<#
.SYNOPSIS
  Brings everything back up: the game server, the dashboard, the friends' link and the updater that installs new
  dashboard and plugin versions from main. Each runs in its own window you can see. Whatever already runs is
  left alone, so it is safe to run any time. It also makes Windows run it at every logon.

.EXAMPLE
  .\scripts\start-valheim.ps1
  .\scripts\start-valheim.ps1 -ZrokToken "<account token from myzrok.io>"   # the first time only
  .\scripts\start-valheim.ps1 -Remove                                        # stop starting at logon
#>
param(
  # Name in the friends' link, for example cotil-longhouse for https://cotil-longhouse.shares.zrok.io. Lowercase
  # letters, digits and dashes. zrok keeps it for this account, so the link stays the same.
  [string]$LinkName = 'cotil-longhouse',
  # Account token from https://myzrok.io. Needed the first time only. Saved in zrok's own settings, never in this repo.
  [string]$ZrokToken,
  # The Valheim server's log file. Every other log goes in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Valheim dedicated server folder, with start_headless_server.bat and BepInEx.
  [string]$ServerDir = 'C:\Program Files (x86)\Steam\steamapps\common\Valheim dedicated server',
  # Checkout to run and update. The default is the repo folder this script is in; tests point it at a throwaway one.
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  # Stop starting everything at logon. Nothing that runs is stopped.
  [switch]$Remove,
  # Set by the logon task: only start what is not running, and install nothing while nobody watches.
  [switch]$AtLogon,
  # Which window this run is. All starts the others; each of the rest is one window's job, started by All.
  [ValidateSet('All', 'Dashboard', 'Link', 'Updater', 'UpdateOnce')]
  [string]$Part = 'All'
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Name of the logon task in Task Scheduler.
$TaskName = 'Valheim'

# Logon tasks that older versions of the scripts added, one per window. This one task replaces them.
$OldTaskNames = @('Valheim Dashboard', 'Valheim Dashboard Updater', 'Valheim Dashboard Link', 'Valheim Server')

# Titles of the windows.
$DashboardWindowTitle = 'Valheim dashboard'
$LinkWindowTitle = 'Valheim dashboard link (zrok)'
$UpdaterWindowTitle = 'Valheim dashboard updater'

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

# Built dashboard entry point.
$DashboardEntry = Join-Path $RepoRoot 'apps\dashboard\build\index.js'

# Plugin project and the DLL its Release build makes.
$PluginProject = Join-Path $RepoRoot 'plugins\event-log'
$PluginDll = Join-Path $PluginProject 'bin\Release\netstandard2.1\ValheimDashboard.EventLog.dll'

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

New-Item -ItemType Directory -Force -Path $LogFolder | Out-Null

switch ($Part) {
  'All' {
    if ($Remove) {
      foreach ($name in @($TaskName) + $OldTaskNames) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
      }
      Write-Host "Windows no longer starts Valheim at logon. What runs now keeps running."
      return
    }

    if (-not $AtLogon) {
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

      $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -AtLogon -LinkName $LinkName " +
        "-LogFile `"$LogFile`" -Port $Port -ServerDir `"$ServerDir`""
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
      $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
      $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
      Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
      foreach ($name in $OldTaskNames) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
      }
    }

    if (Get-GameServer) {
      Write-Host 'Game server: already running.'
    } else {
      Start-GameServer $ServerDir
      Write-Host 'Game server: started.'
    }

    if (Test-PartRunning 'Dashboard') {
      Write-Host 'Dashboard: already running.'
    } else {
      # A dashboard without its window, such as one an older script started hidden, is stopped with the loop
      # that restarts it (node's parent is cmd, whose parent is that loop), so the new window can take the port.
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

    if (Test-PartRunning 'Updater') {
      Write-Host 'Updater: already running.'
    } else {
      Start-Part 'Updater'
      Write-Host 'Updater: started.'
    }
  }

  'Dashboard' {
    $Host.UI.RawUI.WindowTitle = $DashboardWindowTitle
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

  'Link' {
    $Host.UI.RawUI.WindowTitle = $LinkWindowTitle
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

  'Updater' {
    $Host.UI.RawUI.WindowTitle = $UpdaterWindowTitle
    while ($true) {
      # Each check is its own PowerShell inside this window, so a failed check never ends the loop, and each
      # check reads this script as main has it now.
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -Part UpdateOnce `
        -LogFile $LogFile -Port $Port -ServerDir $ServerDir -RepoRoot $RepoRoot
      Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Checked main. Next check in $UpdateIntervalMinutes minutes."
      Start-Sleep -Seconds ($UpdateIntervalMinutes * 60)
    }
  }

  'UpdateOnce' {
    # After each new commit that passed CI, rebuilds and restarts the dashboard. When the event log plugin
    # changed, builds and installs it and restarts the game server, but only while nobody is online.

    # Stops a second check while a slow build is still going.
    $mutex = New-Object System.Threading.Mutex($false, 'ValheimDashboardUpdater')
    if (-not $mutex.WaitOne(0)) { return }

    try {
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

      # The first check takes the installed plugin as current, and builds the dashboard once.
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
        Write-LogLine $UpdaterLog "Building the dashboard at $head."
        Invoke-Pnpm $RepoRoot @('install', '--frozen-lockfile') | Out-Null
        Invoke-Pnpm $RepoRoot @('--filter', 'dashboard', 'build') | Out-Null
        # The dashboard window starts node again 5 seconds after it stops.
        Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
          Where-Object { $_.CommandLine -like "*$DashboardEntry*" } |
          ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
        $state.dashboardCommit = $head
        $state | ConvertTo-Json | Set-Content $StateFile
        Write-LogLine $UpdaterLog 'Restarted the dashboard.'
      }

      if ($state.pluginCommit -ne $head) {
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
    } catch {
      Write-LogLine $UpdaterLog "Update failed: $_"
      exit 1
    } finally {
      $mutex.ReleaseMutex()
    }
  }
}
