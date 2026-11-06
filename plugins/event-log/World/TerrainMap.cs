using System.IO;
using System.Text;
using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>
    /// Writes the world's terrain to a file next to the server's log, once per server start: one letter per map
    /// square for its biome, or water, read from the game's world generator, as the game's own map does.
    /// </summary>
    internal static class TerrainMap
    {
        /// <summary>Side of one map square, in meters. Matches the dashboard's explored squares.</summary>
        private const int SquareMeters = 32;

        /// <summary>Distance from the world's center to its outer edge, in meters.</summary>
        private const float WorldRadiusMeters = WorldGenerator.waterEdge;

        /// <summary>Letter for a square under water, whatever its biome.</summary>
        private const char WaterLetter = '~';

        /// <summary>Letter for a square past the world's edge.</summary>
        private const char OutsideLetter = '.';

        /// <summary>True once the file was written since the server started.</summary>
        private static bool isWritten;

        /// <summary>
        /// Writes the terrain file the first time the world is ready, for example <c>terrain-Cotil.txt</c>. The
        /// first line gives the square size and the number of the westmost and southmost square; each line after it
        /// is one row of squares from west to east, northmost row first.
        /// </summary>
        public static void WriteOnce()
        {
            string logPath = Application.consoleLogPath;
            if (isWritten || WorldGenerator.instance == null || ZoneSystem.instance == null || string.IsNullOrEmpty(logPath))
            {
                return;
            }
            isWritten = true;
            int first = -Mathf.CeilToInt(WorldRadiusMeters / SquareMeters);
            int last = -first - 1;
            StringBuilder text = new StringBuilder();
            text.Append($"squareMeters {SquareMeters} first {first}\n");
            for (int row = last; row >= first; row--)
            {
                for (int column = first; column <= last; column++)
                {
                    text.Append(Letter((column + 0.5f) * SquareMeters, (row + 0.5f) * SquareMeters));
                }
                text.Append('\n');
            }
            string path = Path.Combine(Path.GetDirectoryName(logPath), $"terrain-{ZNet.instance.GetWorldName()}.txt");
            File.WriteAllText(path, text.ToString());
            GameEventLog.Write($"Terrain written: {path}");
        }

        /// <summary>Returns the letter for the spot [x] meters east and [z] meters north of the world's center.</summary>
        private static char Letter(float x, float z)
        {
            if (x * x + z * z > WorldRadiusMeters * WorldRadiusMeters)
            {
                return OutsideLetter;
            }
            Heightmap.Biome biome = WorldGenerator.instance.GetBiome(x, z);
            float height = WorldGenerator.instance.GetBiomeHeight(biome, x, z, out Color _);
            if (biome == Heightmap.Biome.Ocean || height < ZoneSystem.instance.m_waterLevel)
            {
                return WaterLetter;
            }
            switch (biome)
            {
                case Heightmap.Biome.Meadows: return 'M';
                case Heightmap.Biome.BlackForest: return 'B';
                case Heightmap.Biome.Swamp: return 'S';
                case Heightmap.Biome.Mountain: return 'O';
                case Heightmap.Biome.Plains: return 'P';
                case Heightmap.Biome.Mistlands: return 'I';
                case Heightmap.Biome.AshLands: return 'A';
                case Heightmap.Biome.DeepNorth: return 'N';
                default: return OutsideLetter;
            }
        }
    }
}
