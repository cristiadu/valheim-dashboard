using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Keeps the time of each creature's latest attack move. A creature's game sends its animations to every
    /// player through the server, so the server sees which creatures are fighting.
    /// </summary>
    [HarmonyPatch]
    internal static class CombatTracker
    {
        /// <summary>Hash of the call that plays an animation, such as an attack, on every player's game.</summary>
        private static readonly int SetTriggerHash = "SetTrigger".GetStableHashCode();

        /// <summary>Seconds a creature counts as fighting after its last move.</summary>
        private const float FightingSeconds = 5f;

        /// <summary>Farthest a fighting creature can be from a player who died, in meters.</summary>
        private const float FightingRangeMeters = 30f;

        /// <summary>Game time of each creature's latest move, in seconds.</summary>
        private static readonly Dictionary<ZDOID, float> LastMoveTimes = new Dictionary<ZDOID, float>();

        /// <summary>Creatures whose last move is too old to count, gathered before they are removed.</summary>
        private static readonly List<ZDOID> StaleCreatures = new List<ZDOID>();

        /// <summary>Records the time of a creature's animation as it passes through the server.</summary>
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
            if (data.m_methodHash != SetTriggerHash)
            {
                return;
            }
            ZDO zdo = ZDOMan.instance.GetZDO(data.m_targetZDO);
            if (zdo != null && Names.Has<Character>(zdo) && !Names.Has<Player>(zdo))
            {
                LastMoveTimes[data.m_targetZDO] = Time.time;
            }
        }

        /// <summary>Returns the names of creatures that made a move near [position] in the last few seconds.</summary>
        public static List<string> FightingNear(Vector3 position)
        {
            List<string> fighting = new List<string>();
            foreach (KeyValuePair<ZDOID, float> entry in LastMoveTimes)
            {
                ZDO zdo = ZDOMan.instance.GetZDO(entry.Key);
                if (zdo == null || Time.time - entry.Value > FightingSeconds)
                {
                    continue;
                }
                string name = Names.PrefabName(zdo);
                if (Vector3.Distance(zdo.GetPosition(), position) <= FightingRangeMeters && !fighting.Contains(name))
                {
                    fighting.Add(name);
                }
            }
            return fighting;
        }

        /// <summary>Forgets creatures whose last move is too old to count.</summary>
        public static void ForgetOldMoves()
        {
            foreach (KeyValuePair<ZDOID, float> entry in LastMoveTimes)
            {
                if (Time.time - entry.Value > FightingSeconds)
                {
                    StaleCreatures.Add(entry.Key);
                }
            }
            foreach (ZDOID creature in StaleCreatures)
            {
                LastMoveTimes.Remove(creature);
            }
            StaleCreatures.Clear();
        }
    }
}
