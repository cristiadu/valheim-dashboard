import { describe, expect, it } from 'vitest';

import { playersOf } from '#/lib/players';
import { playerSource, sourceKey } from '#/lib/sources';
import { sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

describe('sourceKey', () => {
  it('names the lines by kind, character and thing', () => {
    // WHEN / THEN
    expect(sourceKey('deaths', 'Ragnar')).toBe('deaths:Ragnar');
    expect(sourceKey('killed', 'Ragnar', 'Troll')).toBe('killed:Ragnar:Troll');
  });
});

describe('playerSource', () => {
  /** One Steam player with two characters, Ragnar first and Ragnhild now, each with a death line. */
  const snapshot = snapshotWith({
    sessions: [
      sessionWith({ character: 'Ragnar', steamId: 'Steam_1', startUtc: '2026-10-29T09:00:00.000Z', endUtc: '2026-10-29T10:00:00.000Z' }),
      sessionWith({ character: 'Ragnhild', steamId: 'Steam_1', startUtc: '2026-10-29T11:00:00.000Z' }),
    ],
    sources: {
      'deaths:Ragnhild': { total: 1, lines: [{ timeUtc: '2026-10-29T11:30:00.000Z', line: 'Ragnhild death' }] },
      'deaths:Ragnar': { total: 3, lines: [{ timeUtc: '2026-10-29T09:30:00.000Z', line: 'Ragnar death' }] },
      'gear:Ragnar:Club': { total: 1, lines: [{ timeUtc: '2026-10-29T09:10:00.000Z', line: 'Ragnar club' }] },
    },
  });
  const [player] = playersOf(snapshot, TEST_NOON_MS);

  it('merges the lines of every character, oldest first, and adds up the totals', () => {
    // WHEN
    const source = playerSource(snapshot, player!, 'deaths');

    // THEN
    expect(source).toEqual({
      total: 4,
      lines: [
        { timeUtc: '2026-10-29T09:30:00.000Z', line: 'Ragnar death' },
        { timeUtc: '2026-10-29T11:30:00.000Z', line: 'Ragnhild death' },
      ],
    });
  });

  it('reads gear of the latest character only, as the card shows it', () => {
    // WHEN / THEN the old character's club is not the new one's
    expect(playerSource(snapshot, player!, 'gear', 'Club')).toEqual({ total: 0, lines: [] });
  });
});
