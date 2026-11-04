import { readFile, stat } from 'node:fs/promises';

import type { Vitals } from '#/lib/models';
import { PLAYER_VITALS_LINE_PATTERN } from '#/lib/server/models';

/**
 * Reads the plugin's player vitals file [text], one tab separated `Ragnar 45 110 60 0` line per player online,
 * into each character's numbers, all marked as written at [timeUtc].
 */
export const vitalsOf = (text: string, timeUtc: string): Record<string, Vitals> => {
  const vitals: Record<string, Vitals> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = PLAYER_VITALS_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      vitals[groups.character!] = {
        health: Number(groups.health),
        maxHealth: Number(groups.maxHealth),
        stamina: Number(groups.stamina),
        eitr: Number(groups.eitr),
        timeUtc,
      };
    }
  }
  return vitals;
};

/**
 * Reads the player vitals file at [path] when it changed after [changedMs]. Returns the numbers in it and the time
 * it changed, or null when it did not change.
 */
export const readVitals = async (
  path: string,
  changedMs: number | null,
): Promise<{ vitals: Record<string, Vitals>; changedMs: number } | null> => {
  const { mtimeMs } = await stat(path);
  if (mtimeMs === changedMs) {
    return null;
  }
  return { vitals: vitalsOf(await readFile(path, 'utf8'), new Date(mtimeMs).toISOString()), changedMs: mtimeMs };
};
