using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Scans the world every few seconds for objects that reached the server, such as built pieces and summoned
    /// bosses, and logs each one with the player behind it. Also hands players to <see cref="PlayerTracker"/>,
    /// logs pieces as the server destroys them, and logs each new in-game day.
    /// </summary>
    [HarmonyPatch]
    internal static class WorldScanner
    {
        /// <summary>Seconds between scans of the world for new objects.</summary>
        private const float ScanIntervalSeconds = 5f;

        /// <summary>Prefab hash of a player character.</summary>
        private static readonly int PlayerPrefabHash = "Player".GetStableHashCode();

        /// <summary>The server's table of every object in the world, which ZDOMan keeps private.</summary>
        private static readonly AccessTools.FieldRef<ZDOMan, Dictionary<ZDOID, ZDO>> ObjectsById =
            AccessTools.FieldRefAccess<ZDOMan, Dictionary<ZDOID, ZDO>>("m_objectsByID");

        /// <summary>Every object seen so far, so each new object is logged once.</summary>
        private static readonly HashSet<ZDOID> SeenObjects = new HashSet<ZDOID>();

        /// <summary>Objects found by the scan in progress, logged once every character in it is known.</summary>
        private static readonly List<ZDO> NewObjects = new List<ZDO>();

        /// <summary>Game time of the next scan, in seconds.</summary>
        private static float nextScanTime;

        /// <summary>False until the first scan has recorded the objects already in the world.</summary>
        private static bool hasSeenWorld;

        /// <summary>In-game day at the last scan, or -1 before the first scan.</summary>
        private static int lastDay = -1;

        /// <summary>Scans the world for new objects every few seconds, on the server only.</summary>
        [HarmonyPostfix]
        [HarmonyPatch(typeof(ZDOMan), nameof(ZDOMan.Update))]
        private static void AfterUpdate(ZDOMan __instance)
        {
            if (ZNet.instance == null || !ZNet.instance.IsServer() || Time.time < nextScanTime)
            {
                return;
            }
            nextScanTime = Time.time + ScanIntervalSeconds;
            foreach (KeyValuePair<ZDOID, ZDO> entry in ObjectsById(__instance))
            {
                ZDO zdo = entry.Value;
                if (zdo.GetPrefab() == PlayerPrefabHash)
                {
                    Names.CharacterNames[zdo.GetLong(ZDOVars.s_playerID, 0L)] = zdo.GetString(ZDOVars.s_playerName, string.Empty);
                }
                PlayerTracker.See(zdo);
                bool isNew = SeenObjects.Add(entry.Key) && hasSeenWorld;
                CreatureTracker.See(zdo, isNew);
                PlacedItemTracker.See(zdo, isNew);
                ItemTracker.See(zdo, isNew);
                WorkTracker.See(zdo);
                if (isNew)
                {
                    NewObjects.Add(zdo);
                }
            }
            foreach (ZDO zdo in NewObjects)
            {
                LogNewObject(zdo);
            }
            NewObjects.Clear();
            hasSeenWorld = true;
            PlayerTracker.AfterScan();
            CombatTracker.ForgetOldMoves();
            WorkTracker.ForgetOldRequests();
            LogNewDay();
        }

        /// <summary>
        /// Logs a built piece or a creature just before the server forgets it. A plant is skipped, since it is
        /// replaced when it grows.
        /// </summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZDOMan), "HandleDestroyedZDO")]
        private static void BeforeDestroyed(ZDOMan __instance, ZDOID uid)
        {
            SeenObjects.Remove(uid);
            PlayerTracker.Forget(uid);
            PlacedItemTracker.Destroyed(uid);
            ZDO zdo = __instance.GetZDO(uid);
            if (zdo == null)
            {
                return;
            }
            CreatureTracker.Destroyed(zdo);
            ItemTracker.Destroyed(zdo);
            WorkTracker.Destroyed(zdo);
            if (zdo.GetLong(ZDOVars.s_creator, 0L) != 0L && !Names.Has<Plant>(zdo))
            {
                GameEventLog.Write($"Piece destroyed: {Names.PrefabName(zdo)} built by {Names.Character(zdo.GetLong(ZDOVars.s_creator, 0L))}");
            }
        }

        /// <summary>
        /// Logs a new object worth a line: a piece or a plant with its builder, or a boss with the player who summoned it,
        /// whose game made the boss and so owns it.
        /// </summary>
        private static void LogNewObject(ZDO zdo)
        {
            long creator = zdo.GetLong(ZDOVars.s_creator, 0L);
            if (creator != 0L)
            {
                string built = Names.Has<Plant>(zdo) ? "Planted" : "Piece built";
                GameEventLog.Write($"{built}: {Names.PrefabName(zdo)} by {Names.Character(creator)}");
                return;
            }
            Character character = Names.Prefab(zdo)?.GetComponent<Character>();
            if (character != null && character.m_boss)
            {
                GameEventLog.Write($"Boss summoned: {Names.PrefabName(zdo)} by {Names.Peer(zdo.GetOwner())}");
            }
        }

        /// <summary>Logs the in-game day when a new one has started since the last scan.</summary>
        private static void LogNewDay()
        {
            if (EnvMan.instance == null)
            {
                return;
            }
            int day = EnvMan.instance.GetDay();
            if (lastDay >= 0 && day > lastDay)
            {
                GameEventLog.Write($"Day started: {day}");
            }
            lastDay = day;
        }
    }
}
