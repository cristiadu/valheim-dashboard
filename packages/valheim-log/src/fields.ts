import { HELD_ITEM_PATTERN, NOTHING_HELD, UNKNOWN_PLAYER } from '#/patterns';

/** Reads an optional number group, or null when it did not match. */
export const optionalNumber = (value: string | undefined): number | null => (value === undefined ? null : Number(value));

/** Reads a held items list, such as `Wood x20, Stone x3` or `nothing`, into counts by item name. */
export const heldItemsOf = (text: string): Record<string, number> => {
  const items: Record<string, number> = {};
  if (text === NOTHING_HELD) {
    return items;
  }
  for (const entry of text.split(', ')) {
    const groups = HELD_ITEM_PATTERN.exec(entry)?.groups;
    if (groups !== undefined) {
      items[groups.item!] = (items[groups.item!] ?? 0) + Number(groups.count);
    }
  }
  return items;
};

/** Reads a player from the event log plugin, or null when the plugin did not know who it was. */
export const playerOf = (player: string | undefined): string | null => (player === UNKNOWN_PLAYER ? null : player!);
