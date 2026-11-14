using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs a close call: a player whose health dropped very low and who got back to safety without dying.
    /// </summary>
    internal static class CloseCallTracker
    {
        /// <summary>Share of a player's max health at or under which they are close to dying.</summary>
        private const float LowHealthShare = 0.15f;

        /// <summary>Share of a player's max health from which they count as safe again.</summary>
        private const float SafeHealthShare = 0.4f;

        /// <summary>
        /// The lowest health of each character who is close to dying now, with their max health, the area and the
        /// creatures fighting close by at that moment, by character.
        /// </summary>
        private static readonly Dictionary<ZDOID, (float Health, float MaxHealth, string Area, List<string> Fighting)> Lows =
            new Dictionary<ZDOID, (float Health, float MaxHealth, string Area, List<string> Fighting)>();

        /// <summary>
        /// Notes the health of [player], the character [uid], and logs the close call once they are safe again, for
        /// example <c>Close call: Ragnar down to 4 of 110 health in BlackForest while fighting Troll</c>. A player
        /// who dies gets the death line, not this one.
        /// </summary>
        public static void See(ZDOID uid, ZDO player)
        {
            float maxHealth = player.GetFloat(ZDOVars.s_maxHealth);
            float health = player.GetFloat(ZDOVars.s_health);
            if (maxHealth <= 0f || health <= 0f || player.GetBool(ZDOVars.s_dead))
            {
                Lows.Remove(uid);
                return;
            }
            bool isLow = Lows.TryGetValue(uid, out (float Health, float MaxHealth, string Area, List<string> Fighting) low);
            if (health <= maxHealth * LowHealthShare)
            {
                if (!isLow || health < low.Health)
                {
                    PlayerState now = PlayerState.Of(player);
                    List<string> fighting = CombatTracker.FightingNear(now.Position);
                    if (isLow)
                    {
                        foreach (string creature in low.Fighting)
                        {
                            if (!fighting.Contains(creature))
                            {
                                fighting.Add(creature);
                            }
                        }
                    }
                    Lows[uid] = (health, maxHealth, now.Area, fighting);
                }
                return;
            }
            if (isLow && health >= maxHealth * SafeHealthShare)
            {
                Lows.Remove(uid);
                string name = player.GetString(ZDOVars.s_playerName, Names.UnknownPlayer);
                string fightingText = low.Fighting.Count == 0 ? string.Empty : $" while fighting {string.Join(", ", low.Fighting)}";
                GameEventLog.Write($"Close call: {name} down to {Mathf.CeilToInt(low.Health)} of {Mathf.RoundToInt(low.MaxHealth)} health in {low.Area}{fightingText}");
            }
        }

        /// <summary>Forgets the character [uid], who left or died.</summary>
        public static void Forget(ZDOID uid)
        {
            Lows.Remove(uid);
        }
    }
}
