<#
.SYNOPSIS
  Brings this PC up to date with main, once. After each new commit it rebuilds and restarts the dashboard.
  When the event log plugin changed, it builds and installs the plugin and restarts the game server, but only
  while nobody is online; otherwise it waits for a later run. install-startup.ps1 runs it every few minutes.

.EXAMPLE
  .\scripts\update-from-main.ps1
  .\scripts\update-from-main.ps1 -LogFile "D:\Valheim\logs.txt" -Port 8080
#>
param(
  # The Valheim server's log file. The updater's own log and state go in the same folder.
  [string]$LogFile = 'C:\Valheim Server\logs.txt',
  # Port the dashboard listens on.
  [int]$Port = 3000,
  # Dedicated server folder, with start_headless_server.bat and BepInEx.
  [string]$ServerDir = 'C:\Program Files (x86)\Steam\steamapps\common\Valheim dedicated server'
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

# Branch this PC runs.
$Branch = 'main'

# Seconds to wait for the dashboard to answer after it restarts.
$DashboardStartSeconds = 120

# Seconds the game server gets to save and exit after Ctrl+C.
$GameServerStopSeconds = 300

# Repo folder, one level above this script.
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Built dashboard entry point. start-dashboard.ps1 starts it again 5 seconds after it stops.
$DashboardEntry = Join-Path $RepoRoot 'apps\dashboard\build\index.js'

# Plugin project and the DLL its Release build makes.
$PluginProject = Join-Path $RepoRoot 'plugins\event-log'
$PluginDll = Join-Path $PluginProject 'bin\Release\netstandard2.1\ValheimDashboard.EventLog.dll'

# What the updater did and why, next to the server's log.
$UpdaterLog = Join-Path (Split-Path -Parent $LogFile) 'updater.log'

# Commits the running dashboard and the installed plugin were built from, as JSON:
# { "dashboardCommit": "2d8cf20...", "pluginCommit": "2d8cf20..." }
$StateFile = Join-Path (Split-Path -Parent $LogFile) 'updater-state.json'

# Stops a second run while a slow build is still going.
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

  Invoke-Checked 'git' @('fetch', '--quiet', 'origin', $Branch) | Out-Null
  Invoke-Checked 'git' @('merge', '--quiet', '--ff-only', "origin/$Branch") | Out-Null
  $head = Invoke-Checked 'git' @('rev-parse', 'HEAD')

  # The first run takes the installed plugin as current, and builds the dashboard once.
  $state = [pscustomobject]@{ dashboardCommit = ''; pluginCommit = $head }
  if (Test-Path $StateFile) { $state = Get-Content $StateFile -Raw | ConvertFrom-Json }

  if ($state.dashboardCommit -ne $head) {
    Write-LogLine $UpdaterLog "Building the dashboard at $head."
    Invoke-Pnpm $RepoRoot @('install', '--frozen-lockfile') | Out-Null
    Invoke-Pnpm $RepoRoot @('--filter', 'dashboard', 'build') | Out-Null
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
      $snapshot = Get-DashboardSnapshot "http://localhost:$Port/api/status" $DashboardStartSeconds
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
