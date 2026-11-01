using HarmonyLib;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Reads each call a player's game sends through the server, such as chat or an animation, once, and hands
    /// it to the trackers that look for calls.
    /// </summary>
    [HarmonyPatch]
    internal static class RoutedRpcTracker
    {
        /// <summary>Reads a call as it reaches the server, before the server handles or passes it on.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZRoutedRpc), "RPC_RoutedRPC")]
        private static void BeforeRoutedRpc(ZPackage pkg)
        {
            if (ZNet.instance == null || !ZNet.instance.IsServer())
            {
                return;
            }
            ZRoutedRpc.RoutedRPCData data = new ZRoutedRpc.RoutedRPCData();
            data.Deserialize(new ZPackage(pkg.GetArray()));
            ChatTracker.Read(data);
            CombatTracker.Read(data);
            ItemTracker.Read(data);
            WorkTracker.Read(data);
            EatTracker.Read(data);
        }
    }
}
