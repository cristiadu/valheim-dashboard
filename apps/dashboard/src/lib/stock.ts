import { itemName } from '#/lib/items';
import { foundChests } from '#/lib/map';
import type { Player } from '#/lib/models/players';
import type { MapChest } from '#/lib/models/map';
import type { Craftable, ItemPlace } from '#/lib/models/recipes';
import type { Snapshot } from '#/lib/models/snapshot';
import { RECIPES, recipeItems } from '#/lib/recipes';

/** Returns [name] with only its letters and digits, in lower case, for example `deerhide` for `Deer hide`. */
const plainName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Recipe item names by their plain name, for example `Deer hide` by `deerhide`. */
const RECIPE_ITEMS_BY_PLAIN_NAME = new Map(recipeItems().map((item) => [plainName(item), item]));

/** Returns the name recipes use for the item prefab [item], or the game's name for it when no recipe uses it. */
export const recipeItemName = (item: string): string =>
  RECIPE_ITEMS_BY_PLAIN_NAME.get(plainName(itemName(item))) ?? itemName(item);

/** Returns the names [player]'s chests can carry as their builder: each of their characters and their Steam name. */
export const builderNames = (player: Player): string[] => [
  ...new Set([...player.sessions.map((session) => session.character), ...(player.steamName === null ? [] : [player.steamName])]),
];

/**
 * Returns how many of each item the chests, carts and ships players found in [snapshot] hold together, by recipe
 * item name. With [builders], only the ones those names built count.
 */
export const chestStock = (snapshot: Snapshot, builders: string[] | null): Record<string, number> => {
  const stock: Record<string, number> = {};
  for (const [, chest] of foundChests(snapshot)) {
    if (builders !== null && (chest.builder === null || !builders.includes(chest.builder))) {
      continue;
    }
    for (const [item, amount] of Object.entries(chest.items)) {
      const name = recipeItemName(item);
      stock[name] = (stock[name] ?? 0) + amount;
    }
  }
  return stock;
};

/** Returns how many of each item [bag] holds, by recipe item name, for a bag kept by item prefab. */
export const bagStock = (bag: Record<string, number>): Record<string, number> => {
  const stock: Record<string, number> = {};
  for (const [item, amount] of Object.entries(bag)) {
    const name = recipeItemName(item);
    stock[name] = (stock[name] ?? 0) + amount;
  }
  return stock;
};

/**
 * Returns where each item sits, by recipe item name: every chest of [chests] and every bag of [bags] that holds
 * some, most first, with a bag before a chest holding as many.
 */
export const itemPlacesOf = (chests: MapChest[], bags: Record<string, Record<string, number>>): Record<string, ItemPlace[]> => {
  const places: Record<string, ItemPlace[]> = {};
  const bagPlaces = Object.entries(bags).flatMap(([character, bag]) =>
    Object.entries(bagStock(bag)).map(([item, count]) => ({ item, place: { kind: 'bag' as const, character, count } })),
  );
  const chestPlaces = chests.flatMap((chest) =>
    Object.entries(bagStock(chest.record.items)).map(([item, count]) => ({ item, place: { kind: 'chest' as const, chest, count } })),
  );
  for (const { item, place } of [...bagPlaces, ...chestPlaces]) {
    places[item] = [...(places[item] ?? []), place];
  }
  for (const item of Object.keys(places)) {
    places[item] = places[item]!.toSorted((first, second) => second.count - first.count);
  }
  return places;
};

/** Returns every recipe [stock] has enough for at least once, with how many times, in recipe list order. */
export const craftables = (stock: Record<string, number>): Craftable[] =>
  RECIPES.map((recipe) => ({
    recipe,
    times: Math.min(...recipe.ingredients.map(({ item, amount }) => Math.floor((stock[item] ?? 0) / amount))),
  })).filter((craftable) => craftable.times > 0);
