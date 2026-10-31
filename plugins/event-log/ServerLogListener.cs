using BepInEx.Logging;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Copies BepInEx messages, such as plugin errors, into the server's log. BepInEx's own log file is turned
    /// off so that every log stays in the server's log folder. Game events are already written there.
    /// </summary>
    internal sealed class ServerLogListener : ILogListener
    {
        /// <summary>BepInEx source that carries the game's own log, which is already in the server's log.</summary>
        private const string UnityLogSourceName = "Unity Log";

        /// <summary>Levels copied to the server's log: everything but debug output.</summary>
        private const LogLevel CopiedLevels =
            LogLevel.Fatal | LogLevel.Error | LogLevel.Warning | LogLevel.Message | LogLevel.Info;

        /// <summary>Writes one BepInEx message to the server's log.</summary>
        public void LogEvent(object sender, LogEventArgs eventArgs)
        {
            string sourceName = eventArgs.Source.SourceName;
            if (sourceName == UnityLogSourceName || sourceName == GameEventLog.SourceName || (eventArgs.Level & CopiedLevels) == 0)
            {
                return;
            }
            ZLog.Log($"[{eventArgs.Level} : {eventArgs.Source.SourceName}] {eventArgs.Data}");
        }

        /// <summary>Nothing to release.</summary>
        public void Dispose()
        {
        }
    }
}
