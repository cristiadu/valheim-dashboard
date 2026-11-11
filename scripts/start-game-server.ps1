<#
.SYNOPSIS
  Starts the Valheim server in its own window, unless it is already running. install-startup.ps1 runs it at
  Windows logon.

.EXAMPLE
  .\scripts\start-game-server.ps1
#>
param(
  # Dedicated server folder, with start_headless_server.bat.
  [string]$ServerDir = 'C:\Program Files (x86)\Steam\steamapps\common\Valheim dedicated server'
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Shared.psm1') -Force

if (Get-GameServer) { return }
Start-GameServer $ServerDir
