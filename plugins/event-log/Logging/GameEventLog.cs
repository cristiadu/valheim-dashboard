using System.IO;
using System.Reflection;
using BepInEx;
using BepInEx.Logging;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes each game event line to the server's log, where the dashboard reads it, and to the server's console
    /// window, where whoever runs the server can watch it. The server sends its own log only to the file.
    /// </summary>
    internal static class GameEventLog
    {
        /// <summary>Name of the BepInEx source the console shows before each event, as in [Info : Game event].</summary>
        public const string SourceName = "Game event";

        /// <summary>BepInEx class that owns the console window. Plugins cannot reach it directly.</summary>
        private const string ConsoleManagerTypeName = "BepInEx.ConsoleManager";

        /// <summary>BepInEx source whose messages reach the console. ServerLogListener leaves them out of the file.</summary>
        private static readonly ManualLogSource ConsoleSource = Logger.CreateLogSource(SourceName);

        /// <summary>
        /// What BepInEx writes the console through. It keeps lines until it fills up or the server stops, so each
        /// event flushes it. Null when BepInEx has no console.
        /// </summary>
        private static readonly TextWriter ConsoleWriter = (TextWriter)typeof(Paths).Assembly
            .GetType(ConsoleManagerTypeName)
            ?.GetProperty("ConsoleStream", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            ?.GetValue(null);

        /// <summary>Writes [line] to the server's log and to the console, where it shows right away.</summary>
        public static void Write(string line)
        {
            ZLog.Log(line);
            ConsoleSource.LogInfo(line);
            ConsoleWriter?.Flush();
        }
    }
}