using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Follows each boss summoned while the server runs: logs when its health drops past three quarters, half and
    /// a quarter, and when it dies, how long after the summon and which players hit it.
    /// </summary>
    internal static class BossFightTracker
    {
        /// <summary>Shares of a boss's health, in percent, that log a line when its health drops to them.</summary>
        private static readonly int[] HurtPercents = { 75, 50, 25 };

        /// <summary>Game time each living boss was summoned at, in seconds, by object ID.</summary>
        private static readonly Dictionary<ZDOID, float> SummonTimes = new Dictionary<ZDOID, float>();

        /// <summary>Lowest share of health already logged for each boss, in percent, by object ID.</summary>
        private static readonly Dictionary<ZDOID, int> LoggedPercents = new Dictionary<ZDOID, int>();

        /// <summary>Starts following the boss [zdo], just summoned.</summary>
        public static void Summoned(ZDO zdo)
        {
            SummonTimes[zdo.m_uid] = Time.time;
        }

        /// <summary>
        /// Logs each followed boss whose health dropped to a new share since the last scan, for example
        /// <c>Boss hurt: Eikthyr 50</c> at half health. A share is logged once, even when the boss heals.
        /// </summary>
        public static void AfterScan()
        {
            foreach (ZDOID uid in SummonTimes.Keys)
            {
                ZDO zdo = ZDOMan.instance.GetZDO(uid);
                Character boss = zdo == null ? null : Names.Prefab(zdo)?.GetComponent<Character>();
                if (boss == null)
                {
                    continue;
                }
                float maxHealth = zdo.GetFloat(ZDOVars.s_maxHealth, boss.m_health);
                float health = zdo.GetFloat(ZDOVars.s_health, maxHealth);
                int logged = LoggedPercents.TryGetValue(uid, out int percent) ? percent : 100;
                int reached = logged;
                foreach (int hurtPercent in HurtPercents)
                {
                    if (health > 0f && health <= maxHealth * hurtPercent / 100f && hurtPercent < reached)
                    {
                        reached = hurtPercent;
                    }
                }
                if (reached < logged)
                {
                    LoggedPercents[uid] = reached;
                    GameEventLog.Write($"Boss hurt: {Names.PrefabName(zdo)} {reached}");
                }
            }
        }

        /// <summary>
        /// Logs a followed boss the server is destroying after players hit it, for example
        /// <c>Boss defeated: Eikthyr after 187 seconds by Ragnar, Bjorn</c>.
        /// </summary>
        public static void Destroyed(ZDO zdo)
        {
            if (!SummonTimes.TryGetValue(zdo.m_uid, out float summonTime))
            {
                return;
            }
            SummonTimes.Remove(zdo.m_uid);
            LoggedPercents.Remove(zdo.m_uid);
            List<string> attackers = CreatureTracker.AttackersOf(zdo);
            if (attackers.Count > 0)
            {
                int seconds = Mathf.RoundToInt(Time.time - summonTime);
                GameEventLog.Write($"Boss defeated: {Names.PrefabName(zdo)} after {seconds} seconds by {string.Join(", ", attackers)}");
            }
        }
    }
}
