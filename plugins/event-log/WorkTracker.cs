using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs trees cut down, rocks mined out and ore or wood put into smelters, kilns and other stations that turn
    /// one item into another. A player hitting or filling an object another player's game owns asks that game
    /// through the server, so the server sees who asked. Otherwise the player is the one whose game owns it.
    /// </summary>
    internal static class WorkTracker
    {
        /// <summary>Hash of the call a player sends to hit a tree, a rock or another object.</summary>
        private static readonly int DamageHash = "RPC_Damage".GetStableHashCode();

        /// <summary>Hash of the call a player sends to put an item into a smelter, kiln or similar station.</summary>
        private static readonly int AddOreHash = "RPC_AddOre".GetStableHashCode();

        /// <summary>
        /// Seconds a player who asked through the server counts as the one who did it. Longer than a scan, since
        /// stations are read once per scan.
        /// </summary>
        private const float AskedSeconds = 10f;

        /// <summary>Player who last asked to hit or fill each object through the server, and when, by object ID.</summary>
        private static readonly Dictionary<ZDOID, (long Peer, float Time)> AskedBy = new Dictionary<ZDOID, (long Peer, float Time)>();

        /// <summary>Items queued in each station at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, List<string>> Queues = new Dictionary<ZDOID, List<string>>();

        /// <summary>Remembers who asked when [data] is a hit or an item put into a station.</summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash == DamageHash || data.m_methodHash == AddOreHash)
            {
                AskedBy[data.m_targetZDO] = (data.m_senderPeerID, Time.time);
            }
        }

        /// <summary>Logs the items put into a station since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            if (!Names.Has<Smelter>(zdo))
            {
                return;
            }
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

        /// <summary>Logs a tree cut down or a rock mined out as the server destroys it.</summary>
        public static void Destroyed(ZDO zdo)
        {
            Queues.Remove(zdo.m_uid);
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
        private static string Doer(ZDO zdo)
        {
            bool isAsked = AskedBy.TryGetValue(zdo.m_uid, out (long Peer, float Time) asked) && Time.time - asked.Time <= AskedSeconds;
            return Names.Peer(isAsked ? asked.Peer : zdo.GetOwner());
        }
    }
}
