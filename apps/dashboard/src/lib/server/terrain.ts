import { readFile } from 'node:fs/promises';

import { TERRAIN_HEADER_PATTERN, type Terrain } from '#/lib/server/models';

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
