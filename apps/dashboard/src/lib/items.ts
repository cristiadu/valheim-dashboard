import {
  CHEST_NAMES,
  CONTAINER_SIZES,
  DEFAULT_CONTAINER_SIZE,
  GEAR_NAMES,
  ITEM_NAMES,
  type MapChest,
  type StockRow,
  TREASURE_CHEST_PREFIX,
} from '#/lib/models';
import { capitalized, thingName } from '#/lib/story';

/**
 * Returns the name the game shows for the item the plugin logs as [prefab], which also picks its icon. For
 * example `Deer trophy` for `TrophyDeer`, or `Copper ore` for `CopperOre`, which only needs spaces.
 */
export const itemName = (prefab: string): string => GEAR_NAMES[prefab] ?? ITEM_NAMES[prefab] ?? capitalized(thingName(prefab));

/** Returns the name the game shows for the chest, cart or ship the plugin logs as [prefab], such as `Wood chest`. */
export const chestName = (prefab: string): string =>
  CHEST_NAMES[prefab] ?? (prefab.startsWith(TREASURE_CHEST_PREFIX) ? 'Treasure chest' : itemName(prefab));

/** Returns who built a chest by its [builder], for example `Built by Ragnar`, or `Came with the world`. */
export const builtByLabel = (builder: string | null): string =>
  builder === null ? 'Came with the world' : `Built by ${builder}`;

/** Returns the short form of [builtByLabel] that follows a chest's name in a list, for example `by Ragnar`. */
export const builtByShortLabel = (builder: string | null): string => (builder === null ? 'from the world' : `by ${builder}`);

/** Returns how many items [items] holds in all. */
export const itemTotal = (items: Record<string, number>): number =>
  Object.values(items).reduce((sum, amount) => sum + amount, 0);

/**
 * Returns the slot grid of the container [prefab] filling [used] slots: its columns and how many slots it has in
 * the game, and how many slots to draw, with rows added when the items need more slots than the game's grid has.
 */
export const containerGrid = (prefab: string, used: number): { columns: number; capacity: number; slots: number } => {
  const { columns, rows } = CONTAINER_SIZES[prefab] ?? DEFAULT_CONTAINER_SIZE;
  return { columns, capacity: rows * columns, slots: Math.max(rows, Math.ceil(used / columns)) * columns };
};

/** Returns [items] as one entry per item, most first, with the name the game shows. */
export const itemSlots = (items: Record<string, number>): { prefab: string; name: string; count: number }[] =>
  Object.entries(items)
    .map(([prefab, count]) => ({ prefab, name: itemName(prefab), count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));

/**
 * Returns [items] as the game's slots, most first: each item split into full stacks of the most one slot holds in
 * [stacks], then the rest. An item missing from [stacks] takes one slot.
 */
export const stackSlots = (
  items: Record<string, number>,
  stacks: Record<string, number>,
): { prefab: string; name: string; count: number }[] =>
  itemSlots(items).flatMap((slot) => {
    const stack = stacks[slot.prefab] ?? slot.count;
    const fullStacks = Math.floor(slot.count / stack);
    const rest = slot.count % stack;
    return [
      ...Array.from({ length: fullStacks }, () => ({ ...slot, count: stack })),
      ...(rest > 0 ? [{ ...slot, count: rest }] : []),
    ];
  });

/** Returns how many slots [items] fill in stacks of the most one slot holds in [stacks]. An unknown stack is one slot. */
export const slotsUsed = (items: Record<string, number>, stacks: Record<string, number>): number =>
  Object.entries(items).reduce((sum, [item, count]) => sum + Math.ceil(count / (stacks[item] ?? count)), 0);

/** Returns every item in [chests] once, with how many there are in all and in which chests, most first. */
export const stockOf = (chests: MapChest[]): StockRow[] => {
  const rows = new Map<string, StockRow>();
  for (const chest of chests) {
    for (const [prefab, count] of Object.entries(chest.record.items)) {
      const row = rows.get(prefab) ?? { prefab, name: itemName(prefab), count: 0, chests: [] };
      row.count += count;
      row.chests.push({ chest, count });
      rows.set(prefab, row);
    }
  }
  return [...rows.values()]
    .map((row) => ({ ...row, chests: row.chests.toSorted((first, second) => second.count - first.count) }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
};
