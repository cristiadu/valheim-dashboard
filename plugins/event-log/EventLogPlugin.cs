using BepInEx;
using HarmonyLib;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Server-only BepInEx plugin that writes game events the server can see to the server log, such as
    /// building, chat, boss progress and raids, so the dashboard can show them. Players install nothing.
    /// </summary>
    [BepInPlugin(PluginGuid, PluginName, PluginVersion)]
    public class EventLogPlugin : BaseUnityPlugin
    {
        /// <summary>ID that BepInEx and Harmony know the plugin by.</summary>
        public const string PluginGuid = "cristiadu.valheim-dashboard.event-log";

        /// <summary>Name shown in the BepInEx log.</summary>
        public const string PluginName = "Valheim Dashboard Event Log";

        /// <summary>Plugin version.</summary>
        public const string PluginVersion = "2.5.0";

        /// <summary>
        /// Keeps clicks from freezing the console, sends BepInEx messages to the server's log and applies the
        /// patches of every tracker.
        /// </summary>
        private void Awake()
        {
            ConsoleWindow.TurnOffQuickEdit();
            BepInEx.Logging.Logger.Listeners.Add(new ServerLogListener());
            Harmony harmony = new Harmony(PluginGuid);
            harmony.PatchAll(typeof(WorldScanner));
            harmony.PatchAll(typeof(RoutedRpcTracker));
            harmony.PatchAll(typeof(WorldEventTracker));
            harmony.PatchAll(typeof(EatTracker));
            Logger.LogInfo($"{PluginName} {PluginVersion} loaded");
        }
    }
}
