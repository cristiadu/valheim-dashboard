using System.Collections.Generic;
using CraftedItem = (string Item, int Level, string Crafter);
using ItemCounts = System.Collections.Generic.Dictionary<(string Item, int Level, string Crafter), int>;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs items players made or upgraded. Crafting happens on the player's game, but every crafted item keeps the
    /// name of who made it and its level. When more of an item made by someone sits in chests or on the ground than
    /// ever before, the new ones were just made. The first scan only counts what the world already holds.
    /// </summary>
    internal static class CraftedItemTracker
    {
        /// <summary>Crafted items each chest or dropped item holds, by object ID, kept with the data revision they came from.</summary>
        private static readonly Dictionary<ZDOID, (uint Revision, ItemCounts Counts)> Held =
            new Dictionary<ZDOID, (uint Revision, ItemCounts Counts)>();

        /// <summary>Most of each crafted item the world ever held at once.</summary>
        private static readonly ItemCounts MostHeld =
            new ItemCounts();

        /// <summary>False until the first scan has counted the crafted items already in the world.</summary>
        private static bool hasSeenWorld;

        /// <summary>Counts the crafted items chest or dropped item [zdo] holds when they changed since the last scan.</summary>
        public static void See(ZDO zdo)
        {
            bool isChest = Names.HasInParts<Container>(zdo) && !Names.Has<TombStone>(zdo);
            if (!isChest && !Names.Has<ItemDrop>(zdo))
            {
                return;
            }
            if (Held.TryGetValue(zdo.m_uid, out (uint Revision, ItemCounts Counts) before) && before.Revision == zdo.DataRevision)
            {
                return;
            }
            ItemCounts counts = new ItemCounts();
            if (isChest)
            {
                byte[] data = zdo.GetByteArray(ZDOVars.s_items);
                foreach (ItemDrop.ItemData item in data == null ? new List<ItemDrop.ItemData>() : ItemTracker.LoadItems(data))
                {
                    Count(counts, item.m_dropPrefab == null ? item.m_shared.m_name : item.m_dropPrefab.name, item);
                }
            }
            else
            {
                ItemDrop.ItemData item = new ItemDrop.ItemData();
                ItemDrop.LoadFromZDO(item, zdo);
                Count(counts, Names.PrefabName(zdo), item);
            }
            Held[zdo.m_uid] = (zdo.DataRevision, counts);
        }

        /// <summary>Forgets the chest or dropped item [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Held.Remove(uid);
        }

        /// <summary>Logs each crafted item the world now holds more of than ever before, after each scan.</summary>
        public static void AfterScan()
        {
            ItemCounts totals = new ItemCounts();
            foreach ((uint Revision, ItemCounts Counts) held in Held.Values)
            {
                foreach (KeyValuePair<CraftedItem, int> item in held.Counts)
                {
                    totals.TryGetValue(item.Key, out int total);
                    totals[item.Key] = total + item.Value;
                }
            }
            foreach (KeyValuePair<CraftedItem, int> item in totals)
            {
                MostHeld.TryGetValue(item.Key, out int most);
                if (item.Value <= most)
                {
                    continue;
                }
                MostHeld[item.Key] = item.Value;
                if (hasSeenWorld)
                {
                    Log(item.Key, item.Value - most);
                }
            }
            hasSeenWorld = true;
        }

        /// <summary>Adds [item] to [counts] under [name] when a player crafted it.</summary>
        private static void Count(ItemCounts counts, string name, ItemDrop.ItemData item)
        {
            if (string.IsNullOrEmpty(item.m_crafterName))
            {
                return;
            }
            CraftedItem key = (name, item.m_quality, item.m_crafterName);
            counts.TryGetValue(key, out int count);
            counts[key] = count + item.m_stack;
        }

        /// <summary>
        /// Logs [count] new crafted [item]s. An item above level 1 was upgraded, which only happens one item at a
        /// time.
        /// </summary>
        private static void Log(CraftedItem item, int count)
        {
            if (item.Level <= 1)
            {
                GameEventLog.Write($"Made: {item.Item} x{count} by {item.Crafter}");
                return;
            }
            for (int i = 0; i < count; i++)
            {
                GameEventLog.Write($"Upgraded: {item.Item} to level {item.Level} by {item.Crafter}");
            }
        }
    }
}
