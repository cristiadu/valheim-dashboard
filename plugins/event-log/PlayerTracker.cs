using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Follows each player character the scan finds and logs what changed since the last scan: deaths,
    /// biomes and dungeons, portal trips, PvP, beds and new gear.
    /// </summary>
    internal static class PlayerTracker
    {
        /// <summary>Shortest move between two scans that counts as a teleport, in meters.</summary>
        private const float TeleportMeters = 200f;

        /// <summary>Farthest a player lands from the portal they came through, in meters.</summary>
        private const float PortalRangeMeters = 10f;

        /// <summary>Portal name logged when its sign is empty.</summary>
        private const string UnnamedPortal = "an unnamed portal";

        /// <summary>Gear slots a player can see on another player, each with its quality, or 0 when the slot has none.</summary>
        private static readonly (int Item, int Quality)[] GearSlots =
        {
            (ZDOVars.s_rightItem, ZDOVars.s_rightItemQuality),
            (ZDOVars.s_leftItem, ZDOVars.s_leftItemQuality),
            (ZDOVars.s_shoulderItem, ZDOVars.s_shoulderItemQuality),
            (ZDOVars.s_chestItem, 0),
            (ZDOVars.s_legItem, 0),
            (ZDOVars.s_helmetItem, 0),
            (ZDOVars.s_utilityItem, 0),
            (ZDOVars.s_trinketItem, 0),
        };

        /// <summary>What was last seen of each player character, by object ID.</summary>
        private static readonly Dictionary<ZDOID, PlayerState> States = new Dictionary<ZDOID, PlayerState>();

        /// <summary>Last area logged for each character, by name, so an area is logged once the character stays in it.</summary>
        private static readonly Dictionary<string, string> LoggedAreas = new Dictionary<string, string>();

        /// <summary>Area each character was first seen in at the last scan, before it is logged.</summary>
        private static readonly Dictionary<string, string> PendingAreas = new Dictionary<string, string>();

        /// <summary>Gear each character was seen with since the server started, so each piece is logged once.</summary>
        private static readonly HashSet<string> SeenGear = new HashSet<string>();

        /// <summary>Portals found by the scan in progress.</summary>
        private static readonly List<ZDO> Portals = new List<ZDO>();

        /// <summary>Player characters found by the scan in progress.</summary>
        private static readonly List<ZDO> Players = new List<ZDO>();

        /// <summary>Remembers a player character or a portal the scan found.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<Player>(zdo))
            {
                Players.Add(zdo);
            }
            else if (Names.Has<TeleportWorld>(zdo))
            {
                Portals.Add(zdo);
            }
        }

        /// <summary>Logs what changed for each player character the scan found, then starts over for the next scan.</summary>
        public static void AfterScan()
        {
            foreach (ZDO player in Players)
            {
                string name = player.GetString(ZDOVars.s_playerName, string.Empty);
                if (name == string.Empty)
                {
                    continue;
                }
                PlayerState now = PlayerState.Of(player);
                if (States.TryGetValue(player.m_uid, out PlayerState before))
                {
                    LogChanges(player, name, before, now);
                }
                LogArea(name, now.Area);
                States[player.m_uid] = now;
                LogNewGear(player, name);
            }
            Players.Clear();
            Portals.Clear();
        }

        /// <summary>Forgets a player character the server destroyed, such as the body left after a death.</summary>
        public static void Forget(ZDOID uid)
        {
            States.Remove(uid);
        }

        /// <summary>Logs each change between what [before] and [now] saw of the character [name].</summary>
        private static void LogChanges(ZDO player, string name, PlayerState before, PlayerState now)
        {
            if (now.IsDead && !before.IsDead)
            {
                LogDeath(player, name, now);
            }
            if (Vector3.Distance(now.Position, before.Position) >= TeleportMeters && now.Area != PlayerState.DungeonArea && before.Area != PlayerState.DungeonArea)
            {
                LogTeleport(name, now.Position);
            }
            if (now.IsPvp != before.IsPvp)
            {
                ZLog.Log($"PvP turned {(now.IsPvp ? "on" : "off")}: {name}");
            }
            if (now.IsInBed && !before.IsInBed)
            {
                ZLog.Log($"Went to bed: {name}");
            }
        }

        /// <summary>
        /// Logs [area] for the character [name] when it differs from the last one logged. A new area counts once
        /// two scans in a row saw it, so walking along a border does not flood the log.
        /// </summary>
        private static void LogArea(string name, string area)
        {
            if (LoggedAreas.TryGetValue(name, out string logged) && logged == area)
            {
                PendingAreas.Remove(name);
                return;
            }
            if (logged != null && (!PendingAreas.TryGetValue(name, out string pending) || pending != area))
            {
                PendingAreas[name] = area;
                return;
            }
            PendingAreas.Remove(name);
            LoggedAreas[name] = area;
            ZLog.Log($"Area entered: {name} {area}");
        }

        /// <summary>
        /// Logs the death of [name] with the area, the creatures that were fighting close by, and any player who
        /// hit them in PvP.
        /// </summary>
        private static void LogDeath(ZDO player, string name, PlayerState now)
        {
            List<string> fighting = CombatTracker.FightingNear(now.Position);
            foreach (string other in Names.CharacterNames.Values)
            {
                if (other != name && player.GetBool(ZDOVars.s_attackers + other))
                {
                    fighting.Add(other);
                }
            }
            string fightingText = fighting.Count == 0 ? string.Empty : $" while fighting {string.Join(", ", fighting)}";
            ZLog.Log($"Player died: {name} in {now.Area}{fightingText}");
        }

        /// <summary>Logs a trip of [name] through the portal at [position], if they landed next to one.</summary>
        private static void LogTeleport(string name, Vector3 position)
        {
            foreach (ZDO portal in Portals)
            {
                if (Vector3.Distance(portal.GetPosition(), position) <= PortalRangeMeters)
                {
                    string tag = portal.GetString(ZDOVars.s_tag, string.Empty);
                    ZLog.Log($"Teleported: {name} to {(tag == string.Empty ? UnnamedPortal : tag)}");
                    return;
                }
            }
        }

        /// <summary>Logs each piece of gear [name] wears or holds for the first time since the server started.</summary>
        private static void LogNewGear(ZDO player, string name)
        {
            foreach ((int itemVar, int qualityVar) in GearSlots)
            {
                int item = player.GetInt(itemVar);
                if (item == 0)
                {
                    continue;
                }
                int quality = qualityVar == 0 ? 0 : player.GetInt(qualityVar);
                string gear = quality > 1 ? $"{Names.Item(item)} quality {quality}" : Names.Item(item);
                if (SeenGear.Add($"{name}|{gear}"))
                {
                    ZLog.Log($"Gear: {name} {gear}");
                }
            }
        }
    }
}
