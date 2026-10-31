import { describe, expect, it } from 'vitest';

import { MS_PER_HOUR } from '#/lib/models';
import { playersOf, sessionEndMs } from '#/lib/players';
import { sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

describe('playersOf', () => {
  it('joins sessions with the same Steam ID into one player', () => {
    // GIVEN two sessions of one Steam account under different characters, and a Steam-less player
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [
        sessionWith({ steamId: 'Steam_1', steamName: 'Tony Example', character: 'Tony', endUtc: '2026-10-29T10:43:13.000Z', deaths: 1 }),
        sessionWith({ character: 'Astrid', peerId: '2' }),
        sessionWith({ steamId: 'Steam_1', character: 'wynnyarD', startUtc: '2026-10-29T11:00:00.000Z', deaths: 2 }),
      ],
    });

    // WHEN players are made at noon
    const players = playersOf(snapshot, TEST_NOON_MS);

    // THEN the Steam player has both sessions, the latest character and the summed numbers
    expect(players.map((player) => player.character)).toEqual(['wynnyarD', 'Astrid']);
    expect(players[0]).toMatchObject({
      steamName: 'Tony Example',
      color: 'var(--gold)',
      isOnline: true,
      sinceUtc: '2026-10-29T11:00:00.000Z',
      totalMs: 2 * MS_PER_HOUR,
      deaths: 3,
    });
  });

  it('adds what the plugin knows of all the player\'s characters', () => {
    // GIVEN one Steam account with two characters, their kills, areas and gear
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [
        sessionWith({ steamId: 'Steam_1', character: 'Tony', endUtc: '2026-10-29T10:43:13.000Z' }),
        sessionWith({ steamId: 'Steam_1', character: 'wynnyarD', startUtc: '2026-10-29T11:00:00.000Z' }),
      ],
      kills: { Tony: { Greydwarf: 3 }, wynnyarD: { Greydwarf: 1, Troll: 2 } },
      visitedAreas: { Tony: ['Meadows'], wynnyarD: ['Meadows', 'Swamp'] },
      currentAreas: { Tony: 'Meadows', wynnyarD: 'Swamp' },
      gear: { Tony: ['Club'], wynnyarD: ['AxeBronze', 'SwordIron quality 2'] },
    });

    // WHEN players are made at noon
    const [player] = playersOf(snapshot, TEST_NOON_MS);

    // THEN kills and areas cover both characters, and area and gear are the latest character's
    expect(player).toMatchObject({
      area: 'Swamp',
      kills: 6,
      topKill: 'Greydwarf',
      areas: ['Meadows', 'Swamp'],
      gear: ['SwordIron quality 2', 'AxeBronze'],
    });
  });

  it('shows nobody online once the log went quiet', () => {
    // GIVEN an open session but a last log line 20 minutes ago
    const snapshot = snapshotWith({ lastLineUtc: '2026-10-29T11:40:00.000Z', sessions: [sessionWith({})] });

    // WHEN players are made at noon
    const [player] = playersOf(snapshot, TEST_NOON_MS);

    // THEN the player is offline, last seen at the last log line, and the quiet time is not counted
    expect(player).toMatchObject({ isOnline: false, lastSeenUtc: '2026-10-29T11:40:00.000Z' });
    expect(sessionEndMs(snapshot.sessions[0]!, snapshot, TEST_NOON_MS)).toBe(Date.parse('2026-10-29T11:40:00.000Z'));
  });
});
