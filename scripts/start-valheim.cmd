@echo off
rem Starts the dashboard and the zrok link when they are not running, then keeps the dashboard and the event
rem log plugin in sync with main. Arguments pass through to start-valheim.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-valheim.ps1" %*
rem Keep the window open so the last lines stay readable after the sync stops.
pause
