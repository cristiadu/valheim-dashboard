using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>Turns the IDs the server keeps into names people know.</summary>
    internal static class Names
    {
        /// <summary>Player text when the server does not know who it is.</summary>
        public const string UnknownPlayer = "an unknown player";

        /// <summary>Character name by player ID, learned from characters online since the server started.</summary>
        public static readonly Dictionary<long, string> CharacterNames = new Dictionary<long, string>();

        /// <summary>Returns true when the prefab of [zdo] has a component of type <typeparamref name="T"/>.</summary>
        public static bool Has<T>(ZDO zdo) where T : Component
        {
            int prefab = zdo.GetPrefab();
            if (!PrefabsWith<T>.HasComponent.TryGetValue(prefab, out bool hasComponent))
            {
                hasComponent = Prefab(zdo)?.GetComponent<T>() != null;
                PrefabsWith<T>.HasComponent[prefab] = hasComponent;
            }
            return hasComponent;
        }

        /// <summary>
        /// Returns true when the prefab of [zdo] or one of its parts has a component of type <typeparamref name="T"/>,
        /// such as the storage of a cart or a ship.
        /// </summary>
        public static bool HasInParts<T>(ZDO zdo) where T : Component
        {
            int prefab = zdo.GetPrefab();
            if (!PrefabsWith<T>.HasComponentInParts.TryGetValue(prefab, out bool hasComponent))
            {
                hasComponent = Prefab(zdo)?.GetComponentInChildren<T>(true) != null;
                PrefabsWith<T>.HasComponentInParts[prefab] = hasComponent;
            }
            return hasComponent;
        }

        /// <summary>Returns [position] on the map, as whole meters east and north of the world's center.</summary>
        public static string MapPosition(Vector3 position)
        {
            return $"{Mathf.RoundToInt(position.x)} {Mathf.RoundToInt(position.z)}";
        }

        /// <summary>Returns the item name for item prefab [hash], for example <c>SwordIron</c>.</summary>
        public static string Item(int hash)
        {
            GameObject prefab = ObjectDB.instance == null ? null : ObjectDB.instance.GetItemPrefab(hash);
            return prefab == null ? hash.ToString() : prefab.name;
        }

        /// <summary>Returns the prefab name of [zdo], for example <c>wood_floor_1x1</c> or <c>Eikthyr</c>.</summary>
        public static string PrefabName(ZDO zdo)
        {
            GameObject prefab = Prefab(zdo);
            return prefab == null ? zdo.GetPrefab().ToString() : prefab.name;
        }

        /// <summary>Returns the prefab [zdo] was made from, or null when the server does not know it.</summary>
        public static GameObject Prefab(ZDO zdo)
        {
            return ZNetScene.instance == null ? null : ZNetScene.instance.GetPrefab(zdo.GetPrefab());
        }

        /// <summary>Returns the character name of the player with [playerId].</summary>
        public static string Character(long playerId)
        {
            return CharacterNames.TryGetValue(playerId, out string name) && name != string.Empty ? name : UnknownPlayer;
        }

        /// <summary>
        /// Returns who built the piece [zdo]: the character name when that player was online since the server
        /// started, or else the Steam name the world keeps for every player who joined it.
        /// </summary>
        public static string Builder(ZDO zdo)
        {
            string character = Character(zdo.GetLong(ZDOVars.s_creator, 0L));
            int historyIndex = zdo.GetInt(ZDOVars.s_creatorIndex, -1);
            List<ZNet.CrossNetworkUserInfo> history = ZNet.World?.m_playerHistory;
            if (character != UnknownPlayer || history == null || historyIndex < 0 || historyIndex >= history.Count)
            {
                return character;
            }
            return history[historyIndex].m_displayName;
        }

        /// <summary>Returns the character name of the player on connection [peerId].</summary>
        public static string Peer(long peerId)
        {
            ZNetPeer peer = ZNet.instance == null ? null : ZNet.instance.GetPeer(peerId);
            return peer == null || peer.m_playerName == string.Empty ? UnknownPlayer : peer.m_playerName;
        }
    }
}
