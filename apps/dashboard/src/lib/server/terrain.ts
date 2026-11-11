import { readFile } from 'node:fs/promises';

import { squareOf } from '#/lib/map';
import type { Snapshot } from '#/lib/models/snapshot';
import { type ServerState, TERRAIN_HEADER_PATTERN, type Terrain } from '#/lib/server/models';

/** Reads the plugin's terrain file [text]: a header with the westmost square, then one row of letters per line. */
export const terrainOf = (text: string): Terrain => {
  const [header, ...rows] = text.split(/\r?\n/);
  const groups = TERRAIN_HEADER_PATTERN.exec(header ?? '')?.groups;
  if (groups === undefined) {
    throw new Error(`The terrain file starts with "${header}", not "squareMeters <meters> first <square>".`);
  }
  return { first: Number(groups.first), rows: rows.filter((row) => row.length > 0) };
};

/** Reads the terrain file at [path]. */
export const readTerrain = async (path: string): Promise<Terrain> => terrainOf(await readFile(path, 'utf8'));

/** Returns the terrain letter of the square with [key], such as `3,-11`, or null when [terrain] has none there. */
const terrainLetter = (terrain: Terrain, key: string): string | null => {
  const [column, row] = squareOf(key);
  const letter = terrain.rows[-terrain.first - 1 - row]?.[column - terrain.first];
  return letter === undefined ? null : letter;
};

/** Adds the terrain letter of the explored square [key] to [snapshot], when [terrain] is known and has one. */
export const addTerrainOf = (snapshot: Snapshot, terrain: Terrain | null, key: string): void => {
  const letter = terrain === null ? null : terrainLetter(terrain, key);
  if (letter !== null) {
    snapshot.terrain[key] = letter;
  }
};

/** Keeps [terrain] in [state] and adds its letter for every square explored so far. */
export const setTerrain = (state: ServerState, terrain: Terrain): void => {
  state.terrain = terrain;
  for (const key of new Set(Object.values(state.snapshot.explored).flat())) {
    addTerrainOf(state.snapshot, terrain, key);
  }
};
