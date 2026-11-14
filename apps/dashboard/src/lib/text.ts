import { AREA_NAMES, NATURE_NAMES } from '#/lib/models/world';

/** English name the game shows for each item, piece, creature and raid, set from the snapshot's game names. */
const gameNames: Record<string, string> = {};

/** Uses [names] from the plugin's game names file for every name the page shows. */
export const setGameNames = (names: Record<string, string>): void => {
  Object.assign(gameNames, names);
};

/** Returns the English name the game shows for [id], such as `Iron atgeir` for `AtgeirIron`, or undefined when the game names file has none. */
export const gameName = (id: string): string | undefined => gameNames[id];

/** Returns `1 death` or `2 deaths` style text. */
export const count = (amount: number, one: string, many: string): string => `${amount} ${amount === 1 ? one : many}`;

/**
 * Readable name of a prefab, for example `greydwarf brute` for `Greydwarf_Elite`: the game's name when the game names
 * file has one, the name of a tree or rock such as `beech` for `Beech1`, or else the prefab split into words, such
 * as `wood floor 1x1`.
 */
export const thingName = (prefab: string): string =>
  (
    gameNames[prefab] ??
    NATURE_NAMES[prefab] ??
    prefab
      .replace(/^(piece|Pickable)_/, '')
      .replaceAll('_', ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
  ).toLowerCase();

/** What the game says when the raid [raid] starts, such as `The ground is shaking` for `army_theelder`. */
export const raidName = (raid: string): string => gameNames[raid] ?? raid.replaceAll('_', ' ');

/** [text] with its first letter in capitals. */
export const capitalized = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** Name of an area the plugin logs as it reads in a sentence, for example `the Black Forest` for `BlackForest`. */
export const areaName = (area: string): string => AREA_NAMES[area] ?? area;

/** Short name of an area the plugin logs, for example `Black Forest` for `BlackForest`. */
export const areaLabel = (area: string): string => capitalized(areaName(area).replace(/^(the|a) /, ''));

/** [name] with `a` or `an` before it, for example `a troll` or `an abomination`. */
export const withArticle = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/** Joins [names] as `a, b and c`. */
export const listText = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/**
 * Every thing of [things], most first, for example `14 wood floor 1x1, 8 wood fence, 1 workbench`. Things with the
 * same name, such as the two birches, count together.
 */
export const thingList = (things: Record<string, number>): string => {
  const amounts = new Map<string, number>();
  for (const [thing, amount] of Object.entries(things)) {
    const name = thingName(thing);
    amounts.set(name, (amounts.get(name) ?? 0) + amount);
  }
  return [...amounts]
    .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
    .map(([name, amount]) => `${amount} ${name}`)
    .join(', ');
};
