using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>Logs where each Leviathan is, once per server run, and when one dives away for good.</summary>
    internal static class LeviathanTracker
    {
        /// <summary>Prefab hash of a Leviathan.</summary>
        private static readonly int LeviathanPrefabHash = "Leviathan".GetStableHashCode();

        /// <summary>Leviathans logged since the server started, by object ID.</summary>
        private static readonly HashSet<ZDOID> Logged = new HashSet<ZDOID>();

        /// <summary>Logs the Leviathan [zdo] the first time a scan finds it.</summary>
        public static void See(ZDO zdo)
        {
            if (zdo.GetPrefab() == LeviathanPrefabHash && Logged.Add(zdo.m_uid))
            {
                GameEventLog.Write($"Leviathan: {zdo.m_uid} at {Names.MapPosition(zdo.GetPosition())}");
            }
        }

        /// <summary>Logs that the Leviathan [uid] is gone when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            if (Logged.Remove(uid))
            {
                GameEventLog.Write($"Leviathan gone: {uid}");
            }
        }
    }
}
