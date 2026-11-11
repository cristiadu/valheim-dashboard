using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs signs players write and items they hang on item stands, such as trophies, or put on armor stands. A
    /// player's game takes over the sign or stand before changing it, so its owner is the player who did it. A
    /// stand that lets go of its item drops it on the ground, which is not a player's drop.
    /// </summary>
    internal static class PlacedItemTracker
    {
        /// <summary>Text of each sign at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> SignTexts = new Dictionary<ZDOID, string>();

        /// <summary>Item hash on each item stand at the last scan, by object ID, or 0 when it is empty.</summary>
        private static readonly Dictionary<ZDOID, int> StandItems = new Dictionary<ZDOID, int>();

        /// <summary>Item hash in each slot of each armor stand at the last scan, by object ID, or 0 for an empty slot.</summary>
        private static readonly Dictionary<ZDOID, int[]> ArmorStandItems = new Dictionary<ZDOID, int[]>();

        /// <summary>Logs a sign or item stand that changed since the last scan. [isNew] is true for a new object.</summary>
        public static void See(ZDO zdo, bool isNew)
        {
            if (Names.Has<Sign>(zdo))
            {
                string text = zdo.GetString(ZDOVars.s_text, string.Empty).Replace('\n', ' ');
                if ((isNew || SignTexts.TryGetValue(zdo.m_uid, out string oldText) && text != oldText) && text != string.Empty)
                {
                    GameEventLog.Write($"Sign written: {Names.Peer(zdo.GetOwner())}: {text}");
                }
                SignTexts[zdo.m_uid] = text;
            }
            else if (Names.Has<ItemStand>(zdo))
            {
                int item = zdo.GetInt(ZDOVars.s_item);
                if ((isNew || StandItems.TryGetValue(zdo.m_uid, out int oldItem) && item != oldItem) && item != 0)
                {
                    GameEventLog.Write($"Item hung: {Names.Item(item)} by {Names.Peer(zdo.GetOwner())}");
                }
                if (item == 0 && StandItems.TryGetValue(zdo.m_uid, out int heldItem) && heldItem != 0)
                {
                    ItemTracker.NoteSpill(zdo.GetPosition());
                }
                StandItems[zdo.m_uid] = item;
            }
            else if (Names.Has<ArmorStand>(zdo))
            {
                SeeArmorStand(zdo, isNew);
            }
        }

        /// <summary>Forgets a sign or item stand the server destroyed.</summary>
        public static void Destroyed(ZDOID uid)
        {
            SignTexts.Remove(uid);
            StandItems.Remove(uid);
            ArmorStandItems.Remove(uid);
        }

        /// <summary>Logs each item put on a slot of armor stand [zdo] since the last scan. [isNew] is true for a new stand.</summary>
        private static void SeeArmorStand(ZDO zdo, bool isNew)
        {
            int[] now = new int[Names.Prefab(zdo).GetComponent<ArmorStand>().m_slots.Count];
            ArmorStandItems.TryGetValue(zdo.m_uid, out int[] before);
            for (int slot = 0; slot < now.Length; slot++)
            {
                now[slot] = zdo.GetInt(slot + "_item");
                bool isNewItem = isNew || before != null && now[slot] != before[slot];
                if (isNewItem && now[slot] != 0)
                {
                    GameEventLog.Write($"Item hung: {Names.Item(now[slot])} by {Names.Peer(zdo.GetOwner())}");
                }
                if (now[slot] == 0 && before != null && before[slot] != 0)
                {
                    ItemTracker.NoteSpill(zdo.GetPosition());
                }
            }
            ArmorStandItems[zdo.m_uid] = now;
        }
    }
}
