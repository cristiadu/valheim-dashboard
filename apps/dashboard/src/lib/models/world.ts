/** Boss names as the game shows them, by the prefab a summon logs and by the key a defeat sets. */
export const BOSS_NAMES: Record<string, string> = {
  Eikthyr: 'Eikthyr',
  gd_king: 'The Elder',
  Bonemass: 'Bonemass',
  Dragon: 'Moder',
  GoblinKing: 'Yagluth',
  SeekerQueen: 'The Queen',
  Fader: 'Fader',
  defeated_eikthyr: 'Eikthyr',
  defeated_gdking: 'The Elder',
  defeated_bonemass: 'Bonemass',
  defeated_dragon: 'Moder',
  defeated_goblinking: 'Yagluth',
  defeated_queen: 'The Queen',
  defeated_fader: 'Fader',
};

/** Boss names as the game shows them, by the boss altar place a vegvisir marks. */
export const BOSS_ALTAR_NAMES: Record<string, string> = {
  Eikthyrnir: 'Eikthyr',
  GDKing: 'The Elder',
  Bonemass: 'Bonemass',
  Dragonqueen: 'Moder',
  GoblinKing: 'Yagluth',
};

/** Start of the global key a boss defeat sets, for example `defeated_eikthyr`. */
export const DEFEATED_KEY_PREFIX = 'defeated_';

/** Area names for a sentence, by the biome name the plugin logs. */
export const AREA_NAMES: Record<string, string> = {
  Meadows: 'the Meadows',
  BlackForest: 'the Black Forest',
  Swamp: 'the Swamp',
  Mountain: 'the Mountains',
  Plains: 'the Plains',
  Mistlands: 'the Mistlands',
  AshLands: 'the Ashlands',
  DeepNorth: 'the Deep North',
  Ocean: 'the ocean',
  Dungeon: 'a dungeon',
};

/** Bosses in the order players usually meet them, by the name the game shows. */
export const BOSS_ORDER = ['Eikthyr', 'The Elder', 'Bonemass', 'Moder', 'Yagluth', 'The Queen', 'Fader'] as const;

/** Area name the plugin logs inside a dungeon. Every trip into one is news. */
export const DUNGEON_AREA = 'Dungeon';
