using System;
using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs raw food put on cooking stations, food that got cooked or burnt there, mead bases put into fermenters,
    /// and mead that is ready or tapped. A cooking station keeps the player who filled each slot, and a fermenter's
    /// player is found like a smelter's. A fermenter only works while a player is near, so mead counts as ready
    /// once it stayed ready for a while with a player's game running it.
    /// </summary>
    internal static class KitchenTracker
    {
        /// <summary>
        /// Seconds mead must stay ready, with a player's game running the fermenter, before it is logged. A fermenter
        /// without a roof starts over every 10 seconds once a player is near.
        /// </summary>
        private const float ReadySeconds = 15f;

        /// <summary>Game time each fermenter's mead was first seen ready, by object ID, or -1 once it is logged.</summary>
        private static readonly Dictionary<ZDOID, float> ReadySince = new Dictionary<ZDOID, float>();

        /// <summary>Item in each slot of each cooking station at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, string[]> Slots = new Dictionary<ZDOID, string[]>();

        /// <summary>Item hash each fermenter held at the last scan, or 0 when empty, by object ID.</summary>
        private static readonly Dictionary<ZDOID, int> Contents = new Dictionary<ZDOID, int>();

        /// <summary>
        /// Logs food put on [zdo], cooked or burnt there, or a mead base put into it, ready or tapped, since the last
        /// scan.
        /// </summary>
        public static void See(ZDO zdo)
        {
            if (Names.Has<CookingStation>(zdo))
            {
                SeeCookingStation(zdo);
            }
            else if (Names.Has<Fermenter>(zdo))
            {
                SeeFermenter(zdo);
            }
        }

        /// <summary>Forgets the station [uid] when the server destroys it.</summary>
        public static void Forget(ZDOID uid)
        {
            Slots.Remove(uid);
            Contents.Remove(uid);
            ReadySince.Remove(uid);
        }

        /// <summary>
        /// Logs a mead base put into fermenter [zdo], the mead tapped from it, or its mead turning ready, since the
        /// last scan. Mead already ready when the server starts is not logged again.
        /// </summary>
        private static void SeeFermenter(ZDO zdo)
        {
            int content = zdo.GetInt(ZDOVars.s_content);
            bool isKnown = Contents.TryGetValue(zdo.m_uid, out int before);
            Contents[zdo.m_uid] = content;
            Fermenter fermenter = Names.Prefab(zdo).GetComponent<Fermenter>();
            if (isKnown && before == 0 && content != 0)
            {
                GameEventLog.Write($"Fermenting: {Names.Item(content)} in {Names.PrefabName(zdo)} by {WorkTracker.Doer(zdo)}");
            }
            else if (isKnown && before != 0 && content == 0)
            {
                GameEventLog.Write($"Mead tapped: {MeadOf(fermenter, before)} from {Names.PrefabName(zdo)} by {WorkTracker.Doer(zdo)}");
            }
            if (content == 0)
            {
                ReadySince.Remove(zdo.m_uid);
                return;
            }
            long startTicks = zdo.GetLong(ZDOVars.s_startTime, 0L);
            bool isReady = startTicks != 0L && (ZNet.instance.GetTime() - new DateTime(startTicks)).TotalSeconds > fermenter.m_fermentationDuration;
            if (!isReady)
            {
                ReadySince.Remove(zdo.m_uid);
            }
            else if (!isKnown)
            {
                ReadySince[zdo.m_uid] = -1f;
            }
            else if (ZNet.instance.GetPeer(zdo.GetOwner()) != null)
            {
                if (!ReadySince.TryGetValue(zdo.m_uid, out float since))
                {
                    ReadySince[zdo.m_uid] = Time.time;
                }
                else if (since >= 0f && Time.time - since >= ReadySeconds)
                {
                    ReadySince[zdo.m_uid] = -1f;
                    GameEventLog.Write($"Mead ready: {MeadOf(fermenter, content)} in {Names.PrefabName(zdo)}");
                }
            }
        }

        /// <summary>
        /// Returns the mead [fermenter] makes from the mead base with item hash [content], and how many, for example
        /// <c>MeadHealthMinor x6</c>.
        /// </summary>
        private static string MeadOf(Fermenter fermenter, int content)
        {
            Fermenter.ItemConversion made = fermenter.m_conversion.Find(conversion => conversion.m_from.gameObject.name.GetStableHashCode() == content);
            return made == null ? $"{Names.Item(content)} x1" : $"{made.m_to.gameObject.name} x{made.m_producedItems}";
        }

        /// <summary>
        /// Logs each slot of cooking station [zdo] that now holds raw food it did not hold at the last scan, and each
        /// slot whose food turned cooked or burnt since then. A burnt slot holds coal, so the line names the raw food
        /// it was.
        /// </summary>
        private static void SeeCookingStation(ZDO zdo)
        {
            CookingStation station = Names.Prefab(zdo).GetComponent<CookingStation>();
            string[] now = new string[station.m_slots.Length];
            Slots.TryGetValue(zdo.m_uid, out string[] before);
            for (int slot = 0; slot < now.Length; slot++)
            {
                now[slot] = zdo.GetString("slot" + slot);
                string item = now[slot];
                if (before == null || item == before[slot] || item == string.Empty)
                {
                    continue;
                }
                string was = before[slot];
                string by = $"on {Names.PrefabName(zdo)} by {Names.Peer(zdo.GetLong(ZDOVars.s_playerID + slot, 0L))}";
                CookingStation.ItemConversion burnt = station.m_conversion.Find(
                    conversion => conversion.m_from.gameObject.name == was || conversion.m_to.gameObject.name == was);
                if (station.m_conversion.Exists(conversion => conversion.m_from.gameObject.name == item))
                {
                    GameEventLog.Write($"Cooking: {item} {by}");
                }
                else if (station.m_conversion.Exists(conversion => conversion.m_to.gameObject.name == item))
                {
                    GameEventLog.Write($"Cooked: {item} {by}");
                }
                else if (station.m_overCookedItem != null && station.m_overCookedItem.gameObject.name == item && burnt != null)
                {
                    GameEventLog.Write($"Burnt: {burnt.m_from.gameObject.name} {by}");
                }
            }
            Slots[zdo.m_uid] = now;
        }
    }
}
