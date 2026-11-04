using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs what each player eats or drinks. While a player eats, their game shows the food in their right hand
    /// for a moment by writing it into the character's data, and food is never held in the hand otherwise.
    /// </summary>
    [HarmonyPatch]
    internal static class EatTracker
    {
        /// <summary>Item each online character held in their right hand on the last frame, by character.</summary>
        private static readonly Dictionary<ZDOID, int> HandItems = new Dictionary<ZDOID, int>();

        /// <summary>Returns true when item prefab [hash] is food or a drink.</summary>
        public static bool IsConsumable(int hash)
        {
            GameObject prefab = ObjectDB.instance == null ? null : ObjectDB.instance.GetItemPrefab(hash);
            ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
            return item != null && item.m_itemData.m_shared.m_itemType == ItemDrop.ItemData.ItemType.Consumable;
        }

        /// <summary>
        /// Logs food that just showed up in an online player's hand, every frame, on the server only. The food
        /// shows for about a second, longer than the server's five-second world scan could catch.
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
                int hand = player.GetInt(ZDOVars.s_rightItem);
                bool isNewHandItem = !HandItems.TryGetValue(peer.m_characterID, out int before) || before != hand;
                HandItems[peer.m_characterID] = hand;
                if (isNewHandItem && hand != 0 && IsConsumable(hand))
                {
                    GameEventLog.Write($"Ate: {player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer)} {Names.Item(hand)}");
                }
            }
        }

        /// <summary>Forgets the hand of character [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            HandItems.Remove(uid);
        }
    }
}
