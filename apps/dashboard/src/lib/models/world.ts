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

/** Words for the share of its health a boss is down to, by the percent the plugin logs. */
export const HEALTH_SHARE_WORDS: Record<number, string> = { 75: 'three quarters', 50: 'half', 25: 'a quarter' };

/**
 * Places worth a Saga line when a player finds them, by the place prefab the plugin logs, as they read after `found`
 * or `went into`. Ruins, stone circles and other small places are left out.
 */
export const PLACE_NAMES: Record<string, string> = {
  Vendor_BlackForest: 'Haldor the trader',
  Hildir_camp: "Hildir's camp",
  BogWitch_Camp: "the Bog Witch's camp",
  Eikthyrnir: "Eikthyr's altar",
  GDKing: "the Elder's altar",
  Bonemass: "Bonemass's altar",
  Dragonqueen: "Moder's altar",
  GoblinKing: "Yagluth's altar",
  Mistlands_DvergrBossEntrance1: "the Queen's lair",
  FaderLocation: "Fader's fortress",
  Crypt2: 'a burial chamber',
  Crypt3: 'a burial chamber',
  Crypt4: 'a burial chamber',
  TrollCave02: 'a troll cave',
  SunkenCrypt4: 'a sunken crypt',
  MountainCave02: 'a frost cave',
  Mistlands_DvergrTownEntrance1: 'an infested mine',
  Mistlands_DvergrTownEntrance2: 'an infested mine',
  Hildir_crypt: 'the Smouldering Tombs',
  Hildir_cave: 'the Howling Cavern',
  Hildir_plainsfortress: 'the Sealed Tower',
  GoblinCamp2: 'a Fuling village',
  WoodVillage1: 'a Draugr village',
  DrakeNest01: 'a drake nest',
  FireHole: 'a surtling geyser',
  TarPit1: 'a tar pit',
  TarPit2: 'a tar pit',
  TarPit3: 'a tar pit',
  CharredFortress: 'a charred fortress',
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

/**
 * Names of the trees and rocks the plugin logs as cut down or mined out, by prefab. The game names file has none
 * for them, and the two birches share one name so a story line counts them together.
 */
export const NATURE_NAMES: Record<string, string> = {
  Beech1: 'Beech',
  Birch1: 'Birch',
  Birch2: 'Birch',
  Birch1_aut: 'Birch',
  Birch2_aut: 'Birch',
  Oak1: 'Oak',
  FirTree: 'Fir',
  Pinetree_01: 'Pine',
  SwampTree1: 'Ancient tree',
  rock4_copper: 'Copper deposit',
  MineRock_Tin: 'Tin deposit',
  MineRock_Obsidian: 'Obsidian deposit',
  MineRock_Meteorite: 'Meteorite',
  rock3_silver: 'Silver vein',
};
