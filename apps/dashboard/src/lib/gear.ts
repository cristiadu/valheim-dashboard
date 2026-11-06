import { GEAR_NAMES, GEAR_QUALITY_PATTERN, GEAR_SLOT_PATTERNS, type GearPiece, type GearSheet, ITEM_NAMES } from '#/lib/models';
import { recipeItems } from '#/lib/recipes';
import { capitalized, thingName } from '#/lib/story';

/** Returns how the snapshot keeps a piece of gear: [item] alone at level 1, else with its level, for example `SpearFlint quality 4`. */
export const gearEntryOf = (item: string, quality: number): string => (quality > 1 ? `${item} quality ${quality}` : item);

/** Reads one piece of gear the snapshot keeps, for example `SpearFlint quality 4`. */
export const gearPiece = (entry: string): GearPiece => {
  const match = GEAR_QUALITY_PATTERN.exec(entry);
  const prefab = match === null ? entry : entry.slice(0, match.index);
  const slot = GEAR_SLOT_PATTERNS.find(([pattern]) => pattern.test(prefab))?.[1];
  return {
    prefab,
    name: GEAR_NAMES[prefab] ?? capitalized(thingName(prefab)),
    quality: match === null ? 1 : Number(match[1]),
    place: slot ?? 'carried',
  };
};

/**
 * Lays out what a character wears now as a character sheet. [worn] are the prefabs the plugin logged them wearing and
 * holding now, each at its newest level in [gear], which is newest first. Pieces with no free slot are held. Before the
 * plugin logged [worn], the newest piece of each slot in [gear] stands in for it.
 */
export const gearSheet = (gear: string[], worn: string[] | null): GearSheet => {
  const sheet: GearSheet = { worn: {}, held: [] };
  const newestPieces = new Map<string, GearPiece>();
  for (const piece of gear.map(gearPiece)) {
    if (!newestPieces.has(piece.prefab)) {
      newestPieces.set(piece.prefab, piece);
    }
  }
  const pieces = worn === null ? [...newestPieces.values()] : worn.map((prefab) => newestPieces.get(prefab) ?? gearPiece(prefab));
  for (const piece of pieces) {
    if (piece.place !== 'carried' && sheet.worn[piece.place] === undefined) {
      sheet.worn[piece.place] = piece;
    } else if (worn !== null) {
      sheet.held.push(piece);
    }
  }
  return sheet;
};

/** Returns every item the dashboard shows an icon for: recipe items, known gear and other known items, once each. */
export const iconItems = (): string[] => [
  ...new Set([...recipeItems(), ...Object.values(GEAR_NAMES), ...Object.values(ITEM_NAMES)]),
];

/** Name of [piece] with its level when upgraded, for example `Flint spear, level 4`. */
export const gearLabel = (piece: GearPiece): string => (piece.quality > 1 ? `${piece.name}, level ${piece.quality}` : piece.name);
