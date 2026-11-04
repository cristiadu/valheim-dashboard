using System.IO;
using System.Text;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes how many of each item fit in one inventory slot to a file next to the server's log, once per server
    /// start, so the dashboard can count the slots a bag uses the way the game does.
    /// </summary>
    internal static class ItemStacks
    {
        /// <summary>Name of the file, next to the server's log.</summary>
        private const string FileName = "item-stacks.txt";

        /// <summary>True once the file was written since the server started.</summary>
        private static bool isWritten;

        /// <summary>
        /// Writes the file the first time the game's items are loaded: one line per item with its prefab and the
        /// most that fit in one slot, for example <c>Wood 50</c>.
        /// </summary>
        public static void WriteOnce()
        {
            string logPath = Application.consoleLogPath;
            if (isWritten || ObjectDB.instance == null || ObjectDB.instance.m_items.Count == 0 || string.IsNullOrEmpty(logPath))
            {
                return;
            }
            isWritten = true;
            StringBuilder text = new StringBuilder();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
                if (item != null)
                {
                    text.Append($"{prefab.name} {item.m_itemData.m_shared.m_maxStackSize}\n");
                }
            }
            string path = Path.Combine(Path.GetDirectoryName(logPath), FileName);
            File.WriteAllText(path, text.ToString());
            GameEventLog.Write($"Item stacks written: {path}");
        }
    }
}
