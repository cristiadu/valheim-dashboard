import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readVitals, vitalsOf } from '#/lib/server/player-vitals';

describe('vitalsOf', () => {
  it('reads each character, names with spaces too, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN a vitals file with two players, a blank line and a broken line
    const text = 'Ragnar\t45\t110\t60\t0\r\nInge Dragonchow\t25\t25\t50\t12\r\n\r\nbroken line\r\n';

    // WHEN it is read
    const vitals = vitalsOf(text, '2026-11-04T22:00:00.000Z');

    // THEN both players have their numbers
    expect(vitals).toEqual({
      Ragnar: { health: 45, maxHealth: 110, stamina: 60, eitr: 0, timeUtc: '2026-11-04T22:00:00.000Z' },
      'Inge Dragonchow': { health: 25, maxHealth: 25, stamina: 50, eitr: 12, timeUtc: '2026-11-04T22:00:00.000Z' },
    });
  });
});

describe('readVitals', () => {
  /** Folder holding the vitals file for these tests. */
  let folder: string;

  /** Path of the vitals file. */
  let path: string;

  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'vitals-'));
    path = join(folder, 'player-vitals.txt');
    await writeFile(path, 'Ragnar\t45\t110\t60\t0\n');
    await utimes(path, new Date('2026-11-04T22:00:00.000Z'), new Date('2026-11-04T22:00:00.000Z'));
  });

  afterAll(async () => {
    await rm(folder, { recursive: true });
  });

  it('reads the file with the time it changed', async () => {
    // GIVEN a vitals file that was never read

    // WHEN it is read
    const read = await readVitals(path, null);

    // THEN it has the player and the time the file changed
    expect(read).toEqual({
      vitals: { Ragnar: { health: 45, maxHealth: 110, stamina: 60, eitr: 0, timeUtc: '2026-11-04T22:00:00.000Z' } },
      changedMs: 1793829600000,
    });
  });

  it('reads nothing when the file did not change since the last read', async () => {
    // GIVEN a vitals file read at its current change time

    // WHEN it is read again with that time
    const read = await readVitals(path, 1793829600000);

    // THEN nothing is read
    expect(read).toBeNull();
  });
});
