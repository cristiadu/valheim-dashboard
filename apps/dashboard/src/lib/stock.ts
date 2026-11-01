import { type Craftable, ITEM_NAMES, type Player, type Snapshot } from '#/lib/models';
import { RECIPES, recipeItems } from '#/lib/recipes';

/** Returns [name] with only its letters and digits, in lower case, for example `deerhide` for `Deer hide`. */
const plainName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Recipe item names by their plain name, for example `Deer hide` by `deerhide`. */
const RECIPE_ITEMS_BY_PLAIN_NAME = new Map(recipeItems().map((item) => [plainName(item), item]));

/** Returns the name recipes use for the game's item name [item], or [item] itself when no recipe uses it. */
export const recipeItemName = (item: string): string =>
  ITEM_NAMES[item] ?? RECIPE_ITEMS_BY_PLAIN_NAME.get(plainName(item)) ?? item;

/** Returns the names [player]'s chests can carry as their builder: each of their characters and their Steam name. */
export const builderNames = (player: Player): string[] => [
  ...new Set([...player.sessions.map((session) => session.character), ...(player.steamName === null ? [] : [player.steamName])]),
];

/**
 * Returns how many of each item the chests, carts and ships in [snapshot] hold together, by recipe item name.
 * With [builders], only the ones those names built count.
 */
export const chestStock = (snapshot: Snapshot, builders: string[] | null): Record<string, number> => {
  const stock: Record<string, number> = {};
  for (const chest of Object.values(snapshot.chests)) {
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

/** Returns every recipe [stock] has enough for at least once, with how many times, in recipe list order. */
export const craftables = (stock: Record<string, number>): Craftable[] =>
  RECIPES.map((recipe) => ({
    recipe,
    times: Math.min(...recipe.ingredients.map(({ item, amount }) => Math.floor((stock[item] ?? 0) / amount))),
  })).filter((craftable) => craftable.times > 0);
