import { describe, expect, it } from 'vitest';

import { playerDays, worldFacts } from '#/lib/hall';
import type { ActivityRecord, ActivityKind } from '#/lib/models/activities';
import { MS_PER_HOUR } from '#/lib/models/time';
import { playersOf } from '#/lib/players';
import { NO_LINES, sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

/** Returns one stretch of [kind] by [player] that ended at [endUtc], with [things]. */
const activityOf = (player: string, kind: ActivityKind, endUtc: string, things: Record<string, number>): ActivityRecord => ({
  player,
  kind,
  startUtc: endUtc,
  endUtc,
  things,
  source: NO_LINES,
});

describe('worldFacts', () => {
  it('counts the day, defeated bosses, players, found areas and walked land', () => {
    // GIVEN two players who found three areas between them and walked three squares, and one defeated boss
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      day: 12,
      defeatedBosses: ['Eikthyr'],
      sessions: [sessionWith({}), sessionWith({ character: 'Astrid', peerId: '2' })],
      visitedAreas: { Ragnar: ['Meadows', 'BlackForest'], Astrid: ['Meadows', 'Swamp'] },
      explored: { Ragnar: ['0,0', '0,1'], Astrid: ['0,1', '1,1'] },
    });

    // WHEN the facts are made
    const facts = worldFacts(snapshot, playersOf(snapshot, TEST_NOON_MS));

    // THEN each fact counts the whole world once
    expect(facts.map(({ label, value }) => [label, value])).toEqual([
      ['In-game day', '12'],
      ['Bosses defeated', '1 · Eikthyr'],
      ['Vikings so far', '2'],
      ['Areas found', '3'],
      ['Land explored', '0.00 km²'],
    ]);
  });

  it('says no boss is defeated yet and shows a dash before the plugin logged a day', () => {
    // GIVEN a world with no day and no defeated boss
    const snapshot = snapshotWith({ lastLineUtc: '2026-10-29T11:59:00.000Z' });

    // WHEN the facts are made
    const facts = worldFacts(snapshot, []);

    // THEN the day is a dash and bosses say none yet
    expect(facts[0].value).toBe('–');
    expect(facts[1].value).toBe('None yet');
  });
});

describe('playerDays', () => {
  it('sums the last 24 hours of each player and keeps the most done activities', () => {
    // GIVEN Ragnar online for 2 hours today, with a death, kills, activities and an old stretch from 2 days ago
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [sessionWith({ startUtc: '2026-10-29T10:00:00.000Z' })],
      events: [
        { type: 'playerDied', character: 'Ragnar', timeUtc: '2026-10-29T11:00:00.000Z', line: 'Ragnar died' },
        { type: 'playerDied', character: 'Ragnar', timeUtc: '2026-10-27T11:00:00.000Z', line: 'Ragnar died before' },
      ],
      activities: [
        activityOf('Ragnar', 'killed', '2026-10-29T11:10:00.000Z', { Greydwarf: 2, Troll: 1 }),
        activityOf('Ragnar', 'built', '2026-10-29T11:20:00.000Z', { wood_floor: 40 }),
        activityOf('Ragnar', 'built', '2026-10-27T11:20:00.000Z', { wood_floor: 99 }),
        activityOf('Ragnar', 'gathered', '2026-10-29T11:30:00.000Z', { Wood: 30 }),
        activityOf('Ragnar', 'mined', '2026-10-29T11:31:00.000Z', { rock: 5 }),
        activityOf('Ragnar', 'cut', '2026-10-29T11:32:00.000Z', { Beech: 3 }),
        activityOf('Ragnar', 'ate', '2026-10-29T11:33:00.000Z', { Raspberry: 1 }),
      ],
    });

    // WHEN the days are made at noon
    const [day] = playerDays(snapshot, playersOf(snapshot, TEST_NOON_MS), TEST_NOON_MS);

    // THEN time online is 2 hours and the numbers count only today, with the 4 most done activities
    expect(day.playedMs).toBe(2 * MS_PER_HOUR);
    expect(day.stats.map(({ label, value }) => [label, value])).toEqual([
      ['Deaths', '1'],
      ['Kills', '3'],
      ['Pieces built', '40'],
      ['Items gathered', '30'],
      ['Rocks mined', '5'],
      ['Trees cut', '3'],
    ]);
    expect(day.stats[0].source?.lines).toEqual([{ timeUtc: '2026-10-29T11:00:00.000Z', line: 'Ragnar died', kind: 'died' }]);
  });

  it('leaves out players who did not come and puts the longest online first', () => {
    // GIVEN Astrid online for 1 hour today, Ragnar for 2 hours, and Bjorn last seen 3 days ago
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [
        sessionWith({ character: 'Bjorn', peerId: '3', startUtc: '2026-10-26T10:00:00.000Z', endUtc: '2026-10-26T11:00:00.000Z' }),
        sessionWith({ character: 'Astrid', peerId: '2', startUtc: '2026-10-29T11:00:00.000Z' }),
        sessionWith({ startUtc: '2026-10-29T10:00:00.000Z' }),
      ],
    });

    // WHEN the days are made at noon
    const days = playerDays(snapshot, playersOf(snapshot, TEST_NOON_MS), TEST_NOON_MS);

    // THEN only Ragnar and Astrid are there, Ragnar first
    expect(days.map((day) => day.player.character)).toEqual(['Ragnar', 'Astrid']);
  });

  it('counts activities the plugin logged under the Steam name', () => {
    // GIVEN Tony's character wynnyarD online today and a building stretch logged under the Steam name
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [sessionWith({ character: 'wynnyarD', steamId: 'Steam_1', steamName: 'Tony Example', startUtc: '2026-10-29T11:00:00.000Z' })],
      activities: [activityOf('Tony Example', 'built', '2026-10-29T11:20:00.000Z', { wood_wall: 7 })],
    });

    // WHEN the days are made at noon
    const [day] = playerDays(snapshot, playersOf(snapshot, TEST_NOON_MS), TEST_NOON_MS);

    // THEN the building counts for wynnyarD
    expect(day.stats.map(({ label, value }) => [label, value])).toContainEqual(['Pieces built', '7']);
  });
});
