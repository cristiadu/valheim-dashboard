using System.Collections.Generic;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Whether each prefab has a component of type <typeparamref name="T"/>, by prefab hash, so each prefab is
    /// looked up once. The scan asks this for every object in the world every few seconds.
    /// </summary>
    internal static class PrefabsWith<T>
    {
        /// <summary>True when the prefab with that hash has a component of type <typeparamref name="T"/>.</summary>
        public static readonly Dictionary<int, bool> HasComponent = new Dictionary<int, bool>();
    }
}
