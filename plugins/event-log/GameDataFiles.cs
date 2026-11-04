using System.IO;
using System.Text;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes game data the dashboard needs to count a bag's slots to files next to the server's log, once per
    /// server start: how many of each item fit in one slot, and what each buildable piece costs.
    /// </summary>
    internal static class GameDataFiles
    {
        /// <summary>Name of the item stacks file, next to the server's log.</summary>
        private const string ItemStacksFileName = "item-stacks.txt";

        /// <summary>Name of the piece costs file, next to the server's log.</summary>
        private const string PieceCostsFileName = "piece-costs.txt";

        /// <summary>True once the files were written since the server started.</summary>
        private static bool isWritten;

        /// <summary>
        /// Writes both files the first time the game's items and pieces are loaded. The item stacks file has one line
        /// per item with the most that fit in one slot, for example <c>Wood 50</c>. The piece costs file has one line
        /// per piece with what building it takes, for example <c>wood_floor Wood x2</c>.
        /// </summary>
        public static void WriteOnce()
        {
            string logPath = Application.consoleLogPath;
            if (isWritten || ObjectDB.instance == null || ObjectDB.instance.m_items.Count == 0 || ZNetScene.instance == null || string.IsNullOrEmpty(logPath))
            {
                return;
            }
            isWritten = true;
            StringBuilder stacks = new StringBuilder();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
                if (item != null)
                {
                    stacks.Append($"{prefab.name} {item.m_itemData.m_shared.m_maxStackSize}\n");
                }
            }
            StringBuilder costs = new StringBuilder();
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Piece piece = prefab == null ? null : prefab.GetComponent<Piece>();
                if (piece == null || piece.m_resources == null || piece.m_resources.Length == 0)
                {
                    continue;
                }
                StringBuilder line = new StringBuilder();
                foreach (Piece.Requirement requirement in piece.m_resources)
                {
                    if (requirement.m_resItem != null && requirement.m_amount > 0)
                    {
                        line.Append(line.Length == 0 ? string.Empty : ", ").Append($"{requirement.m_resItem.name} x{requirement.m_amount}");
                    }
                }
                if (line.Length > 0)
                {
                    costs.Append($"{prefab.name} {line}\n");
                }
            }
            Write(logPath, ItemStacksFileName, stacks, "Item stacks");
            Write(logPath, PieceCostsFileName, costs, "Piece costs");
        }

        /// <summary>Writes [text] to the file [fileName] next to the log at [logPath], and logs that [what] was written.</summary>
        private static void Write(string logPath, string fileName, StringBuilder text, string what)
        {
            string path = Path.Combine(Path.GetDirectoryName(logPath), fileName);
            File.WriteAllText(path, text.ToString());
            GameEventLog.Write($"{what} written: {path}");
        }
    }
}
