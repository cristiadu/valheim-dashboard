import { readFile } from 'node:fs/promises';

import { heldItemsOf } from 'valheim-log';

import {
  CRAFT_COST_LINE_PATTERN,
  type CraftCost,
  ITEM_STACK_LINE_PATTERN,
  PIECE_COST_LINE_PATTERN,
} from '#/lib/server/models';
import { matchingLines } from '#/lib/server/text-files';

/** Reads the plugin's item stacks file [text], one `Wood 50` line per item, into the most of each item one slot holds. */
export const itemStacksOf = (text: string): Record<string, number> =>
  Object.fromEntries(matchingLines(text, ITEM_STACK_LINE_PATTERN).map(({ item, stack }) => [item!, Number(stack)]));

/** Reads the plugin's piece costs file [text], one `wood_floor Wood x2` line per piece, into what each piece takes. */
export const pieceCostsOf = (text: string): Record<string, Record<string, number>> =>
  Object.fromEntries(matchingLines(text, PIECE_COST_LINE_PATTERN).map(({ piece, items }) => [piece!, heldItemsOf(items!)]));

/**
 * Reads the plugin's craft costs file [text], one `ArrowWood 1 20 Wood x8` line per item and level, into what each
 * craft makes and takes. When two recipes make the same item at the same level, the first one is kept.
 */
export const craftCostsOf = (text: string): Record<string, Record<number, CraftCost>> => {
  const costs: Record<string, Record<number, CraftCost>> = {};
  for (const { item, level, yields, items } of matchingLines(text, CRAFT_COST_LINE_PATTERN)) {
    (costs[item!] ??= {})[Number(level)] ??= { yields: Number(yields), items: heldItemsOf(items!) };
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
