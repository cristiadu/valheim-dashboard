using BepInEx;
using HarmonyLib;

namespace ValheimDashboard.BuildLog
{
    /// <summary>
    /// Server-only BepInEx plugin that writes a line to the server log when a player builds a piece or a built
    /// piece is destroyed, so the dashboard can show who built what. Players install nothing.
    /// </summary>
    [BepInPlugin(PluginGuid, PluginName, PluginVersion)]
    public class BuildLogPlugin : BaseUnityPlugin
    {
        /// <summary>ID that BepInEx and Harmony know the plugin by.</summary>
        public const string PluginGuid = "cristiadu.valheim-dashboard.build-log";

        /// <summary>Name shown in the BepInEx log.</summary>
        public const string PluginName = "Valheim Dashboard Build Log";

        /// <summary>Plugin version.</summary>
        public const string PluginVersion = "1.0.0";

        /// <summary>Sends BepInEx messages to the server's log and applies the patches in <see cref="BuildTracker"/>.</summary>
        private void Awake()
        {
            BepInEx.Logging.Logger.Listeners.Add(new ServerLogListener());
            new Harmony(PluginGuid).PatchAll(typeof(BuildTracker));
            Logger.LogInfo($"{PluginName} {PluginVersion} loaded");
        }
    }
}
