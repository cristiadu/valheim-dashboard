import { describe, expect, it } from 'vitest';

import { seenBosses } from '#/lib/bosses';
import { snapshotWith } from '#/lib/test-common';

describe('seenBosses', () => {
  it('lists only bosses someone defeated or summoned, in game order', () => {
    // GIVEN Eikthyr defeated and Bonemass summoned, with the other bosses never met
    const snapshot = snapshotWith({
      defeatedBosses: ['Eikthyr'],
      events: [{ type: 'bossSummoned', boss: 'Bonemass', summoner: 'Ragnar', timeUtc: '2026-10-29T12:00:00.000Z', line: 'test line' }],
    });

    // WHEN / THEN only those two show, and The Elder stays hidden
    expect(seenBosses(snapshot)).toEqual(['Eikthyr', 'Bonemass']);
  });

  it('shows nothing before anyone meets a boss', () => {
    // GIVEN a world where nobody met a boss
    // WHEN / THEN no boss is listed
    expect(seenBosses(snapshotWith({}))).toEqual([]);
  });
});
