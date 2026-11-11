import { readFile } from 'node:fs/promises';

import { heldItemsOf } from 'valheim-log';

import {
  CRAFT_COST_LINE_PATTERN,
  type CraftCost,
  FIRE_FUEL_LINE_PATTERN,
  FOOD_LINE_PATTERN,
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

/** Reads the plugin's foods file [text], one `CookedMeat` line per food, into every food. */
export const foodsOf = (text: string): Set<string> => {
  const foods = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const groups = FOOD_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      foods.add(groups.item!);
    }
  }
  return foods;
};

/** Reads the plugin's fire fuels file [text], one `piece_groundtorch_wood Resin` line per fire, into what each fire burns. */
export const fireFuelsOf = (text: string): Record<string, string> => {
  const fuels: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = FIRE_FUEL_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      fuels[groups.fire!] = groups.item!;
    }
  }
  return fuels;
};

/** Reads the item stacks file at [path]. */
export const readItemStacks = async (path: string): Promise<Record<string, number>> => itemStacksOf(await readFile(path, 'utf8'));

/** Reads the piece costs file at [path]. */
export const readPieceCosts = async (path: string): Promise<Record<string, Record<string, number>>> =>
  pieceCostsOf(await readFile(path, 'utf8'));

/** Reads the craft costs file at [path]. */
export const readCraftCosts = async (path: string): Promise<Record<string, Record<number, CraftCost>>> =>
  craftCostsOf(await readFile(path, 'utf8'));

/** Reads the foods file at [path]. */
export const readFoods = async (path: string): Promise<Set<string>> => foodsOf(await readFile(path, 'utf8'));

/** Reads the fire fuels file at [path]. */
export const readFireFuels = async (path: string): Promise<Record<string, string>> => fireFuelsOf(await readFile(path, 'utf8'));
