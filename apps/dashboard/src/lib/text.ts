import { AREA_NAMES } from '#/lib/models/world';

/** Returns `1 death` or `2 deaths` style text. */
export const count = (amount: number, one: string, many: string): string => `${amount} ${amount === 1 ? one : many}`;

/** Readable name of a prefab, for example `wood floor 1x1`, `sword iron`, `turnip` or `greydwarf elite`. */
export const thingName = (prefab: string): string =>
  prefab
    .replace(/^(piece|Pickable)_/, '')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

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

/** Every thing of [things], most first, for example `14 wood floor 1x1, 8 wood fence, 1 workbench`. */
export const thingList = (things: Record<string, number>): string =>
  Object.entries(things)
    .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
    .map(([thing, amount]) => `${amount} ${thingName(thing)}`)
    .join(', ');
