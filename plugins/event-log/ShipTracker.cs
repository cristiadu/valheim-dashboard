using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>Logs each player who takes the helm of a raft or a ship. The ship keeps who steers it.</summary>
    internal static class ShipTracker
    {
        /// <summary>Player ID of who steered each ship at the last scan, or 0 when nobody did, by object ID.</summary>
        private static readonly Dictionary<ZDOID, long> Steerers = new Dictionary<ZDOID, long>();

        /// <summary>Logs the player who took the helm of ship [zdo] since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            if (!Names.HasInParts<ShipControlls>(zdo))
            {
                return;
            }
            long steerer = zdo.GetLong(ZDOVars.s_user, 0L);
            if (Steerers.TryGetValue(zdo.m_uid, out long before) && before != steerer && steerer != 0L)
            {
                GameEventLog.Write($"Sailing: {Names.Character(steerer)} on {Names.PrefabName(zdo)}");
            }
            Steerers[zdo.m_uid] = steerer;
        }

        /// <summary>Forgets the ship [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Steerers.Remove(uid);
        }
    }
}
