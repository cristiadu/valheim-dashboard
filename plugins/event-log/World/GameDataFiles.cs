using System.IO;
using System.Text;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes game data the dashboard needs to guess a bag to files next to the server's log, once per server
    /// start: how many of each item fit in one slot, what each buildable piece costs, what crafting takes, which
    /// items are food, and what each fire burns. It also writes the game's English names, so the dashboard shows
    /// things the way the game does.
    /// </summary>
    internal static class GameDataFiles
    {
        /// <summary>Name of the item stacks file, next to the server's log.</summary>
        private const string ItemStacksFileName = "item-stacks.txt";

        /// <summary>Name of the piece costs file, next to the server's log.</summary>
        private const string PieceCostsFileName = "piece-costs.txt";

        /// <summary>Name of the craft costs file, next to the server's log.</summary>
        private const string CraftCostsFileName = "craft-costs.txt";

        /// <summary>Name of the foods file, next to the server's log.</summary>
        private const string FoodsFileName = "foods.txt";

        /// <summary>Name of the fire fuels file, next to the server's log.</summary>
        private const string FireFuelsFileName = "fire-fuels.txt";

        /// <summary>Name of the game names file, next to the server's log.</summary>
        private const string GameNamesFileName = "game-names.txt";

        /// <summary>True once the files were written since the server started.</summary>
        private static bool isWritten;

        /// <summary>
        /// Writes the files the first time the game's items and pieces are loaded. The item stacks file has one line
        /// per item with the most that fit in one slot, for example <c>Wood 50</c>. The piece costs file has one line
        /// per piece with what building it takes, for example <c>wood_floor Wood x2</c>. The craft costs file has
        /// one line per item and level with how many one craft makes and what it takes, for example
        /// <c>ArrowWood 1 20 Wood x8</c>, or <c>SwordBronze 2 1 Bronze x4, LeatherScraps x1</c> for an upgrade.
        /// The foods file has one food per line, for example <c>CookedMeat</c>. The fire fuels file has one line per
        /// fire with the item it burns, for example <c>piece_groundtorch_wood Resin</c>. The game names file has one
        /// line per item, piece, creature and raid with the name the game shows, for example <c>AtgeirIron Iron atgeir</c>
        /// or <c>army_theelder The ground is shaking</c>.
        /// </summary>
        public static void WriteOnce()
        {
            string logPath = Application.consoleLogPath;
            if (isWritten || ObjectDB.instance == null || ObjectDB.instance.m_items.Count == 0 || ZNetScene.instance == null || RandEventSystem.instance == null || Localization.instance == null || string.IsNullOrEmpty(logPath))
            {
                return;
            }
            isWritten = true;
            StringBuilder stacks = new StringBuilder();
            StringBuilder foods = new StringBuilder();
            StringBuilder names = new StringBuilder();
            foreach (GameObject prefab in ObjectDB.instance.m_items)
            {
                ItemDrop item = prefab == null ? null : prefab.GetComponent<ItemDrop>();
                if (item == null)
                {
                    continue;
                }
                ItemDrop.ItemData.SharedData shared = item.m_itemData.m_shared;
                stacks.Append($"{prefab.name} {shared.m_maxStackSize}\n");
                AppendName(names, prefab.name, shared.m_name);
                if (shared.m_food > 0f || shared.m_foodStamina > 0f || shared.m_foodEitr > 0f)
                {
                    foods.Append($"{prefab.name}\n");
                }
            }
            StringBuilder costs = new StringBuilder();
            StringBuilder fuels = new StringBuilder();
            foreach (GameObject prefab in ZNetScene.instance.m_prefabs)
            {
                Fireplace fire = prefab == null ? null : prefab.GetComponent<Fireplace>();
                if (fire != null && fire.m_fuelItem != null)
                {
                    fuels.Append($"{prefab.name} {fire.m_fuelItem.name}\n");
                }
                Character creature = prefab == null ? null : prefab.GetComponent<Character>();
                if (creature != null && !(creature is Player))
                {
                    AppendName(names, prefab.name, creature.m_name);
                }
                Piece piece = prefab == null ? null : prefab.GetComponent<Piece>();
                if (piece != null)
                {
                    AppendName(names, prefab.name, piece.m_name);
                }
                if (piece == null)
                {
                    continue;
                }
                string cost = CostOf(piece.m_resources, 1);
                if (cost.Length > 0)
                {
                    costs.Append($"{prefab.name} {cost}\n");
                }
            }
            StringBuilder crafts = new StringBuilder();
            foreach (Recipe recipe in ObjectDB.instance.m_recipes)
            {
                if (recipe == null || recipe.m_item == null || !recipe.m_enabled || recipe.m_requireOnlyOneIngredient)
                {
                    continue;
                }
                for (int level = recipe.m_noCraftOnlyUpgrade ? 2 : 1; level <= recipe.m_item.m_itemData.m_shared.m_maxQuality; level++)
                {
                    string cost = CostOf(recipe.m_resources, level);
                    if (cost.Length > 0)
                    {
                        crafts.Append($"{recipe.m_item.name} {level} {(level == 1 ? recipe.m_amount : 1)} {cost}\n");
                    }
                }
            }
            Write(logPath, ItemStacksFileName, stacks, "Item stacks");
            Write(logPath, PieceCostsFileName, costs, "Piece costs");
            Write(logPath, CraftCostsFileName, crafts, "Craft costs");
            Write(logPath, FoodsFileName, foods, "Foods");
            foreach (RandomEvent raid in RandEventSystem.instance.m_events)
            {
                AppendName(names, raid.m_name, raid.m_startMessage);
            }
            Write(logPath, FireFuelsFileName, fuels, "Fire fuels");
            Write(logPath, GameNamesFileName, names, "Game names");
        }

        /// <summary>Returns what [requirements] take at item level [level], for example <c>Wood x2, Stone x3</c>, or nothing.</summary>
        private static string CostOf(Piece.Requirement[] requirements, int level)
        {
            StringBuilder cost = new StringBuilder();
            foreach (Piece.Requirement requirement in requirements ?? new Piece.Requirement[0])
            {
                int amount = requirement.GetAmount(level);
                if (requirement.m_resItem != null && amount > 0)
                {
                    cost.Append(cost.Length == 0 ? string.Empty : ", ").Append($"{requirement.m_resItem.name} x{amount}");
                }
            }
            return cost.ToString();
        }

        /// <summary>
        /// Adds a line for [id] with the English text of the game's [token], such as <c>$item_atgeir_iron</c>, unless
        /// the game has no text for it.
        /// </summary>
        private static void AppendName(StringBuilder names, string id, string token)
        {
            string name = string.IsNullOrEmpty(token) ? string.Empty : Localization.instance.Localize(token).Trim();
            if (name.Length > 0 && !name.StartsWith("$") && !name.StartsWith("[") && !name.Contains("\n"))
            {
                names.Append($"{id} {name}\n");
            }
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
