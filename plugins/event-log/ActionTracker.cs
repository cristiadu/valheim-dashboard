using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs short actions of each online player: eating or drinking, opening a crafting station, doing an emote,
    /// using a forsaken power and reading a vegvisir or rune stone. Eating and powers play an animation that the
    /// player's game sends to every player through the server, and eating also shows the food in the right hand
    /// for a moment. Reading a stone asks the server where the place it marks is.
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

        /// <summary>Seconds to wait for the food to show in a player's hand after they start eating.</summary>
        private const float EatSeconds = 3f;

        /// <summary>When each character started eating, by character, until the food is logged.</summary>
        private static readonly Dictionary<ZDOID, float> EatStarts = new Dictionary<ZDOID, float>();

        /// <summary>When each character's food was last logged, by character.</summary>
        private static readonly Dictionary<ZDOID, float> LastAteTimes = new Dictionary<ZDOID, float>();

        /// <summary>Eats that waited too long for their food, gathered before they are logged.</summary>
        private static readonly List<ZDOID> LateEats = new List<ZDOID>();

        /// <summary>What each online character showed on the last frame, by character.</summary>
        private static readonly Dictionary<ZDOID, (int Hand, int Crafting, int Emote)> LastSeen =
            new Dictionary<ZDOID, (int Hand, int Crafting, int Emote)>();

        /// <summary>Crafting station prefab names by the animation a player plays at them, built on first use.</summary>
        private static Dictionary<int, List<string>> stationsByAnimation;

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
                EatStarts[data.m_targetZDO] = Time.time;
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
                    GameEventLog.Write($"Crafting: {name} at {StationNames(now.Crafting)}");
                }
                string emote = player.GetString(ZDOVars.s_emote);
                if (isKnown && before.Emote != now.Emote && emote != string.Empty)
                {
                    GameEventLog.Write($"Emote: {name} {emote}");
                }
            }
            LogLateEats();
        }

        /// <summary>
        /// Logs each player who started eating a few seconds ago without the food showing in their hand, so the
        /// server never learned what they ate.
        /// </summary>
        private static void LogLateEats()
        {
            foreach (KeyValuePair<ZDOID, float> start in EatStarts)
            {
                if (Time.time - start.Value > EatSeconds)
                {
                    LateEats.Add(start.Key);
                }
            }
            foreach (ZDOID character in LateEats)
            {
                EatStarts.Remove(character);
                ZDO player = ZDOMan.instance.GetZDO(character);
                GameEventLog.Write($"Ate something: {(player == null ? Names.UnknownPlayer : player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer))}");
            }
            LateEats.Clear();
        }

        /// <summary>Forgets character [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            LastSeen.Remove(uid);
            EatStarts.Remove(uid);
            LastAteTimes.Remove(uid);
        }

        /// <summary>
        /// Returns the crafting stations where a player plays crafting animation [animation], for example
        /// <c>forge</c>, or every such station joined by <c>/</c> when several share it.
        /// </summary>
        private static string StationNames(int animation)
        {
            if (stationsByAnimation == null)
            {
                stationsByAnimation = new Dictionary<int, List<string>>();
                foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
                {
                    CraftingStation station = prefab.GetComponent<CraftingStation>();
                    if (station == null)
                    {
                        continue;
                    }
                    if (!stationsByAnimation.TryGetValue(station.m_useAnimation, out List<string> names))
                    {
                        names = new List<string>();
                        stationsByAnimation[station.m_useAnimation] = names;
                    }
                    names.Add(prefab.name);
                }
            }
            return stationsByAnimation.TryGetValue(animation, out List<string> found) ? string.Join("/", found) : "a crafting station";
        }
    }
}
