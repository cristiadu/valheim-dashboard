@echo off
rem Double-click when anything is down: it starts the game server, the dashboard, the link and the updater
rem that are not running, and makes Windows run it at every logon. Arguments pass through to start-valheim.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-valheim.ps1" %*
rem Keep the window open so what it did stays readable.
pause
