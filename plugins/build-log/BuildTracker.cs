using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.BuildLog
{
    /// <summary>
    /// Finds pieces players build as they reach the server, and pieces as the server destroys them, and logs
    /// each one with the character who built it.
    /// </summary>
    [HarmonyPatch]
    internal static class BuildTracker
    {
        /// <summary>Seconds between scans of the world for new pieces.</summary>
        private const float ScanIntervalSeconds = 5f;

        /// <summary>Builder text when the builder's character was never online while the plugin ran.</summary>
        private const string UnknownBuilder = "an unknown player";

        /// <summary>Prefab hash of a player character.</summary>
        private static readonly int PlayerPrefabHash = "Player".GetStableHashCode();

        /// <summary>The server's table of every object in the world, which ZDOMan keeps private.</summary>
        private static readonly AccessTools.FieldRef<ZDOMan, Dictionary<ZDOID, ZDO>> ObjectsById =
            AccessTools.FieldRefAccess<ZDOMan, Dictionary<ZDOID, ZDO>>("m_objectsByID");

        /// <summary>Every object seen so far, so each new piece is logged once.</summary>
        private static readonly HashSet<ZDOID> SeenObjects = new HashSet<ZDOID>();

        /// <summary>Character name by player ID, learned from characters online since the server started.</summary>
        private static readonly Dictionary<long, string> CharacterNames = new Dictionary<long, string>();

        /// <summary>Pieces found by the scan in progress, logged once every character in it is known.</summary>
        private static readonly List<ZDO> NewPieces = new List<ZDO>();

        /// <summary>Game time of the next scan, in seconds.</summary>
        private static float nextScanTime;

        /// <summary>False until the first scan has recorded the pieces already in the world.</summary>
        private static bool hasSeenWorld;

        /// <summary>Scans the world for new pieces every few seconds, on the server only.</summary>
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
                    CharacterNames[zdo.GetLong(ZDOVars.s_playerID, 0L)] = zdo.GetString(ZDOVars.s_playerName, "");
                }
                if (SeenObjects.Add(entry.Key) && hasSeenWorld && zdo.GetLong(ZDOVars.s_creator, 0L) != 0L)
                {
                    NewPieces.Add(zdo);
                }
            }
            foreach (ZDO piece in NewPieces)
            {
                ZLog.Log($"Piece built: {PieceName(piece)} by {BuilderName(piece)}");
            }
            NewPieces.Clear();
            hasSeenWorld = true;
        }

        /// <summary>Logs a built piece just before the server forgets it.</summary>
        [HarmonyPrefix]
        [HarmonyPatch(typeof(ZDOMan), "HandleDestroyedZDO")]
        private static void BeforeDestroyed(ZDOMan __instance, ZDOID uid)
        {
            SeenObjects.Remove(uid);
            ZDO zdo = __instance.GetZDO(uid);
            if (zdo != null && zdo.GetLong(ZDOVars.s_creator, 0L) != 0L)
            {
                ZLog.Log($"Piece destroyed: {PieceName(zdo)} built by {BuilderName(zdo)}");
            }
        }

        /// <summary>Returns the prefab name of [piece], for example <c>wood_floor_1x1</c>.</summary>
        private static string PieceName(ZDO piece)
        {
            GameObject prefab = ZNetScene.instance == null ? null : ZNetScene.instance.GetPrefab(piece.GetPrefab());
            return prefab == null ? piece.GetPrefab().ToString() : prefab.name;
        }

        /// <summary>Returns the character name of the player who built [piece].</summary>
        private static string BuilderName(ZDO piece)
        {
            return CharacterNames.TryGetValue(piece.GetLong(ZDOVars.s_creator, 0L), out string name) && name != ""
                ? name
                : UnknownBuilder;
        }
    }
}
