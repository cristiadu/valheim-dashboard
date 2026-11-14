import {
  CHEST_NAMES,
  type ChestRecord,
  CONTAINER_SIZES,
  DEFAULT_CONTAINER_SIZE,
  type StockRow,
  TREASURE_CHEST_PREFIX,
} from '#/lib/models/chests';
import { GEAR_NAMES } from '#/lib/models/gear';
import { ITEM_NAMES, type ItemSlot } from '#/lib/models/items';
import type { MapChest } from '#/lib/models/map';
import { NATURE_THINGS } from '#/lib/models/world';
import { capitalized, gameName, thingName } from '#/lib/text';

/**
 * Returns the name the game shows for the item the plugin logs as [prefab], which also picks its icon. For
 * example `Deer trophy` for `TrophyDeer`, `Iron atgeir` for `AtgeirIron` from the game names file, or `Copper ore`
 * for `CopperOre`, which only needs spaces. A cut tree or mined rock gets its plain name, such as `Beech` for `Beech1`.
 */
export const itemName = (prefab: string): string =>
  GEAR_NAMES[prefab] ?? ITEM_NAMES[prefab] ?? gameName(prefab) ?? NATURE_THINGS[prefab]?.name ?? capitalized(thingName(prefab));

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

/** Returns what the page calls [record]: the text of the sign on it, such as `Ores`, or else its name, such as `Wood chest`. */
export const chestTitle = (record: ChestRecord): string => record.label ?? chestName(record.chest);

/**
 * Returns the slot grid of the container [prefab] filling [used] slots: its columns and how many slots it has in
 * the game, and how many slots to draw, with rows added when the items need more slots than the game's grid has.
 */
export const containerGrid = (prefab: string, used: number): { columns: number; capacity: number; slots: number } => {
  const { columns, rows } = CONTAINER_SIZES[prefab] ?? DEFAULT_CONTAINER_SIZE;
  return { columns, capacity: rows * columns, slots: Math.max(rows, Math.ceil(used / columns)) * columns };
};

/**
 * Returns [items] as one entry per name, most first, with the name the game shows and the item whose icon to show:
 * the item itself, or for a tree or rock the item that stands for it, such as `Beech seeds` for a beech. Things
 * with the same name, such as the two birches, count together.
 */
export const itemSlots = (items: Record<string, number>): ItemSlot[] => {
  const slots = new Map<string, ItemSlot>();
  for (const [prefab, count] of Object.entries(items)) {
    const name = itemName(prefab);
    const slot = slots.get(name) ?? { prefab, name, iconItem: NATURE_THINGS[prefab]?.iconItem ?? name, count: 0 };
    slots.set(name, { ...slot, count: slot.count + count });
  }
  return [...slots.values()].sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
};

/**
 * Returns [items] as the game's slots, most first: each item split into full stacks of the most one slot holds in
 * [stacks], then the rest. An item missing from [stacks] takes one slot.
 */
export const stackSlots = (
  items: Record<string, number>,
  stacks: Record<string, number>,
): ItemSlot[] =>
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
