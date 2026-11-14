using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs arrows, bolts and other ammo players shoot. Each shot is a flying object the shooter's game makes, so its
    /// object ID starts with the shooter's ID, and the game destroys it once it lands. Ammo whose flying object other
    /// ammo players can make shares is left out, since the object can't tell which one was shot.
    /// </summary>
    internal static class ShotTracker
    {
        /// <summary>Hands a bow or crossbow can be held in.</summary>
        private static readonly int[] HandSlots = { ZDOVars.s_leftItem, ZDOVars.s_rightItem };

        /// <summary>Longest time an arrow flies and stays stuck after its shooter put the bow away, in seconds.</summary>
        private const float BowSeconds = 30f;

        /// <summary>Game time each player was last seen holding a bow or crossbow, by the ID of their connection.</summary>
        private static readonly Dictionary<long, float> BowTimes = new Dictionary<long, float>();

        /// <summary>Ammo item name by the prefab hash of the flying object it shoots, read from the game's items once.</summary>
        private static Dictionary<int, string> ammoByProjectile;

        /// <summary>Remembers when the scan found the player character [zdo] holding a bow or crossbow.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<Player>(zdo) && HoldsBow(zdo))
            {
                BowTimes[zdo.GetOwner()] = Time.time;
            }
        }

        /// <summary>
        /// Logs the shot [zdo] stands for, as the server destroys it, when it is a flying object of known ammo and the
        /// player whose game made it holds a bow or crossbow, or did a moment ago. That game also makes the arrows of
        /// creatures it runs, which are not the player's shots.
        /// </summary>
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
            long shooter = zdo.m_uid.UserID;
            ZNetPeer peer = ZNet.instance.GetPeer(shooter);
            ZDO player = peer == null ? null : ZDOMan.instance.GetZDO(peer.m_characterID);
            bool hadBow = BowTimes.TryGetValue(shooter, out float bowTime) && Time.time - bowTime <= BowSeconds;
            if (hadBow || (player != null && HoldsBow(player)))
            {
                GameEventLog.Write($"Shot: {ammo} by {Names.Peer(shooter)}");
            }
        }

        /// <summary>Returns true when the player character [player] holds a bow or crossbow.</summary>
        private static bool HoldsBow(ZDO player)
        {
            if (ObjectDB.instance == null)
            {
                return false;
            }
            foreach (int slot in HandSlots)
            {
                GameObject prefab = ObjectDB.instance.GetItemPrefab(player.GetInt(slot));
                if (prefab != null && prefab.GetComponent<ItemDrop>()?.m_itemData.m_shared.m_itemType == ItemDrop.ItemData.ItemType.Bow)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Returns each ammo item by the prefab hash of the flying object it shoots, and logs which ammo that is, for
        /// example <c>Ammo tracked: ArrowFire, ArrowWood</c>. Ammo no recipe makes is what creatures shoot, and it can
        /// share a flying object with an arrow, so it is left out. So is ammo that still shares one after that.
        /// </summary>
        private static Dictionary<int, string> ReadAmmo()
        {
            HashSet<string> craftable = new HashSet<string>();
            foreach (Recipe recipe in ObjectDB.instance.m_recipes)
            {
                if (recipe.m_item != null)
                {
                    craftable.Add(recipe.m_item.gameObject.name);
                }
            }
            Dictionary<int, List<string>> ammoByHash = new Dictionary<int, List<string>>();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop.ItemData.SharedData item = prefab.GetComponent<ItemDrop>()?.m_itemData.m_shared;
                GameObject projectile = item?.m_attack?.m_attackProjectile;
                if (item == null || item.m_itemType != ItemDrop.ItemData.ItemType.Ammo || projectile == null || !craftable.Contains(prefab.name))
                {
                    continue;
                }
                int hash = projectile.name.GetStableHashCode();
                if (!ammoByHash.TryGetValue(hash, out List<string> sharing))
                {
                    sharing = new List<string>();
                    ammoByHash[hash] = sharing;
                }
                sharing.Add(prefab.name);
            }
            Dictionary<int, string> ammo = new Dictionary<int, string>();
            foreach (KeyValuePair<int, List<string>> entry in ammoByHash)
            {
                if (entry.Value.Count == 1)
                {
                    ammo[entry.Key] = entry.Value[0];
                }
            }
            List<string> tracked = new List<string>(ammo.Values);
            tracked.Sort(System.StringComparer.Ordinal);
            GameEventLog.Write($"Ammo tracked: {string.Join(", ", tracked)}");
            return ammo;
        }
    }
}
