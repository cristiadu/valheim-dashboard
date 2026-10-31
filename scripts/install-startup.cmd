@echo off
rem Double-click to start the dashboard at Windows logon and update it from main. Arguments pass through to install-startup.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-startup.ps1" %*
rem Keep the window open so the result stays readable.
pause
