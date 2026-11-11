using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs fuel put on fires, one line per item, built pieces repaired and maps shared on a map table. A fire's
    /// fuel only goes down by itself, a piece's health only goes back up by a repair, and a table's map only
    /// changes when someone adds theirs. Each player is found like a smelter's.
    /// </summary>
    internal static class UpkeepTracker
    {
        /// <summary>Fuel in each fire at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, float> Fuels = new Dictionary<ZDOID, float>();

        /// <summary>Health of each built piece at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, float> Healths = new Dictionary<ZDOID, float>();

        /// <summary>Map data on each map table at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, byte[]> Maps = new Dictionary<ZDOID, byte[]>();

        /// <summary>Logs fuel put on fire [zdo], a repair of piece [zdo] or a map shared on table [zdo] since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<Fireplace>(zdo))
            {
                float fuel = zdo.GetFloat(ZDOVars.s_fuel);
                int added = Fuels.TryGetValue(zdo.m_uid, out float before) && fuel > before ? Mathf.Max(1, Mathf.RoundToInt(fuel - before)) : 0;
                string doer = WorkTracker.Doer(zdo);
                for (int i = 0; i < added; i++)
                {
                    GameEventLog.Write($"Fueled: {Names.PrefabName(zdo)} by {doer}");
                }
                Fuels[zdo.m_uid] = fuel;
            }
            if (Names.Has<MapTable>(zdo))
            {
                byte[] map = zdo.GetByteArray(ZDOVars.s_data);
                if (Maps.TryGetValue(zdo.m_uid, out byte[] before) && map != null && map != before)
                {
                    GameEventLog.Write($"Map shared: {WorkTracker.Doer(zdo)} at {Names.PrefabName(zdo)}");
                }
                Maps[zdo.m_uid] = map;
            }
            if (Names.Has<WearNTear>(zdo))
            {
                SeePiece(zdo);
            }
        }

        /// <summary>Forgets the fire, piece or map table [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Fuels.Remove(uid);
            Healths.Remove(uid);
            Maps.Remove(uid);
        }

        /// <summary>
        /// Logs a repair of built piece [zdo] since the last scan. A piece keeps no health until it is damaged, so
        /// until then its health is the most it can have.
        /// </summary>
        private static void SeePiece(ZDO zdo)
        {
            float health = zdo.GetFloat(ZDOVars.s_health, Names.Prefab(zdo).GetComponent<WearNTear>().m_health);
            if (Healths.TryGetValue(zdo.m_uid, out float before) && health > before)
            {
                GameEventLog.Write($"Repaired: {Names.PrefabName(zdo)} by {WorkTracker.Doer(zdo)}");
            }
            Healths[zdo.m_uid] = health;
        }
    }
}
