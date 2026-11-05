import { readFile } from 'node:fs/promises';

import { heldItemsOf } from 'valheim-log';

import {
  CRAFT_COST_LINE_PATTERN,
  type CraftCost,
  ITEM_STACK_LINE_PATTERN,
  PIECE_COST_LINE_PATTERN,
} from '#/lib/server/models';

/** Reads the plugin's item stacks file [text], one `Wood 50` line per item, into the most of each item one slot holds. */
export const itemStacksOf = (text: string): Record<string, number> => {
  const stacks: Record<string, number> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = ITEM_STACK_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      stacks[groups.item!] = Number(groups.stack);
    }
  }
  return stacks;
};

/** Reads the plugin's piece costs file [text], one `wood_floor Wood x2` line per piece, into what each piece takes. */
export const pieceCostsOf = (text: string): Record<string, Record<string, number>> => {
  const costs: Record<string, Record<string, number>> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = PIECE_COST_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      costs[groups.piece!] = heldItemsOf(groups.items!);
    }
  }
  return costs;
};

/**
 * Reads the plugin's craft costs file [text], one `ArrowWood 1 20 Wood x8` line per item and level, into what each
 * craft makes and takes. When two recipes make the same item at the same level, the first one is kept.
 */
export const craftCostsOf = (text: string): Record<string, Record<number, CraftCost>> => {
  const costs: Record<string, Record<number, CraftCost>> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = CRAFT_COST_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      const levels = (costs[groups.item!] ??= {});
      levels[Number(groups.level)] ??= { yields: Number(groups.yields), items: heldItemsOf(groups.items!) };
    }
  }
  return costs;
};

/** Reads the item stacks file at [path]. */
export const readItemStacks = async (path: string): Promise<Record<string, number>> => itemStacksOf(await readFile(path, 'utf8'));

/** Reads the piece costs file at [path]. */
export const readPieceCosts = async (path: string): Promise<Record<string, Record<string, number>>> =>
  pieceCostsOf(await readFile(path, 'utf8'));

/** Reads the craft costs file at [path]. */
export const readCraftCosts = async (path: string): Promise<Record<string, Record<number, CraftCost>>> =>
  craftCostsOf(await readFile(path, 'utf8'));
