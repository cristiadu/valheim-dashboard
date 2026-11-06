using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs changes players make to built pieces: a bed claimed, a portal named, a ward turned on or off, and a
    /// player given or taking away their own access to a ward. Each piece keeps who claimed it or who built it, a
    /// ward keeps the name of each player with access, and a portal's name is found like a smelter's player.
    /// </summary>
    internal static class PieceStateTracker
    {
        /// <summary>What each bed, portal or ward showed at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> States = new Dictionary<ZDOID, string>();

        /// <summary>Names of the players with access to each ward at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, HashSet<string>> WardUsers = new Dictionary<ZDOID, HashSet<string>>();

        /// <summary>Logs what changed on bed, portal or ward [zdo] since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            string line;
            string state;
            if (Names.HasInParts<Bed>(zdo))
            {
                state = zdo.GetString(ZDOVars.s_ownerName);
                line = $"Bed claimed: {state}";
            }
            else if (Names.Has<TeleportWorld>(zdo))
            {
                state = zdo.GetString(ZDOVars.s_tag);
                line = $"Portal named: {state} by {WorkTracker.Doer(zdo)}";
            }
            else if (Names.HasInParts<PrivateArea>(zdo))
            {
                SeeWardAccess(zdo);
                state = zdo.GetBool(ZDOVars.s_enabled) ? "on" : "off";
                line = $"Ward turned {state}: {Names.PrefabName(zdo)} by {Names.Builder(zdo)}";
            }
            else
            {
                return;
            }
            if (States.TryGetValue(zdo.m_uid, out string before) && before != state && state != string.Empty)
            {
                GameEventLog.Write(line);
            }
            States[zdo.m_uid] = state;
        }

        /// <summary>Forgets the piece [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            States.Remove(uid);
            WardUsers.Remove(uid);
        }

        /// <summary>Logs each player given or losing access to ward [zdo] since the last scan.</summary>
        private static void SeeWardAccess(ZDO zdo)
        {
            HashSet<string> now = new HashSet<string>();
            int count = zdo.GetInt(ZDOVars.s_permitted);
            for (int i = 0; i < count; i++)
            {
                now.Add(zdo.GetString("pu_name" + i));
            }
            if (WardUsers.TryGetValue(zdo.m_uid, out HashSet<string> before))
            {
                string ward = $"{Names.PrefabName(zdo)} built by {Names.Builder(zdo)}";
                foreach (string player in now)
                {
                    if (!before.Contains(player))
                    {
                        GameEventLog.Write($"Ward access given: {player} on {ward}");
                    }
                }
                foreach (string player in before)
                {
                    if (!now.Contains(player))
                    {
                        GameEventLog.Write($"Ward access removed: {player} on {ward}");
                    }
                }
            }
            WardUsers[zdo.m_uid] = now;
        }
    }
}
