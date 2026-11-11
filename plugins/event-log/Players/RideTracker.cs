using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs players riding a tame, putting a saddle on one, a tame starting to follow a player, and a player
    /// starting to pull a cart. A saddled tame keeps who rides it, a tame keeps the name of who it follows, and a
    /// cart's owner is the player whose game took it over to pull it. A saddle is put on like a smelter is filled.
    /// </summary>
    internal static class RideTracker
    {
        /// <summary>What each tame or cart showed at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, (long Rider, bool IsSaddled, string Followed, bool IsPulled)> States =
            new Dictionary<ZDOID, (long Rider, bool IsSaddled, string Followed, bool IsPulled)>();

        /// <summary>Logs what changed on tame or cart [zdo] since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            bool isCart = Names.Has<Vagon>(zdo);
            if (!isCart && !Names.Has<Tameable>(zdo))
            {
                return;
            }
            (long Rider, bool IsSaddled, string Followed, bool IsPulled) now = (
                Names.HasInParts<Sadle>(zdo) ? zdo.GetLong(ZDOVars.s_user, 0L) : 0L,
                zdo.GetBool(ZDOVars.s_haveSaddleHash),
                zdo.GetString(ZDOVars.s_follow),
                isCart && zdo.GetBool(ZDOVars.s_attachJointHash));
            if (States.TryGetValue(zdo.m_uid, out (long Rider, bool IsSaddled, string Followed, bool IsPulled) before))
            {
                Log(zdo, before, now);
            }
            States[zdo.m_uid] = now;
        }

        /// <summary>Forgets the tame or cart [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            States.Remove(uid);
        }

        /// <summary>Logs each change from [before] to [now] on tame or cart [zdo].</summary>
        private static void Log(ZDO zdo, (long Rider, bool IsSaddled, string Followed, bool IsPulled) before,
            (long Rider, bool IsSaddled, string Followed, bool IsPulled) now)
        {
            string name = Names.PrefabName(zdo);
            if (now.Rider != 0L && now.Rider != before.Rider)
            {
                GameEventLog.Write($"Riding: {Names.Peer(now.Rider)} on {name}");
            }
            if (now.IsSaddled && !before.IsSaddled)
            {
                GameEventLog.Write($"Saddled: {name} by {WorkTracker.Doer(zdo)}");
            }
            if (now.Followed != string.Empty && now.Followed != before.Followed)
            {
                GameEventLog.Write($"Tame following: {name} follows {now.Followed}");
            }
            if (now.IsPulled && !before.IsPulled)
            {
                GameEventLog.Write($"Pulling cart: {Names.Peer(zdo.GetOwner())} with {name}");
            }
        }
    }
}
