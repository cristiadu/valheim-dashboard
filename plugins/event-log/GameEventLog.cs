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

        /// <summary>BepInEx source whose messages reach the console. ServerLogListener leaves them out of the file.</summary>
        private static readonly ManualLogSource ConsoleSource = Logger.CreateLogSource(SourceName);

        /// <summary>Writes [line] to the server's log and to the console.</summary>
        public static void Write(string line)
        {
            ZLog.Log(line);
            ConsoleSource.LogInfo(line);
        }
    }
}