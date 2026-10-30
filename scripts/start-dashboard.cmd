@echo off
rem Double-click to start the dashboard. Arguments pass through to start-dashboard.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dashboard.ps1" %*
rem Keep the window open so the error stays readable.
if errorlevel 1 pause
