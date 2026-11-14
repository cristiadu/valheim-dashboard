using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Counts each player's weapon swings, dodges, jumps and staggers. A player's game sends each of these moves to
    /// every player through the server as an animation. The counts are logged once a minute, so a fight is a few
    /// lines, not hundreds.
    /// </summary>
    internal static class MoveTracker
    {
        /// <summary>Hash of the call that plays an animation, such as a swing, on every player's game.</summary>
        private static readonly int SetTriggerHash = "SetTrigger".GetStableHashCode();

        /// <summary>Seconds between two logs of the counts.</summary>
        private const float LogIntervalSeconds = 60f;

        /// <summary>Word logged for each animation that is not a weapon swing.</summary>
        private static readonly Dictionary<string, string> MoveWords = new Dictionary<string, string>
        {
            { "dodge", "dodged" },
            { "jump", "jumped" },
            { "stagger", "staggered" },
        };

        /// <summary>Hands a weapon can be held in.</summary>
        private static readonly int[] HandSlots = { ZDOVars.s_rightItem, ZDOVars.s_leftItem };

        /// <summary>Moves since the last log, by character and move, for example <c>swung AxeBronze</c>.</summary>
        private static readonly Dictionary<(string Character, string Move), int> Counts = new Dictionary<(string Character, string Move), int>();

        /// <summary>Game time of the next log, in seconds.</summary>
        private static float nextLogTime;

        /// <summary>Counts the move [data] stands for when it is a player's dodge, jump, stagger or weapon swing.</summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            ZDO player = data.m_methodHash == SetTriggerHash ? ZDOMan.instance.GetZDO(data.m_targetZDO) : null;
            if (player == null || !Names.Has<Player>(player))
            {
                return;
            }
            string animation = new ZPackage(data.m_parameters.GetArray()).ReadString();
            if (!MoveWords.TryGetValue(animation, out string move))
            {
                string weapon = WeaponSwung(player, animation);
                if (weapon == null)
                {
                    return;
                }
                move = $"swung {weapon}";
            }
            (string, string) key = (player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer), move);
            Counts[key] = Counts.TryGetValue(key, out int count) ? count + 1 : 1;
        }

        /// <summary>
        /// Logs the counts once a minute, one line per character and move, for example
        /// <c>Moves: Ragnar swung AxeBronze x42</c> or <c>Moves: Ragnar dodged x3</c>, then starts counting again.
        /// </summary>
        public static void AfterScan()
        {
            if (Time.time < nextLogTime)
            {
                return;
            }
            nextLogTime = Time.time + LogIntervalSeconds;
            foreach (KeyValuePair<(string Character, string Move), int> entry in Counts)
            {
                GameEventLog.Write($"Moves: {entry.Key.Character} {entry.Key.Move} x{entry.Value}");
            }
            Counts.Clear();
        }

        /// <summary>
        /// Returns the weapon [player] holds whose attack plays [animation], or null when it is no swing. A combo adds
        /// its step to the animation name. Tools are left out, since building is logged on its own, and bows, since
        /// each arrow is.
        /// </summary>
        private static string WeaponSwung(ZDO player, string animation)
        {
            foreach (int slot in HandSlots)
            {
                int hash = player.GetInt(slot);
                GameObject prefab = hash == 0 || ObjectDB.instance == null ? null : ObjectDB.instance.GetItemPrefab(hash);
                ItemDrop.ItemData.SharedData item = prefab == null ? null : prefab.GetComponent<ItemDrop>()?.m_itemData.m_shared;
                if (item == null || item.m_itemType == ItemDrop.ItemData.ItemType.Tool || item.m_itemType == ItemDrop.ItemData.ItemType.Bow)
                {
                    continue;
                }
                if (Plays(item.m_attack, animation) || Plays(item.m_secondaryAttack, animation))
                {
                    return prefab.name;
                }
            }
            return null;
        }

        /// <summary>Returns true when [attack] plays [animation], or one of its combo steps.</summary>
        private static bool Plays(Attack attack, string animation)
        {
            return attack != null && !string.IsNullOrEmpty(attack.m_attackAnimation) && animation.StartsWith(attack.m_attackAnimation, System.StringComparison.Ordinal);
        }
    }
}
