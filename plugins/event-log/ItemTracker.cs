using System.Collections.Generic;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Logs items players pick up, put in or take out of chests, and harvest, and tombstones they empty. A
    /// player's game takes over an item, chest or tombstone before changing it, so its owner is the player who
    /// did it. A player harvesting a plant another game owns asks that game through the server, so the server
    /// sees who asked.
    /// </summary>
    internal static class ItemTracker
    {
        /// <summary>Hash of the call a player sends to harvest a plant another player's game owns.</summary>
        private static readonly int PickHash = "RPC_Pick".GetStableHashCode();

        /// <summary>Farthest a player stands from an item they pick up, in meters. Items left alone despawn instead.</summary>
        private const float PickupRangeMeters = 10f;

        /// <summary>Width and height of the inventory chest contents are read into, larger than any chest.</summary>
        private const int ChestReadSize = 16;

        /// <summary>Contents of each chest at the last scan, by object ID, kept with the data they came from.</summary>
        private static readonly Dictionary<ZDOID, (byte[] Data, Dictionary<string, int> Counts)> ChestContents =
            new Dictionary<ZDOID, (byte[] Data, Dictionary<string, int> Counts)>();

        /// <summary>Tombstones that appeared since the server started, until their contents are logged.</summary>
        private static readonly HashSet<ZDOID> NewTombstones = new HashSet<ZDOID>();

        /// <summary>Whether each plant was harvested at the last scan, by object ID.</summary>
        private static readonly Dictionary<ZDOID, bool> PickedStates = new Dictionary<ZDOID, bool>();

        /// <summary>Player who asked to harvest each plant, by object ID, until the harvest is logged.</summary>
        private static readonly Dictionary<ZDOID, string> PickedBy = new Dictionary<ZDOID, string>();

        /// <summary>Remembers who asked to harvest a plant when [data] is such a request.</summary>
        public static void Read(ZRoutedRpc.RoutedRPCData data)
        {
            if (data.m_methodHash == PickHash)
            {
                PickedBy[data.m_targetZDO] = Names.Peer(data.m_senderPeerID);
            }
        }

        /// <summary>
        /// Logs a chest whose contents changed, a plant harvested, or what a new tombstone holds, since the last
        /// scan. [isNew] is true when the object appeared since the last scan.
        /// </summary>
        public static void See(ZDO zdo, bool isNew)
        {
            if (Names.Has<TombStone>(zdo))
            {
                SeeTombstone(zdo, isNew);
            }
            else if (Names.HasInParts<Container>(zdo))
            {
                SeeChest(zdo);
            }
            else if (Names.Has<Pickable>(zdo))
            {
                bool isPicked = zdo.GetBool(ZDOVars.s_picked);
                if (PickedStates.TryGetValue(zdo.m_uid, out bool wasPicked) && isPicked && !wasPicked)
                {
                    LogHarvest(zdo);
                }
                PickedStates[zdo.m_uid] = isPicked;
            }
        }

        /// <summary>
        /// Logs an item picked up, a plant harvested away, a tombstone emptied or a chest removed, as the server
        /// destroys it.
        /// </summary>
        public static void Destroyed(ZDO zdo)
        {
            if (ChestContents.Remove(zdo.m_uid))
            {
                GameEventLog.Write($"Chest removed: {zdo.m_uid}");
            }
            PickedStates.Remove(zdo.m_uid);
            NewTombstones.Remove(zdo.m_uid);
            if (Names.Has<ItemDrop>(zdo))
            {
                LogPickup(zdo);
            }
            else if (Names.Has<Pickable>(zdo))
            {
                LogHarvest(zdo);
            }
            else if (Names.Has<TombStone>(zdo))
            {
                GameEventLog.Write($"Tombstone emptied: {zdo.GetString(ZDOVars.s_ownerName, Names.UnknownPlayer)} by {Names.Peer(zdo.GetOwner())}");
            }
            PickedBy.Remove(zdo.m_uid);
        }

        /// <summary>
        /// Logs what [chest] holds and where it stands when the scan first sees it and whenever its contents change,
        /// and each item that went into or out of it since the last scan. A chest, cart or ship that never held
        /// anything has no contents yet.
        /// </summary>
        private static void SeeChest(ZDO chest)
        {
            byte[] data = chest.GetByteArray(ZDOVars.s_items);
            if (data == null)
            {
                return;
            }
            bool isKnown = ChestContents.TryGetValue(chest.m_uid, out (byte[] Data, Dictionary<string, int> Counts) before);
            if (isKnown && before.Data == data)
            {
                return;
            }
            Dictionary<string, int> counts = CountItems(data);
            ChestContents[chest.m_uid] = (data, counts);
            LogContents(chest, counts);
            if (!isKnown)
            {
                return;
            }
            string player = Names.Peer(chest.GetOwner());
            string chestName = Names.PrefabName(chest);
            foreach (KeyValuePair<string, int> item in counts)
            {
                before.Counts.TryGetValue(item.Key, out int oldCount);
                if (item.Value > oldCount)
                {
                    GameEventLog.Write($"Stored: {item.Key} x{item.Value - oldCount} in {chestName} by {player}");
                }
            }
            foreach (KeyValuePair<string, int> item in before.Counts)
            {
                counts.TryGetValue(item.Key, out int newCount);
                if (item.Value > newCount)
                {
                    GameEventLog.Write($"Taken: {item.Key} x{item.Value - newCount} from {chestName} by {player}");
                }
            }
        }

        /// <summary>
        /// Logs everything a tombstone that appeared since the server started holds, once the dying player's game
        /// has filled it. That is the player's whole inventory when they died.
        /// </summary>
        private static void SeeTombstone(ZDO tombstone, bool isNew)
        {
            if (isNew)
            {
                NewTombstones.Add(tombstone.m_uid);
            }
            byte[] data = tombstone.GetByteArray(ZDOVars.s_items);
            if (data == null || !NewTombstones.Remove(tombstone.m_uid))
            {
                return;
            }
            string owner = tombstone.GetString(ZDOVars.s_ownerName, Names.UnknownPlayer);
            GameEventLog.Write($"Tombstone: {owner} at {Names.MapPosition(tombstone.GetPosition())} holds {ItemList(CountItems(data))}");
        }

        /// <summary>Returns [counts] as a line, for example <c>Wood x20, Stone x3</c>, or <c>nothing</c>.</summary>
        private static string ItemList(Dictionary<string, int> counts)
        {
            List<string> items = new List<string>();
            foreach (KeyValuePair<string, int> item in counts)
            {
                items.Add($"{item.Key} x{item.Value}");
            }
            return items.Count == 0 ? "nothing" : string.Join(", ", items);
        }

        /// <summary>Logs every item [chest] holds, with where it stands and who built it.</summary>
        private static void LogContents(ZDO chest, Dictionary<string, int> counts)
        {
            string holds = ItemList(counts);
            GameEventLog.Write($"Chest: {chest.m_uid} {Names.PrefabName(chest)} at {Names.MapPosition(chest.GetPosition())} built by {Names.Builder(chest)} holds {holds}");
        }

        /// <summary>Returns how many of each item the chest contents in [data] hold, by item name.</summary>
        private static Dictionary<string, int> CountItems(byte[] data)
        {
            Inventory inventory = new Inventory(string.Empty, null, ChestReadSize, ChestReadSize);
            inventory.Load(new ZPackage(data));
            Dictionary<string, int> counts = new Dictionary<string, int>();
            foreach (ItemDrop.ItemData item in inventory.GetAllItems())
            {
                string name = item.m_dropPrefab == null ? item.m_shared.m_name : item.m_dropPrefab.name;
                counts.TryGetValue(name, out int count);
                counts[name] = count + item.m_stack;
            }
            return counts;
        }

        /// <summary>
        /// Logs [item] as picked up by the player whose game owns it, if that player stands next to it. An item
        /// next to a creature that eats food off the ground is skipped, since the creature may have eaten it. The
        /// game marks an item the first time it reaches anyone's inventory, so an item that was already carried,
        /// such as one a player dropped, is logged as picked up again.
        /// </summary>
        private static void LogPickup(ZDO item)
        {
            ZNetPeer peer = ZNet.instance.GetPeer(item.GetOwner());
            bool isPlayerNear = peer != null && Vector3.Distance(peer.GetRefPos(), item.GetPosition()) <= PickupRangeMeters;
            if (!isPlayerNear || CreatureTracker.IsEaterNear(item.GetPosition()))
            {
                return;
            }
            ItemDrop.ItemData itemData = new ItemDrop.ItemData();
            ItemDrop.LoadFromZDO(itemData, item);
            string pickedUp = itemData.m_pickedUp ? "Picked up again" : "Picked up";
            GameEventLog.Write($"{pickedUp}: {Names.PrefabName(item)} x{itemData.m_stack} by {peer.m_playerName}");
        }

        /// <summary>Logs [plant] as harvested by the player who asked for it, or else by the player whose game owns it.</summary>
        private static void LogHarvest(ZDO plant)
        {
            if (!PickedBy.TryGetValue(plant.m_uid, out string player))
            {
                player = Names.Peer(plant.GetOwner());
            }
            PickedBy.Remove(plant.m_uid);
            GameEventLog.Write($"Harvested: {Names.PrefabName(plant)} by {player}");
        }
    }
}
