using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs short actions of each online player: eating or drinking, opening a crafting station, doing an emote,
    /// using a forsaken power and reading a vegvisir or rune stone. Eating and powers play an animation that the
    /// player's game sends to every player through the server, and eating also shows the food in the right hand
    /// for a moment. When the food never shows, the rise in the player's max health tells how much health it gives.
    /// Reading a stone asks the server where the place it marks is.
    /// </summary>
    [HarmonyPatch]
    internal static class ActionTracker
    {
        /// <summary>Key of the character data that holds the crafting animation, 0 when not at a station.</summary>
        private static readonly int CraftingKey = 438569 + ZSyncAnimation.GetHash("crafting");

        /// <summary>Hash of the call that plays an animation on every player's game.</summary>
        private static readonly int SetTriggerHash = "SetTrigger".GetStableHashCode();

        /// <summary>Hash of the call a player's game sends to the server to find the place a stone marks.</summary>
        private static readonly int DiscoverLocationHash = "RPC_DiscoverClosestLocation".GetStableHashCode();

        /// <summary>Station logged when no station, or more than one kind, is in reach of the player.</summary>
        private const string UnknownStation = "crafting_station";

        /// <summary>Meters past a station's use range a player may seem to stand, since their place reaches the server late.</summary>
        private const float StationMarginMeters = 0.5f;

        /// <summary>Seconds to wait for the food to show in a player's hand after they start eating.</summary>
        private const float EatSeconds = 3f;

        /// <summary>
        /// Seconds before an eat call in which a max health change still counts as the meal's, since the player's
        /// data can reach the server before the call does.
        /// </summary>
        private const float EarlyHealthSeconds = 1.5f;

        /// <summary>When each character started eating and their max health before it, by character, until the food is logged.</summary>
        private static readonly Dictionary<ZDOID, (float Time, float MaxHealth)> EatStarts = new Dictionary<ZDOID, (float Time, float MaxHealth)>();

        /// <summary>Each online character's max health now, the one before its last change, and when it changed, by character.</summary>
        private static readonly Dictionary<ZDOID, (float Now, float Before, float ChangedAt)> MaxHealths =
            new Dictionary<ZDOID, (float Now, float Before, float ChangedAt)>();

        /// <summary>When each character's food was last logged, by character.</summary>
        private static readonly Dictionary<ZDOID, float> LastAteTimes = new Dictionary<ZDOID, float>();

        /// <summary>Eats that waited too long for their food, gathered before they are logged.</summary>
        private static readonly List<ZDOID> LateEats = new List<ZDOID>();

        /// <summary>What each online character showed on the last frame, by character.</summary>
        private static readonly Dictionary<ZDOID, (int Hand, int Crafting, int Emote)> LastSeen =
            new Dictionary<ZDOID, (int Hand, int Crafting, int Emote)>();

        /// <summary>Every crafting station in the world, by object ID: its prefab name, place, use animation and use range in meters.</summary>
        private static readonly Dictionary<ZDOID, (string Name, Vector3 Position, int Animation, float Range)> Stations =
            new Dictionary<ZDOID, (string Name, Vector3 Position, int Animation, float Range)>();

        /// <summary>Returns true when item prefab [hash] is food or a drink.</summary>
        public static bool IsConsumable(int hash)
        {
            GameObject prefab = ObjectDB.instance == null ? null : ObjectDB.instance.GetItemPrefab(hash);
            ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
            return item != null && item.m_itemData.m_shared.m_itemType == ItemDrop.ItemData.ItemType.Consumable;
        }

        /// <summary>
        /// Notes a player starting to eat, and logs a player using a forsaken power or reading a stone, when [data]
        /// is such a call.
        /// </summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash == DiscoverLocationHash)
            {
                ZPackage parameters = new ZPackage(data.m_parameters.GetArray());
                GameEventLog.Write($"Location revealed: {parameters.ReadString()} by {Names.Peer(data.m_senderPeerID)}");
                return;
            }
            ZDO player = data.m_methodHash == SetTriggerHash ? ZDOMan.instance.GetZDO(data.m_targetZDO) : null;
            if (player == null || !Names.Has<Player>(player))
            {
                return;
            }
            string animation = new ZPackage(data.m_parameters.GetArray()).ReadString();
            if (animation == "eat" && !(LastAteTimes.TryGetValue(data.m_targetZDO, out float ateTime) && Time.time - ateTime <= EatSeconds))
            {
                EatStarts[data.m_targetZDO] = (Time.time, MaxHealthBeforeNow(data.m_targetZDO, player));
            }
            else if (animation == "gpower")
            {
                GameEventLog.Write($"Power used: {player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer)}");
            }
        }

        /// <summary>
        /// Logs what just changed for each online player, every frame, on the server only. Food shows for about
        /// a second, too short for the server's five-second world scan.
        /// </summary>
        [HarmonyPostfix]
        [HarmonyPatch(typeof(ZDOMan), nameof(ZDOMan.Update))]
        private static void AfterUpdate()
        {
            if (ZNet.instance == null || !ZNet.instance.IsServer())
            {
                return;
            }
            foreach (ZNetPeer peer in ZNet.instance.GetConnectedPeers())
            {
                ZDO player = ZDOMan.instance.GetZDO(peer.m_characterID);
                if (player == null)
                {
                    continue;
                }
                NoteMaxHealth(peer.m_characterID, player.GetFloat(ZDOVars.s_maxHealth));
                (int Hand, int Crafting, int Emote) now = (player.GetInt(ZDOVars.s_rightItem), player.GetInt(CraftingKey), player.GetInt(ZDOVars.s_emoteID));
                bool isKnown = LastSeen.TryGetValue(peer.m_characterID, out (int Hand, int Crafting, int Emote) before);
                LastSeen[peer.m_characterID] = now;
                string name = player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer);
                if ((!isKnown || before.Hand != now.Hand) && now.Hand != 0 && IsConsumable(now.Hand))
                {
                    GameEventLog.Write($"Ate: {name} {Names.Item(now.Hand)}");
                    EatStarts.Remove(peer.m_characterID);
                    LastAteTimes[peer.m_characterID] = Time.time;
                }
                if (isKnown && before.Crafting == 0 && now.Crafting != 0)
                {
                    GameEventLog.Write($"Crafting: {name} at {StationInReach(player.GetPosition(), now.Crafting)}");
                }
                string emote = player.GetString(ZDOVars.s_emote);
                if (isKnown && before.Emote != now.Emote && emote != string.Empty)
                {
                    GameEventLog.Write($"Emote: {name} {emote}");
                }
            }
            LogLateEats();
        }

        /// <summary>Notes [maxHealth], the max health character [uid] has now, and when it last changed.</summary>
        private static void NoteMaxHealth(ZDOID uid, float maxHealth)
        {
            if (!MaxHealths.TryGetValue(uid, out (float Now, float Before, float ChangedAt) known))
            {
                MaxHealths[uid] = (maxHealth, maxHealth, float.MinValue);
            }
            else if (known.Now != maxHealth)
            {
                MaxHealths[uid] = (maxHealth, known.Now, Time.time);
            }
        }

        /// <summary>
        /// Returns the max health character [uid] had just before eating: the one before its last change when that
        /// change came in the last [EarlyHealthSeconds], or else what [player] has now.
        /// </summary>
        private static float MaxHealthBeforeNow(ZDOID uid, ZDO player)
        {
            bool isChangedJustNow = MaxHealths.TryGetValue(uid, out (float Now, float Before, float ChangedAt) known)
                && Time.time - known.ChangedAt <= EarlyHealthSeconds;
            return isChangedJustNow ? known.Before : player.GetFloat(ZDOVars.s_maxHealth);
        }

        /// <summary>
        /// Logs each player who started eating a few seconds ago without the food showing in their hand, so the
        /// server never learned what they ate. The line has how much their max health went up, which is the health
        /// the food gives, or 0 for a mead.
        /// </summary>
        private static void LogLateEats()
        {
            foreach (KeyValuePair<ZDOID, (float Time, float MaxHealth)> start in EatStarts)
            {
                if (Time.time - start.Value.Time > EatSeconds)
                {
                    LateEats.Add(start.Key);
                }
            }
            foreach (ZDOID character in LateEats)
            {
                float maxHealthBefore = EatStarts[character].MaxHealth;
                EatStarts.Remove(character);
                ZDO player = ZDOMan.instance.GetZDO(character);
                if (player == null)
                {
                    GameEventLog.Write($"Ate something: {Names.UnknownPlayer}");
                    continue;
                }
                int gain = Mathf.Max(0, Mathf.RoundToInt(player.GetFloat(ZDOVars.s_maxHealth) - maxHealthBefore));
                GameEventLog.Write($"Ate something: {player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer)} (max health +{gain})");
            }
            LateEats.Clear();
        }

        /// <summary>Remembers where crafting station [zdo] stands, each scan.</summary>
        public static void See(ZDO zdo)
        {
            if (!Names.Has<CraftingStation>(zdo))
            {
                return;
            }
            CraftingStation station = Names.Prefab(zdo).GetComponent<CraftingStation>();
            Stations[zdo.m_uid] = (Names.PrefabName(zdo), zdo.GetPosition(), station.m_useAnimation, station.m_useDistance);
        }

        /// <summary>Forgets character or crafting station [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            LastSeen.Remove(uid);
            EatStarts.Remove(uid);
            MaxHealths.Remove(uid);
            LastAteTimes.Remove(uid);
            Stations.Remove(uid);
        }

        /// <summary>
        /// Returns the crafting station a player at [position] playing crafting animation [animation] is using, for
        /// example <c>forge</c>. A station only opens within its use range, so the station is the one kind with
        /// that animation in reach. Several stations share an animation, so when none or more than one kind is in
        /// reach the station is not known.
        /// </summary>
        private static string StationInReach(Vector3 position, int animation)
        {
            string found = null;
            foreach ((string Name, Vector3 Position, int Animation, float Range) station in Stations.Values)
            {
                if (station.Animation != animation || Vector3.Distance(station.Position, position) > station.Range + StationMarginMeters)
                {
                    continue;
                }
                if (found != null && found != station.Name)
                {
                    return UnknownStation;
                }
                found = station.Name;
            }
            return found ?? UnknownStation;
        }
    }
}
