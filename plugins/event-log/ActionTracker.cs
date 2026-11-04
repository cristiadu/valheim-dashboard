using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs short actions of each online player that their game writes into the character's data: eating or
    /// drinking, opening a crafting station and doing an emote. Eating shows the food in the right hand for a
    /// moment, and food is never held in the hand otherwise.
    /// </summary>
    [HarmonyPatch]
    internal static class ActionTracker
    {
        /// <summary>Key of the character data that holds the crafting animation, 0 when not at a station.</summary>
        private static readonly int CraftingKey = 438569 + ZSyncAnimation.GetHash("crafting");

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
        }

        /// <summary>Forgets character [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            LastSeen.Remove(uid);
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
