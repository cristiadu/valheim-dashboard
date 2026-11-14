using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs the places of the world each player walks up to, such as a trader, a boss altar or a crypt. The world
    /// keeps at most one place per zone, a square of 64 meters, and a dungeon's inside sits high above its entrance
    /// in the same zone.
    /// </summary>
    internal static class PlaceTracker
    {
        /// <summary>Closest a player must come to a small place to find it, in meters. Larger places count from their own edge.</summary>
        private const float MinFoundMeters = 15f;

        /// <summary>Places each character found since the server started, as character and zone, so each is logged once.</summary>
        private static readonly HashSet<string> Found = new HashSet<string>();

        /// <summary>Logs the place the character [name] at [position] stands at, the first time they come that close.</summary>
        public static void See(string name, Vector3 position)
        {
            if (!TryGetPlace(position, out ZoneSystem.LocationInstance place))
            {
                return;
            }
            Vector3 offset = place.m_position - position;
            offset.y = 0f;
            float reach = Mathf.Max(place.m_location.m_exteriorRadius, MinFoundMeters);
            Vector2s zone = ZoneSystem.GetZone(position);
            if (offset.magnitude <= reach && Found.Add($"{name}|{zone.x}|{zone.y}"))
            {
                GameEventLog.Write($"Place found: {place.m_location.m_prefabName} at {Names.MapPosition(place.m_position)} by {name}");
            }
        }

        /// <summary>Returns the prefab name of the place in the zone of [position], for example <c>Crypt2</c>, or null when it has none.</summary>
        public static string PlaceAt(Vector3 position)
        {
            return TryGetPlace(position, out ZoneSystem.LocationInstance place) ? place.m_location.m_prefabName : null;
        }

        /// <summary>Finds the [place] in the zone of [position]. Returns false when the zone has none.</summary>
        private static bool TryGetPlace(Vector3 position, out ZoneSystem.LocationInstance place)
        {
            place = default;
            return ZoneSystem.instance != null && ZoneSystem.instance.m_locationInstances.TryGetValue(ZoneSystem.GetZone(position), out place);
        }
    }
}
