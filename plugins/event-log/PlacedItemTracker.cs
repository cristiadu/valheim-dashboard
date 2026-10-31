using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs signs players write and items they hang on item stands, such as trophies. A player's game takes
    /// over the sign or stand before changing it, so its owner is the player who did it.
    /// </summary>
    internal static class PlacedItemTracker
    {
        /// <summary>Text of each sign at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> SignTexts = new Dictionary<ZDOID, string>();

        /// <summary>Item hash on each item stand at the last scan, by object ID, or 0 when it is empty.</summary>
        private static readonly Dictionary<ZDOID, int> StandItems = new Dictionary<ZDOID, int>();

        /// <summary>Logs a sign or item stand that changed since the last scan. [isNew] is true for a new object.</summary>
        public static void See(ZDO zdo, bool isNew)
        {
            if (Names.Has<Sign>(zdo))
            {
                string text = zdo.GetString(ZDOVars.s_text, string.Empty).Replace('\n', ' ');
                if ((isNew || SignTexts.TryGetValue(zdo.m_uid, out string oldText) && text != oldText) && text != string.Empty)
                {
                    ZLog.Log($"Sign written: {Names.Peer(zdo.GetOwner())}: {text}");
                }
                SignTexts[zdo.m_uid] = text;
            }
            else if (Names.Has<ItemStand>(zdo))
            {
                int item = zdo.GetInt(ZDOVars.s_item);
                if ((isNew || StandItems.TryGetValue(zdo.m_uid, out int oldItem) && item != oldItem) && item != 0)
                {
                    ZLog.Log($"Item hung: {Names.Item(item)} by {Names.Peer(zdo.GetOwner())}");
                }
                StandItems[zdo.m_uid] = item;
            }
        }

        /// <summary>Forgets a sign or item stand the server destroyed.</summary>
        public static void Destroyed(ZDOID uid)
        {
            SignTexts.Remove(uid);
            StandItems.Remove(uid);
        }
    }
}
