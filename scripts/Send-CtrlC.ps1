<#
.SYNOPSIS
  Sends Ctrl+C to the console of process [ProcessId], as pressing it in that window does. The game server saves
  the world and exits on Ctrl+C. Stop-GameServer runs this in its own PowerShell, because it detaches from its
  own console to attach to the server's.
  Exits with 1 when it cannot attach to the console, and 2 when it cannot send Ctrl+C.
#>
param(
  # The process whose console gets Ctrl+C.
  [Parameter(Mandatory)][int]$ProcessId
)

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
