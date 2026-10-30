using UnityEngine;

namespace ValheimDashboard.EventLog
{
    /// <summary>What one scan saw of a player character.</summary>
    internal readonly struct PlayerState
    {
        /// <summary>Height above which a player is inside a dungeon, in meters. Dungeons are built high in the sky.</summary>
        private const float DungeonHeightMeters = 3000f;

        /// <summary>Area name logged for the inside of a dungeon.</summary>
        public const string DungeonArea = "Dungeon";

        /// <summary>Where the character stands.</summary>
        public readonly Vector3 Position;

        /// <summary>Biome name, such as <c>BlackForest</c>, or <c>Dungeon</c> inside one.</summary>
        public readonly string Area;

        /// <summary>True while the character lies dead, until it respawns as a new object.</summary>
        public readonly bool IsDead;

        /// <summary>True while the character has PvP turned on.</summary>
        public readonly bool IsPvp;

        /// <summary>True while the character lies in a bed.</summary>
        public readonly bool IsInBed;

        /// <summary>Creates a state from its values.</summary>
        private PlayerState(Vector3 position, string area, bool isDead, bool isPvp, bool isInBed)
        {
            Position = position;
            Area = area;
            IsDead = isDead;
            IsPvp = isPvp;
            IsInBed = isInBed;
        }

        /// <summary>Reads the state of [player] from its object.</summary>
        public static PlayerState Of(ZDO player)
        {
            Vector3 position = player.GetPosition();
            string area = position.y > DungeonHeightMeters ? DungeonArea : WorldGenerator.instance.GetBiome(position).ToString();
            return new PlayerState(
                position,
                area,
                player.GetBool(ZDOVars.s_dead),
                player.GetBool(ZDOVars.s_pvp),
                player.GetBool(ZDOVars.s_inBed));
        }
    }
}
