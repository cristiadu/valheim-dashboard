using System;
using System.Runtime.InteropServices;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Settings of the server's console window. A click in a Windows console starts a text selection, which pauses
    /// every write to the window. The plugin writes each event there, so a stray click would freeze the server.
    /// </summary>
    internal static class ConsoleWindow
    {
        /// <summary>Handle number of the console's input, as GetStdHandle takes it.</summary>
        private const int StdInputHandle = -10;

        /// <summary>Console mode flag that lets a click start a text selection.</summary>
        private const uint QuickEditMode = 0x0040;

        /// <summary>Console mode flag that must be set for a change to QuickEditMode to apply.</summary>
        private const uint ExtendedFlags = 0x0080;

        /// <summary>Windows call that returns one of the process's console handles.</summary>
        [DllImport("kernel32.dll")]
        private static extern IntPtr GetStdHandle(int handleNumber);

        /// <summary>Windows call that reads a console's mode flags.</summary>
        [DllImport("kernel32.dll")]
        private static extern bool GetConsoleMode(IntPtr console, out uint mode);

        /// <summary>Windows call that sets a console's mode flags.</summary>
        [DllImport("kernel32.dll")]
        private static extern bool SetConsoleMode(IntPtr console, uint mode);

        /// <summary>Stops clicks from selecting text in the console. Does nothing when the server has no console.</summary>
        public static void TurnOffQuickEdit()
        {
            IntPtr input = GetStdHandle(StdInputHandle);
            if (GetConsoleMode(input, out uint mode))
            {
                SetConsoleMode(input, (mode & ~QuickEditMode) | ExtendedFlags);
            }
        }
    }
}