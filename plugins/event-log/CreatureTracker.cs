using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs creatures that died after players hit them, with every player who hit them, and the life of tames:
    /// taming, births, growing up, names and deaths. Each creature remembers which players hit it.
    /// </summary>
    internal static class CreatureTracker
    {
        /// <summary>Whether each tameable creature was tame at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, bool> TameStates = new Dictionary<ZDOID, bool>();

        /// <summary>Name of each tameable creature at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> TameNames = new Dictionary<ZDOID, string>();

        /// <summary>Farthest a creature reaches to eat food off the ground, in meters, with some margin.</summary>
        private const float EatingRangeMeters = 3f;

        /// <summary>
        /// Returns true when a creature that eats food off the ground, such as a wolf or a boar, stands within
        /// reach of [position].
        /// </summary>
        public static bool IsEaterNear(Vector3 position)
        {
            foreach (ZDOID creature in TameStates.Keys)
            {
                ZDO zdo = ZDOMan.instance.GetZDO(creature);
                if (zdo != null && Vector3.Distance(zdo.GetPosition(), position) <= EatingRangeMeters)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>Logs what changed on a tameable creature since the last scan. [isNew] is true for a new object.</summary>
        public static void See(ZDO zdo, bool isNew)
        {
            if (!Names.Has<Tameable>(zdo))
            {
                return;
            }
            bool isTame = zdo.GetBool(ZDOVars.s_tamed);
            string name = zdo.GetString(ZDOVars.s_tamedName, string.Empty);
            string creature = Names.PrefabName(zdo);
            if (isNew && isTame)
            {
                ZLog.Log(Names.Has<Growup>(zdo) ? $"Tame born: {creature}" : $"Tame grew up: {creature}");
            }
            else if (TameStates.TryGetValue(zdo.m_uid, out bool wasTame) && isTame && !wasTame)
            {
                ZLog.Log($"Tamed: {creature}");
            }
            if (TameNames.TryGetValue(zdo.m_uid, out string oldName) && name != oldName && name != string.Empty)
            {
                ZLog.Log($"Pet named: {creature} {name}");
            }
            TameStates[zdo.m_uid] = isTame;
            TameNames[zdo.m_uid] = name;
        }

        /// <summary>
        /// Logs a creature the server is destroying when players hit it, or when it was a tame. A young tame that
        /// grows up is replaced, not killed, so it is not logged.
        /// </summary>
        public static void Destroyed(ZDO zdo)
        {
            TameStates.Remove(zdo.m_uid);
            TameNames.Remove(zdo.m_uid);
            if (!Names.Has<Character>(zdo) || Names.Has<Player>(zdo) || Names.Has<Growup>(zdo))
            {
                return;
            }
            List<string> attackers = new List<string>();
            foreach (string player in Names.CharacterNames.Values)
            {
                if (player != string.Empty && zdo.GetBool(ZDOVars.s_attackers + player) && !attackers.Contains(player))
                {
                    attackers.Add(player);
                }
            }
            string creature = Names.PrefabName(zdo);
            int level = zdo.GetInt(ZDOVars.s_level, 1);
            if (attackers.Count > 0)
            {
                ZLog.Log($"Creature killed: {creature} level {level} by {string.Join(", ", attackers)}");
            }
            else if (zdo.GetBool(ZDOVars.s_tamed))
            {
                ZLog.Log($"Tame died: {creature} {zdo.GetString(ZDOVars.s_tamedName, string.Empty)}".TrimEnd());
            }
        }
    }
}
