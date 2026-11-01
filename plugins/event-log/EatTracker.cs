using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs what each player eats or drinks. A player's game plays the eat animation on every game through the
    /// server, then shows the food in the player's hand for a moment by writing it into the character's data.
    /// </summary>
    [HarmonyPatch]
    internal static class EatTracker
    {
        /// <summary>Hash of the call that plays an animation on every player's game.</summary>
        private static readonly int SetTriggerHash = "SetTrigger".GetStableHashCode();

        /// <summary>Animation a player's game plays when they eat or drink.</summary>
        private const string EatAnimation = "eat";

        /// <summary>Seconds to wait for the food to show in the player's hand after the eat animation.</summary>
        private const float HandWaitSeconds = 3f;

        /// <summary>Characters that just played the eat animation, with the game time it reached the server.</summary>
        private static readonly Dictionary<ZDOID, float> Eating = new Dictionary<ZDOID, float>();

        /// <summary>Characters whose wait is over, gathered before they are removed.</summary>
        private static readonly List<ZDOID> Done = new List<ZDOID>();

        /// <summary>Remembers a player character that played the eat animation.</summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash != SetTriggerHash)
            {
                return;
            }
            ZPackage parameters = new ZPackage(data.m_parameters.GetArray());
            ZDO zdo = ZDOMan.instance.GetZDO(data.m_targetZDO);
            if (zdo != null && Names.Has<Player>(zdo) && parameters.ReadString() == EatAnimation)
            {
                Eating[data.m_targetZDO] = Time.time;
            }
        }

        /// <summary>Returns true when item prefab [hash] is food or a drink.</summary>
        public static bool IsConsumable(int hash)
        {
            GameObject prefab = ObjectDB.instance == null ? null : ObjectDB.instance.GetItemPrefab(hash);
            ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
            return item != null && item.m_itemData.m_shared.m_itemType == ItemDrop.ItemData.ItemType.Consumable;
        }

        /// <summary>Logs the food each eating character holds, every frame, on the server only.</summary>
        [HarmonyPostfix]
        [HarmonyPatch(typeof(ZDOMan), nameof(ZDOMan.Update))]
        private static void AfterUpdate()
        {
            if (Eating.Count == 0)
            {
                return;
            }
            foreach (KeyValuePair<ZDOID, float> entry in Eating)
            {
                ZDO player = ZDOMan.instance.GetZDO(entry.Key);
                int hand = player == null ? 0 : player.GetInt(ZDOVars.s_rightItem);
                if (hand != 0 && IsConsumable(hand))
                {
                    GameEventLog.Write($"Ate: {player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer)} {Names.Item(hand)}");
                    Done.Add(entry.Key);
                }
                else if (Time.time - entry.Value > HandWaitSeconds)
                {
                    Done.Add(entry.Key);
                }
            }
            foreach (ZDOID uid in Done)
            {
                Eating.Remove(uid);
            }
            Done.Clear();
        }
    }
}
