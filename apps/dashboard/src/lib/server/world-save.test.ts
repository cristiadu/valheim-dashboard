import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { worldSaveWith } from '#/lib/test-common';
import { globalKeysOf, readSavedGlobalKeys } from '#/lib/server/world-save';

describe('globalKeysOf', () => {
  it('reads every global key from a world save', () => {
    // GIVEN a save that knows Eikthyr is dead, a troll was killed and no boss is active
    const save = worldSaveWith(['activebosses 0', 'defeated_eikthyr', 'killedtroll']);

    // WHEN its keys are read
    const keys = globalKeysOf(save);

    // THEN all three come back as the game wrote them
    expect(keys).toEqual(['activebosses 0', 'defeated_eikthyr', 'killedtroll']);
  });

  it('reads a save with no global keys', () => {
    // GIVEN a fresh world's save
    const save = worldSaveWith([]);

    // WHEN / THEN it has no keys
    expect(globalKeysOf(save)).toEqual([]);
  });

  it('reads a key whose length takes two bytes', () => {
    // GIVEN a 130-letter key before a boss key, so the first length is written as two bytes
    const save = worldSaveWith(['k'.repeat(130), 'defeated_gdking']);

    // WHEN its keys are read
    const keys = globalKeysOf(save);

    // THEN both keys are whole
    expect(keys).toEqual(['k'.repeat(130), 'defeated_gdking']);
  });
});

describe('readSavedGlobalKeys', () => {
  let worldFolder: string;

  beforeEach(async () => {
    worldFolder = await mkdtemp(join(tmpdir(), 'world-save-'));
  });

  afterEach(async () => {
    await rm(worldFolder, { recursive: true, force: true });
  });

  it('reads the save with the highest save number', async () => {
    // GIVEN an older save from before Eikthyr died, the newest one after, and the files the game keeps beside them
    await writeFile(join(worldFolder, '_main.999.db2'), worldSaveWith([]));
    await writeFile(join(worldFolder, '_main.1561.db2'), worldSaveWith(['defeated_eikthyr']));
    await writeFile(join(worldFolder, '_main.1561.fwl2'), 'world settings');
    await writeFile(join(worldFolder, '1e_1e__1_332.chunk'), 'objects');

    // WHEN the keys are read
    const keys = await readSavedGlobalKeys(worldFolder);

    // THEN they come from save 1561
    expect(keys).toEqual(['defeated_eikthyr']);
  });

  it('has no keys when the world was never saved', async () => {
    // GIVEN a world folder without a save
    // WHEN / THEN there are no keys
    expect(await readSavedGlobalKeys(worldFolder)).toEqual([]);
  });
});
