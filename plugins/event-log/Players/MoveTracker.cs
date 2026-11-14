using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Counts each player's weapon hits on creatures, dodges, jumps and staggers. A player's game sends each move to
    /// every player through the server as an animation, and each hit as a damage call or a damage number. The counts
    /// are logged once a minute, so a fight is a few lines, not hundreds. A swing that hits nothing is not counted.
    /// </summary>
    internal static class MoveTracker
    {
        /// <summary>Hash of the call that plays an animation, such as a swing, on every player's game.</summary>
        private static readonly int SetTriggerHash = "SetTrigger".GetStableHashCode();

        /// <summary>Hash of the call that damages a creature another player's game runs.</summary>
        private static readonly int DamageHash = "RPC_Damage".GetStableHashCode();

        /// <summary>Hash of the call that shows a damage number on every player's game.</summary>
        private static readonly int DamageTextHash = "RPC_DamageText".GetStableHashCode();

        /// <summary>Seconds between two logs of the counts.</summary>
        private const float LogIntervalSeconds = 60f;

        /// <summary>Longest time from the start of a swing to its hit, in seconds.</summary>
        private const float HitSeconds = 1f;

        /// <summary>Farthest a damage number shows from the player whose swing made it, in meters.</summary>
        private const float ReachMeters = 8f;

        /// <summary>Farthest a damage number shows from the middle of the creature that was hit, in meters.</summary>
        private const float CreatureSizeMeters = 6f;

        /// <summary>Word logged for each animation that is not a weapon swing.</summary>
        private static readonly Dictionary<string, string> MoveWords = new Dictionary<string, string>
        {
            { "dodge", "dodged" },
            { "jump", "jumped" },
            { "stagger", "staggered" },
        };

        /// <summary>Kinds of damage numbers that mean damage was done, as the game numbers them: normal, resistant and weak.</summary>
        private static readonly HashSet<int> DamageTextTypes = new HashSet<int> { 0, 1, 2 };

        /// <summary>Hands a weapon can be held in.</summary>
        private static readonly int[] HandSlots = { ZDOVars.s_rightItem, ZDOVars.s_leftItem };

        /// <summary>Moves since the last log, by character and move, for example <c>landed AxeBronze on Greyling</c>.</summary>
        private static readonly Dictionary<(string Character, string Move), int> Counts = new Dictionary<(string Character, string Move), int>();

        /// <summary>The latest swing of each player's game that has not hit yet: when, who, and with which weapon.</summary>
        private static readonly Dictionary<long, (float Time, ZDO Player, string Weapon)> Swings = new Dictionary<long, (float Time, ZDO Player, string Weapon)>();

        /// <summary>
        /// Times of damage calls sent to each player's game by another one. That game shows a damage number for each,
        /// which is not a hit of its own player.
        /// </summary>
        private static readonly Dictionary<long, Queue<float>> OthersHits = new Dictionary<long, Queue<float>>();

        /// <summary>Creatures the last scan found.</summary>
        private static List<ZDO> creatures = new List<ZDO>();

        /// <summary>Creatures found by the scan in progress.</summary>
        private static List<ZDO> scannedCreatures = new List<ZDO>();

        /// <summary>Game time of the next log, in seconds.</summary>
        private static float nextLogTime;

        /// <summary>Remembers a creature the scan found, so a damage number can be matched to a creature close to it.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<Character>(zdo) && !Names.Has<Player>(zdo))
            {
                scannedCreatures.Add(zdo);
            }
        }

        /// <summary>Counts the move or hit [data] stands for: a player's dodge, jump, stagger or swing, or the hit of a swing.</summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash == DamageTextHash)
            {
                ReadDamageText(data);
                return;
            }
            ZDO target = data.m_methodHash == SetTriggerHash || data.m_methodHash == DamageHash ? ZDOMan.instance.GetZDO(data.m_targetZDO) : null;
            if (target == null)
            {
                return;
            }
            if (data.m_methodHash == DamageHash)
            {
                ReadDamage(data, target);
                return;
            }
            if (!Names.Has<Player>(target))
            {
                return;
            }
            string animation = new ZPackage(data.m_parameters.GetArray()).ReadString();
            if (MoveWords.TryGetValue(animation, out string move))
            {
                Count(target, move);
                return;
            }
            string weapon = WeaponSwung(target, animation);
            if (weapon != null)
            {
                Swings[data.m_senderPeerID] = (Time.time, target, weapon);
            }
        }

        /// <summary>
        /// Logs the counts once a minute, one line per character and move, for example
        /// <c>Moves: Ragnar landed AxeBronze on Greyling x42</c> or <c>Moves: Ragnar dodged x3</c>, then starts counting again.
        /// Also keeps the creatures this scan found.
        /// </summary>
        public static void AfterScan()
        {
            (creatures, scannedCreatures) = (scannedCreatures, creatures);
            scannedCreatures.Clear();
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
        /// Counts a hit when [data] is a damage call on the creature [target] from the player whose game sent it, right
        /// after their swing. The creature's game shows the damage number, so that number is noted as not its own hit.
        /// </summary>
        private static void ReadDamage(ZRoutedRpc.RoutedRPCData data, ZDO target)
        {
            if (!Names.Has<Character>(target) || Names.Has<Player>(target))
            {
                return;
            }
            if (!OthersHits.TryGetValue(data.m_targetPeerID, out Queue<float> times))
            {
                times = new Queue<float>();
                OthersHits[data.m_targetPeerID] = times;
            }
            times.Enqueue(Time.time);
            ZPackage parameters = new ZPackage(data.m_parameters.GetArray());
            HitData hit = new HitData();
            hit.Deserialize(ref parameters);
            if (Swings.TryGetValue(data.m_senderPeerID, out (float Time, ZDO Player, string Weapon) swing) && Time.time - swing.Time <= HitSeconds && hit.m_attacker == swing.Player.m_uid)
            {
                Swings.Remove(data.m_senderPeerID);
                Count(swing.Player, $"landed {swing.Weapon} on {Names.PrefabName(target)}");
            }
        }

        /// <summary>
        /// Counts a hit when [data] is a damage number from a game whose player just swung, shown within reach of that
        /// player and on a creature. A game shows the number itself, with no damage call, when it runs the creature its
        /// player hits. The number has no creature in it, so the hit is on the creature closest to where it shows.
        /// Numbers on players and tames, and numbers for another player's hit, are left out.
        /// </summary>
        private static void ReadDamageText(ZRoutedRpc.RoutedRPCData data)
        {
            ZPackage outer = new ZPackage(data.m_parameters.GetArray());
            ZPackage text = outer.ReadPackage();
            int type = text.ReadInt();
            Vector3 position = text.ReadVector3();
            float.TryParse(text.ReadString(), NumberStyles.Float, CultureInfo.InvariantCulture, out float damage);
            bool isOnPlayer = text.ReadBool();
            if (isOnPlayer || damage <= 0f || !DamageTextTypes.Contains(type))
            {
                return;
            }
            if (OthersHits.TryGetValue(data.m_senderPeerID, out Queue<float> times))
            {
                while (times.Count > 0 && Time.time - times.Peek() > HitSeconds)
                {
                    times.Dequeue();
                }
                if (times.Count > 0)
                {
                    times.Dequeue();
                    return;
                }
            }
            if (!Swings.TryGetValue(data.m_senderPeerID, out (float Time, ZDO Player, string Weapon) swing) || Time.time - swing.Time > HitSeconds)
            {
                return;
            }
            ZDO creature = Vector3.Distance(swing.Player.GetPosition(), position) <= ReachMeters ? CreatureAt(position) : null;
            if (creature != null)
            {
                Swings.Remove(data.m_senderPeerID);
                Count(swing.Player, $"landed {swing.Weapon} on {Names.PrefabName(creature)}");
            }
        }

        /// <summary>Returns the creature closest to [position], or null when none stands there.</summary>
        private static ZDO CreatureAt(Vector3 position)
        {
            ZDO closest = null;
            float closestMeters = CreatureSizeMeters;
            foreach (ZDO creature in creatures)
            {
                float meters = Vector3.Distance(creature.GetPosition(), position);
                if (meters <= closestMeters)
                {
                    closest = creature;
                    closestMeters = meters;
                }
            }
            return closest;
        }

        /// <summary>Adds one [move] to the count of the character [player].</summary>
        private static void Count(ZDO player, string move)
        {
            (string, string) key = (player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer), move);
            Counts[key] = Counts.TryGetValue(key, out int count) ? count + 1 : 1;
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
