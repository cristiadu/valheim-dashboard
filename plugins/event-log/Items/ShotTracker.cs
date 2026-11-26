using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs arrows, bolts and other ammo players shoot. Each shot is a flying object the shooter's game makes, so its
    /// object ID starts with the shooter's ID, and the game destroys it once it lands. Some ammo shares its flying
    /// object, as wood arrows do with other arrows, so the object can't tell which one was shot: the line then names
    /// each one it may be, as in <c>Shot: ArrowWood/ArrowBronze by Ragnar</c>.
    /// </summary>
    internal static class ShotTracker
    {
        /// <summary>Between the names of ammo that share a flying object, in a line.</summary>
        private const string AmmoSeparator = "/";

        /// <summary>
        /// Ammo item names by the prefab hash of the flying object they shoot, joined by <see cref="AmmoSeparator"/>
        /// when more than one shoots it, read from the game's items once.
        /// </summary>
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

        /// <summary>Returns the ammo items that shoot each flying object, by the object's prefab hash.</summary>
        private static Dictionary<int, string> ReadAmmo()
        {
            Dictionary<int, string> ammo = new Dictionary<int, string>();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop.ItemData.SharedData item = prefab.GetComponent<ItemDrop>()?.m_itemData.m_shared;
                GameObject projectile = item?.m_attack?.m_attackProjectile;
                if (item == null || item.m_itemType != ItemDrop.ItemData.ItemType.Ammo || projectile == null)
                {
                    continue;
                }
                int hash = projectile.name.GetStableHashCode();
                ammo[hash] = ammo.TryGetValue(hash, out string others) ? others + AmmoSeparator + prefab.name : prefab.name;
            }
            return ammo;
        }
    }
}
