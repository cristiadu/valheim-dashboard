using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs arrows, bolts and other ammo players shoot. Each shot is a flying object the shooter's game makes, so its
    /// object ID starts with the shooter's ID, and the game destroys it once it lands. Ammo whose flying object other
    /// ammo shares is left out, since the object can't tell which one was shot.
    /// </summary>
    internal static class ShotTracker
    {
        /// <summary>Ammo item name by the prefab hash of the flying object it shoots, read from the game's items once.</summary>
        private static Dictionary<int, string> ammoByProjectile;

        /// <summary>Logs the shot [zdo] stands for, as the server destroys it, when it is a flying object of known ammo.</summary>
        public static void Destroyed(ZDO zdo)
        {
            if (ObjectDB.instance == null)
            {
                return;
            }
            ammoByProjectile ??= ReadAmmo();
            if (!ammoByProjectile.TryGetValue(zdo.GetPrefab(), out string ammo))
            {
                return;
            }
            GameEventLog.Write($"Shot: {ammo} by {Names.Peer(zdo.m_uid.UserID)}");
        }

        /// <summary>Returns each ammo item by the prefab hash of the flying object it shoots, leaving out shared objects.</summary>
        private static Dictionary<int, string> ReadAmmo()
        {
            Dictionary<int, string> ammo = new Dictionary<int, string>();
            HashSet<int> shared = new HashSet<int>();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop.ItemData.SharedData item = prefab.GetComponent<ItemDrop>()?.m_itemData.m_shared;
                GameObject projectile = item?.m_attack?.m_attackProjectile;
                if (item == null || item.m_itemType != ItemDrop.ItemData.ItemType.Ammo || projectile == null)
                {
                    continue;
                }
                int hash = projectile.name.GetStableHashCode();
                if (!ammo.TryAdd(hash, prefab.name))
                {
                    shared.Add(hash);
                }
            }
            foreach (int hash in shared)
            {
                ammo.Remove(hash);
            }
            return ammo;
        }
    }
}
