import type { MapChest, MapPoint } from '#/lib/models/map';

/** A chest, cart or ship, where it stands and what it holds. */
export type ChestRecord = MapPoint & {
  /** Prefab name, for example `piece_chest_wood` or `Cart`. */
  chest: string;
  /** Character or Steam name of who built it, or null when the plugin did not know. */
  builder: string | null;
  /** How many of each item it holds, by item name, for example `{ Wood: 20 }`. */
  items: Record<string, number>;
  /** Text of the sign put right against it, for example `Ores`, when it has one. */
  label?: string;
};

/** Kinds of chest marks on the map, each with its own drawing. */
export type ChestMarkKind = 'chest' | 'treasure' | 'cart' | 'ship';

/** Mark kind of each chest prefab that does not use the plain chest drawing. */
export const CHEST_MARK_KINDS: Record<string, ChestMarkKind> = {
  Cart: 'cart',
  Raft: 'ship',
  Karve: 'ship',
  VikingShip: 'ship',
  shipwreck_karve_chest: 'treasure',
};

/**
 * Names the game shows for chests, carts and ships, by the prefab the plugin logs. Chests the world came with,
 * such as `TreasureChest_meadows`, start with [TREASURE_CHEST_PREFIX].
 */
export const CHEST_NAMES: Record<string, string> = {
  piece_chest_wood: 'Wood chest',
  piece_chest: 'Reinforced chest',
  piece_chest_private: 'Personal chest',
  piece_chest_blackmetal: 'Black metal chest',
  piece_chest_barrel: 'Barrel',
  Cart: 'Cart',
  Raft: 'Raft',
  Karve: 'Karve',
  VikingShip: 'Longship',
  shipwreck_karve_chest: 'Shipwreck chest',
};

/** Slots in one row and rows of slots of a container, as its window shows them in the game. */
export type ContainerSize = { columns: number; rows: number };

/** Slot grid of each container the game builds, by prefab. */
export const CONTAINER_SIZES: Record<string, ContainerSize> = {
  piece_chest_wood: { columns: 5, rows: 2 },
  piece_chest: { columns: 6, rows: 4 },
  piece_chest_private: { columns: 3, rows: 2 },
  piece_chest_blackmetal: { columns: 8, rows: 4 },
  Cart: { columns: 6, rows: 3 },
  Karve: { columns: 2, rows: 2 },
  VikingShip: { columns: 6, rows: 3 },
  Player: { columns: 8, rows: 4 },
};

/** Slot grid of a container missing above. Rows are added whenever the items need more slots. */
export const DEFAULT_CONTAINER_SIZE: ContainerSize = { columns: 5, rows: 2 };

/** Start of the prefab of every chest the world came with, for example `TreasureChest_meadows`. */
export const TREASURE_CHEST_PREFIX = 'TreasureChest';

/** Size of an item icon in a chest's slots, in pixels. */
export const CHEST_SLOT_ICON_PX = 44;

/** One item across every chest on the map: how many there are in all, and in which chests. */
export type StockRow = {
  /** Prefab the plugin logs, for example `CopperOre`. */
  prefab: string;
  /** Name the game shows, for example `Copper ore`. */
  name: string;
  /** How many in all the chests together. */
  count: number;
  /** Chests that hold some, most first. */
  chests: { chest: MapChest; count: number }[];
};

/** Prefab of the player, whose bag grid is in [CONTAINER_SIZES]. */
export const PLAYER_PREFAB = 'Player';
