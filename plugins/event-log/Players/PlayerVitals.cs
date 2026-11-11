using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes the health, max health, stamina and eitr of each player online to a file next to the server's log,
    /// whenever one of them changes, so the dashboard can show how each Viking is doing now.
    /// </summary>
    internal static class PlayerVitals
    {
        /// <summary>Name of the file, next to the server's log.</summary>
        private const string FileName = "player-vitals.txt";

        /// <summary>Text last written to the file, so an unchanged scan writes nothing.</summary>
        private static string writtenText;

        /// <summary>
        /// Writes one line per living player character in [players], with whole numbers separated by tabs, for example
        /// <c>Ragnar	45	110	60	0</c> for 45 of 110 health, 60 stamina and no eitr. The game sends no max stamina
        /// or max eitr to the server.
        /// </summary>
        public static void Write(List<ZDO> players)
        {
            string logPath = Application.consoleLogPath;
            if (string.IsNullOrEmpty(logPath))
            {
                return;
            }
            StringBuilder text = new StringBuilder();
            foreach (ZDO player in players)
            {
                string name = player.GetString(ZDOVars.s_playerName, string.Empty);
                if (name == string.Empty || player.GetBool(ZDOVars.s_dead))
                {
                    continue;
                }
                text.Append(name)
                    .Append('\t').Append(Mathf.CeilToInt(player.GetFloat(ZDOVars.s_health)))
                    .Append('\t').Append(Mathf.RoundToInt(player.GetFloat(ZDOVars.s_maxHealth)))
                    .Append('\t').Append(Mathf.FloorToInt(player.GetFloat(ZDOVars.s_stamina)))
                    .Append('\t').Append(Mathf.FloorToInt(player.GetFloat(ZDOVars.s_eitr)))
                    .Append('\n');
            }
            string newText = text.ToString();
            if (newText == writtenText)
            {
                return;
            }
            writtenText = newText;
            File.WriteAllText(Path.Combine(Path.GetDirectoryName(logPath), FileName), newText);
        }
    }
}
