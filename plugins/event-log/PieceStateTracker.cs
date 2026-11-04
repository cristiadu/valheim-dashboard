using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs changes players make to built pieces: a bed claimed, a portal named and a ward turned on or off.
    /// Each piece keeps who claimed it or who built it, and a portal's name is found like a smelter's player.
    /// </summary>
    internal static class PieceStateTracker
    {
        /// <summary>What each bed, portal or ward showed at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> States = new Dictionary<ZDOID, string>();

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
        }
    }
}
