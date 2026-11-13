using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs trees cut down, rocks mined out, and ore, wood or fuel put into smelters, kilns and other stations that
    /// turn one item into another. A player hitting or filling an object another player's game owns asks that game
    /// through the server, so the server sees who asked. Otherwise the player is the one whose game owns it.
    /// </summary>
    internal static class WorkTracker
    {
        /// <summary>Hash of the call a player sends to hit a tree, a rock or another object.</summary>
        private static readonly int DamageHash = "RPC_Damage".GetStableHashCode();

        /// <summary>Hash of the call a player sends to put an item into a smelter, kiln or similar station.</summary>
        private static readonly int AddOreHash = "RPC_AddOre".GetStableHashCode();

        /// <summary>Hash of the call a player sends to put a mead base into a fermenter.</summary>
        private static readonly int AddItemHash = "RPC_AddItem".GetStableHashCode();

        /// <summary>Hash of the call a player sends to write a name on a portal.</summary>
        private static readonly int SetTagHash = "RPC_SetTag".GetStableHashCode();

        /// <summary>Hash of the call a player sends to put a saddle on a tame another player's game owns.</summary>
        private static readonly int AddSaddleHash = "AddSaddle".GetStableHashCode();

        /// <summary>Hashes of the calls a player sends to fuel a fire, repair a piece or share their map on a table.</summary>
        private static readonly HashSet<int> UpkeepHashes = new HashSet<int>
        {
            "RPC_AddFuel".GetStableHashCode(),
            "RPC_Repair".GetStableHashCode(),
            "MapData".GetStableHashCode(),
        };

        /// <summary>
        /// Seconds a player who asked through the server counts as the one who did it. Longer than a scan, since
        /// stations are read once per scan.
        /// </summary>
        private const float AskedSeconds = 10f;

        /// <summary>Player who last asked to hit or fill each object through the server, and when, by object ID.</summary>
        private static readonly Dictionary<ZDOID, (long Peer, float Time)> AskedBy = new Dictionary<ZDOID, (long Peer, float Time)>();

        /// <summary>Items queued in each station at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, List<string>> Queues = new Dictionary<ZDOID, List<string>>();

        /// <summary>Fuel in each station that burns one, such as coal in a smelter, at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, float> Fuels = new Dictionary<ZDOID, float>();

        /// <summary>
        /// Remembers who asked when [data] is a hit, an item put into a station or a fermenter, a portal name, a
        /// saddle, fuel, a repair or a map shared.
        /// </summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash == DamageHash || data.m_methodHash == AddOreHash || data.m_methodHash == AddItemHash
                || data.m_methodHash == SetTagHash || data.m_methodHash == AddSaddleHash || UpkeepHashes.Contains(data.m_methodHash))
            {
                AskedBy[data.m_targetZDO] = (data.m_senderPeerID, Time.time);
            }
        }

        /// <summary>Logs the items and the fuel put into a station since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            if (!Names.Has<Smelter>(zdo))
            {
                return;
            }
            SeeFuel(zdo);
            List<string> queue = new List<string>();
            int queued = zdo.GetInt(ZDOVars.s_queued);
            for (int i = 0; i < queued; i++)
            {
                queue.Add(zdo.GetString("item" + i));
            }
            if (Queues.TryGetValue(zdo.m_uid, out List<string> before))
            {
                LogAdded(zdo, before, queue);
            }
            Queues[zdo.m_uid] = queue;
        }

        /// <summary>
        /// Logs the fuel put into [station] since the last scan, such as coal in a smelter, one per unit of fuel. Fuel
        /// only goes up when a player adds it. A kiln burns no fuel.
        /// </summary>
        private static void SeeFuel(ZDO station)
        {
            ItemDrop fuelItem = Names.Prefab(station).GetComponent<Smelter>().m_fuelItem;
            if (fuelItem == null)
            {
                return;
            }
            float fuel = station.GetFloat(ZDOVars.s_fuel);
            if (Fuels.TryGetValue(station.m_uid, out float before) && fuel > before)
            {
                int added = Mathf.Max(1, Mathf.RoundToInt(fuel - before));
                GameEventLog.Write($"Smelting: {fuelItem.gameObject.name} x{added} in {Names.PrefabName(station)} by {Doer(station)}");
            }
            Fuels[station.m_uid] = fuel;
        }

        /// <summary>Logs a tree cut down or a rock mined out as the server destroys it.</summary>
        public static void Destroyed(ZDO zdo)
        {
            Queues.Remove(zdo.m_uid);
            Fuels.Remove(zdo.m_uid);
            if (Names.Has<TreeBase>(zdo))
            {
                GameEventLog.Write($"Tree cut: {Names.PrefabName(zdo)} by {Doer(zdo)}");
            }
            else if (Names.Has<MineRock5>(zdo))
            {
                GameEventLog.Write($"Rock mined: {Names.PrefabName(zdo)} by {Doer(zdo)}");
            }
            AskedBy.Remove(zdo.m_uid);
        }

        /// <summary>Forgets requests too old to count.</summary>
        public static void ForgetOldRequests()
        {
            List<ZDOID> old = new List<ZDOID>();
            foreach (KeyValuePair<ZDOID, (long Peer, float Time)> entry in AskedBy)
            {
                if (Time.time - entry.Value.Time > AskedSeconds)
                {
                    old.Add(entry.Key);
                }
            }
            foreach (ZDOID uid in old)
            {
                AskedBy.Remove(uid);
            }
        }

        /// <summary>
        /// Logs each item [station] queued since the last scan. The station works from the front of its queue
        /// and adds to the back, so the items still in [before] lead [now] and the rest are new.
        /// </summary>
        private static void LogAdded(ZDO station, List<string> before, List<string> now)
        {
            int processed = 0;
            while (processed < before.Count && !IsPrefix(before, processed, now))
            {
                processed++;
            }
            Dictionary<string, int> added = new Dictionary<string, int>();
            for (int i = before.Count - processed; i < now.Count; i++)
            {
                added.TryGetValue(now[i], out int count);
                added[now[i]] = count + 1;
            }
            foreach (KeyValuePair<string, int> item in added)
            {
                GameEventLog.Write($"Smelting: {item.Key} x{item.Value} in {Names.PrefabName(station)} by {Doer(station)}");
            }
        }

        /// <summary>Returns true when [before] from [start] on is the start of [now].</summary>
        private static bool IsPrefix(List<string> before, int start, List<string> now)
        {
            if (before.Count - start > now.Count)
            {
                return false;
            }
            for (int i = start; i < before.Count; i++)
            {
                if (before[i] != now[i - start])
                {
                    return false;
                }
            }
            return true;
        }

        /// <summary>Returns the player who asked to hit or fill [zdo] just now, or else the player whose game owns it.</summary>
        public static string Doer(ZDO zdo)
        {
            bool isAsked = AskedBy.TryGetValue(zdo.m_uid, out (long Peer, float Time) asked) && Time.time - asked.Time <= AskedSeconds;
            return Names.Peer(isAsked ? asked.Peer : zdo.GetOwner());
        }
    }
}
