using HarmonyLib;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs world progress the server decides: global keys, such as <c>defeated_eikthyr</c> each time a boss
    /// dies, and the end of each raid. The game already logs the start of a raid.
    /// </summary>
    [HarmonyPatch]
    internal static class WorldEventTracker
    {
        /// <summary>The raid in progress, which RandEventSystem keeps private.</summary>
        private static readonly AccessTools.FieldRef<RandEventSystem, RandomEvent> CurrentRaid =
            AccessTools.FieldRefAccess<RandEventSystem, RandomEvent>("m_randomEvent");

        /// <summary>Logs a global key a player's game asked the server to set.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZoneSystem), "RPC_SetGlobalKey")]
        private static void BeforeSetGlobalKey(string name)
        {
            GameEventLog.Write($"Global key set: {name}");
        }

        /// <summary>Logs a global key a player's game asked the server to remove.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZoneSystem), "RPC_RemoveGlobalKey")]
        private static void BeforeRemoveGlobalKey(string name)
        {
            GameEventLog.Write($"Global key removed: {name}");
        }

        /// <summary>Logs the raid in progress as ended when the server replaces or clears it.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(RandEventSystem), "SetRandomEvent")]
        private static void BeforeSetRaid(RandEventSystem __instance)
        {
            RandomEvent raid = CurrentRaid(__instance);
            if (raid != null && ZNet.instance != null && ZNet.instance.IsServer())
            {
                GameEventLog.Write($"Raid ended: {raid.m_name}");
            }
        }
    }
}
