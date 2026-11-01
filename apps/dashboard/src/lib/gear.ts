import { GEAR_NAMES, GEAR_QUALITY_PATTERN, GEAR_SLOT_PATTERNS, type GearPiece, type GearSheet } from '#/lib/models';
import { recipeItems } from '#/lib/recipes';
import { capitalized, thingName } from '#/lib/story';

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
 * Lays out [gear], newest first, as a character sheet. The newest piece of each slot is worn and the rest is
 * carried. An upgraded piece shows once, at its newest level.
 */
export const gearSheet = (gear: string[]): GearSheet => {
  const sheet: GearSheet = { worn: {}, carried: [] };
  const seenPrefabs = new Set<string>();
  for (const piece of gear.map(gearPiece)) {
    if (seenPrefabs.has(piece.prefab)) {
      continue;
    }
    seenPrefabs.add(piece.prefab);
    if (piece.place !== 'carried' && sheet.worn[piece.place] === undefined) {
      sheet.worn[piece.place] = piece;
    } else {
      sheet.carried.push(piece);
    }
  }
  return sheet;
};

/** Returns every item the dashboard shows an icon for: recipe items and known gear, once each. */
export const iconItems = (): string[] => [...new Set([...recipeItems(), ...Object.values(GEAR_NAMES)])];

/** Name of [piece] with its level when upgraded, for example `Flint spear, level 4`. */
export const gearLabel = (piece: GearPiece): string => (piece.quality > 1 ? `${piece.name}, level ${piece.quality}` : piece.name);
