using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs the text of a sign put right against a chest as that chest's label. Each sign labels only the logged
    /// chest closest to it, and each chest takes the closest of those signs.
    /// </summary>
    internal static class ChestLabelTracker
    {
        /// <summary>Farthest a sign stands from a chest's spot and still labels it, in meters.</summary>
        private const float LabelRangeMeters = 1.25f;

        /// <summary>Rich text tags a sign can hold, such as <c>&lt;color=red&gt;</c>, which the label leaves out.</summary>
        private static readonly Regex RichTextTag = new Regex("<[^>]*>");

        /// <summary>Spot and text of each sign with text, by object ID.</summary>
        private static readonly Dictionary<ZDOID, (Vector3 Position, string Text)> Signs =
            new Dictionary<ZDOID, (Vector3 Position, string Text)>();

        /// <summary>Spot of each chest the plugin logged, by object ID. Carts and ships move, so they have none.</summary>
        private static readonly Dictionary<ZDOID, Vector3> Chests = new Dictionary<ZDOID, Vector3>();

        /// <summary>Label last logged for each chest, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string> Labels = new Dictionary<ZDOID, string>();

        /// <summary>True when a sign or chest came, went or changed since labels were last worked out.</summary>
        private static bool isChanged;

        /// <summary>Remembers the sign or logged chest [zdo] when it is new or its text changed.</summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<Sign>(zdo))
            {
                string text = RichTextTag.Replace(zdo.GetString(ZDOVars.s_text, string.Empty), string.Empty).Replace('\n', ' ').Trim();
                bool isKnown = Signs.TryGetValue(zdo.m_uid, out (Vector3 Position, string Text) sign);
                if (text == string.Empty)
                {
                    isChanged |= Signs.Remove(zdo.m_uid);
                }
                else if (!isKnown || sign.Text != text)
                {
                    Signs[zdo.m_uid] = (zdo.GetPosition(), text);
                    isChanged = true;
                }
            }
            else if (Names.Has<Container>(zdo) && ItemTracker.IsLogged(zdo.m_uid) && !Chests.ContainsKey(zdo.m_uid))
            {
                Chests[zdo.m_uid] = zdo.GetPosition();
                isChanged = true;
            }
        }

        /// <summary>Forgets the sign or chest [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            isChanged |= Signs.Remove(uid);
            Chests.Remove(uid);
            Labels.Remove(uid);
        }

        /// <summary>
        /// Logs each chest whose label changed since the last scan, for example
        /// <c>Chest label: 52731986:1203 Ores</c>, or <c>Chest unlabeled: 52731986:1203</c> when its sign is gone.
        /// </summary>
        public static void AfterScan()
        {
            if (!isChanged)
            {
                return;
            }
            isChanged = false;
            Dictionary<ZDOID, (float Distance, string Text)> closestSigns = new Dictionary<ZDOID, (float Distance, string Text)>();
            foreach ((Vector3 Position, string Text) sign in Signs.Values)
            {
                ZDOID closestChest = ZDOID.None;
                float closestDistance = LabelRangeMeters;
                foreach (KeyValuePair<ZDOID, Vector3> chest in Chests)
                {
                    float distance = Vector3.Distance(sign.Position, chest.Value);
                    if (distance <= closestDistance)
                    {
                        closestChest = chest.Key;
                        closestDistance = distance;
                    }
                }
                if (closestChest != ZDOID.None
                    && (!closestSigns.TryGetValue(closestChest, out (float Distance, string Text) other) || closestDistance < other.Distance))
                {
                    closestSigns[closestChest] = (closestDistance, sign.Text);
                }
            }
            foreach (ZDOID chest in Chests.Keys)
            {
                bool isLabeled = Labels.TryGetValue(chest, out string oldLabel);
                if (closestSigns.TryGetValue(chest, out (float Distance, string Text) sign))
                {
                    if (oldLabel != sign.Text)
                    {
                        Labels[chest] = sign.Text;
                        GameEventLog.Write($"Chest label: {chest} {sign.Text}");
                    }
                }
                else if (isLabeled)
                {
                    Labels.Remove(chest);
                    GameEventLog.Write($"Chest unlabeled: {chest}");
                }
            }
        }
    }
}
