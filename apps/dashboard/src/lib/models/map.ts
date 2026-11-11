import type { ChestMarkKind, ChestRecord } from '#/lib/models/chests';

/** Map colors and names of each terrain letter the plugin writes. */
export const TERRAIN_STYLES: Record<string, { color: string; name: string }> = {
  M: { color: '#5f7a3a', name: 'Meadows' },
  B: { color: '#2f4a2c', name: 'Black Forest' },
  S: { color: '#5a4a32', name: 'Swamp' },
  O: { color: '#a7a9b0', name: 'Mountains' },
  P: { color: '#b39a4e', name: 'Plains' },
  I: { color: '#4a4258', name: 'Mistlands' },
  A: { color: '#7a3424', name: 'Ashlands' },
  N: { color: '#cfd9e0', name: 'Deep North' },
  '~': { color: '#2b5268', name: 'Water' },
};

/** Size of the player color mark inside each explored square, in meters. */
export const MAP_TRAIL_METERS = 12;

/** Color of an explored square whose terrain is not known yet. */
export const UNKNOWN_TERRAIN_COLOR = 'var(--line)';

/** A spot on the map, in meters east (`x`) and north (`z`) of the world's center, and when it was logged. */
export type MapPoint = {
  /** Meters east of the world's center. */
  x: number;
  /** Meters north of the world's center. */
  z: number;
  /** When it was logged, as a UTC ISO string. */
  timeUtc: string;
};

/** Everything a character carried when they died, as their tombstone held it, and where they died. */
export type DeathItems = MapPoint & {
  /** How many of each item, by item name. */
  items: Record<string, number>;
};

/** Side of one map square, in meters. A position marks the whole square it falls in as explored. */
export const MAP_SQUARE_METERS = 32;

/** Space kept around everything the map shows, in meters. */
export const MAP_MARGIN_METERS = 64;

/** Size of a chest mark on the map when it shows all the explored land, in screen pixels. Marks grow as the map zooms in. */
export const MAP_CHEST_SMALL_PX = 12;

/** Smallest size of a chest mark on the map, when it shows much more of the world than the explored land, in screen pixels. */
export const MAP_CHEST_MIN_PX = 6;

/** Biggest size of a chest mark on the map, once zoomed in, in screen pixels. */
export const MAP_CHEST_PX = 24;

/** Widest a chest's hover box gets with its margins, in screen pixels, so it can be kept inside the map. */
export const MAP_CHEST_HOVER_PX = 246;

/** Distance between chests placed side by side on the map, in chest marks, so a mark grown on hover still shows its neighbors. */
export const MAP_CHEST_STEP = 1.15;

/** How far a chest mark sits from its real spot before a line joins them, in chest marks. */
export const MAP_CHEST_MOVED_STEP = 0.5;

/** Size of an online player mark on the map, in screen pixels. */
export const MAP_PLAYER_PX = 16;

/** Size of a Leviathan mark on the map, in screen pixels. */
export const MAP_LEVIATHAN_PX = 20;

/** Color of a Leviathan mark on the map. */
export const LEVIATHAN_COLOR = 'var(--frost)';

/** Size of a death mark on the map, in screen pixels. */
export const MAP_DEATH_PX = 22;

/** Distance from the world's center to the edge of the world, where its ocean ends, in meters. */
export const WORLD_EDGE_METERS = 10_500;

/** Part of the map the whole world fits in, with a margin, in map units. */
export const MAP_WORLD_BOX: MapBox = {
  x: -WORLD_EDGE_METERS - MAP_MARGIN_METERS,
  y: -WORLD_EDGE_METERS - MAP_MARGIN_METERS,
  width: 2 * (WORLD_EDGE_METERS + MAP_MARGIN_METERS),
  height: 2 * (WORLD_EDGE_METERS + MAP_MARGIN_METERS),
};

/** Narrowest part of the map the zoom can show, in meters. */
export const MAP_MIN_VIEW_METERS = 128;

/** How much one zoom step or wheel notch zooms the map in or out. */
export const MAP_ZOOM_STEP = 1.5;

/** How far a pointer must move before a press on the map counts as a drag and not a tap, in pixels. */
export const MAP_DRAG_PX = 4;

/** Length the map's scale bar aims for, in screen pixels, before it is rounded to a plain distance. */
export const MAP_SCALE_BAR_PX = 120;

/** Plain distances the scale bar can show, in meters. */
export const MAP_SCALE_STEPS_METERS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/** Meters in one kilometer. */
export const METERS_PER_KM = 1000;

/** What the map draws, in map units: meters east as `x` and meters south as `y`, so north is up. */
export type MapView = {
  /** Part of the map that fits all explored land and marks, with a margin. */
  box: MapBox;
  /** Explored squares, once each, in their terrain color, or the line color before the terrain is known. */
  land: { key: string; x: number; y: number; color: string }[];
  /** A small mark in the middle of each square a character walked, in that character's player color. */
  trails: { key: string; x: number; y: number; color: string }[];
  /** Chests, carts and ships, by their ID. */
  chests: { id: string; x: number; y: number; kind: ChestMarkKind; record: ChestRecord }[];
  /** Where each online player stands and where each character last died. */
  marks: { key: string; kind: 'player' | 'death' | 'leviathan'; label: string; x: number; y: number; color: string }[];
};

/** A chest, cart or ship on the map, by its ID, with `y` meters south so north is up. */
export type MapChest = MapView['chests'][number];

/** A part of the map, in map units: its top left corner, width and height. */
export type MapBox = { x: number; y: number; width: number; height: number };

/** Where one chest's mark sits on the map, by the chest's ID. */
export type MapChestSpot = { id: string; x: number; y: number };

/**
 * Chest under the pointer or focused, by its ID, and where its hover box sits over the map in pixels: [left] from
 * the map's left edge, or from its right edge when the box opens to the left of the mark.
 */
export type ChestHoverSpot = { id: string; left: number; top: number; isLeftOfMark: boolean };

/** Chest drawings in the map legend, with what each stands for. */
export const MAP_CHEST_LEGEND: [ChestMarkKind, string][] = [
  ['chest', 'Chest'],
  ['treasure', 'Chest the world came with'],
  ['cart', 'Cart'],
  ['ship', 'Ship'],
];

/** Square meters in one square kilometer, for the land a player explored. */
export const SQUARE_METERS_PER_KM2 = 1_000_000;

/** Map page link part that opens one chest, followed by its ID, for example `?chest=1:42`. */
export const CHEST_QUERY = 'chest';
