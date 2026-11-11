using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs raw food put on cooking stations and mead bases put into fermenters. A cooking station keeps the
    /// player who filled each slot, and a fermenter's player is found like a smelter's.
    /// </summary>
    internal static class KitchenTracker
    {
        /// <summary>Item in each slot of each cooking station at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string[]> Slots = new Dictionary<ZDOID, string[]>();

        /// <summary>Item hash each fermenter held at the last scan, or 0 when empty, by object ID.</summary>
        private static readonly Dictionary<ZDOID, int> Contents = new Dictionary<ZDOID, int>();

        /// <summary>Logs food put on [zdo] or a mead base put into it since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<CookingStation>(zdo))
            {
                SeeCookingStation(zdo);
            }
            else if (Names.Has<Fermenter>(zdo))
            {
                int content = zdo.GetInt(ZDOVars.s_content);
                if (Contents.TryGetValue(zdo.m_uid, out int before) && before == 0 && content != 0)
                {
                    GameEventLog.Write($"Fermenting: {Names.Item(content)} in {Names.PrefabName(zdo)} by {WorkTracker.Doer(zdo)}");
                }
                Contents[zdo.m_uid] = content;
            }
        }

        /// <summary>Forgets the station [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Slots.Remove(uid);
            Contents.Remove(uid);
        }

        /// <summary>
        /// Logs each slot of cooking station [zdo] that now holds raw food it did not hold at the last scan. A
        /// slot's food turns cooked or burnt by itself, and those are never raw food the station takes.
        /// </summary>
        private static void SeeCookingStation(ZDO zdo)
        {
            CookingStation station = Names.Prefab(zdo).GetComponent<CookingStation>();
            string[] now = new string[station.m_slots.Length];
            Slots.TryGetValue(zdo.m_uid, out string[] before);
            for (int slot = 0; slot < now.Length; slot++)
            {
                now[slot] = zdo.GetString("slot" + slot);
                string item = now[slot];
                bool isNewRawFood = before != null && item != before[slot]
                    && station.m_conversion.Exists(conversion => conversion.m_from.gameObject.name == item);
                if (isNewRawFood)
                {
                    long player = zdo.GetLong(ZDOVars.s_playerID + slot, 0L);
                    GameEventLog.Write($"Cooking: {item} on {Names.PrefabName(zdo)} by {Names.Peer(player)}");
                }
            }
            Slots[zdo.m_uid] = now;
        }
    }
}
