import { describe, expect, it } from 'vitest';

import { daySummary, storyOf } from '#/lib/story';
import { sessionWith, snapshotWith } from '#/lib/test-common';

describe('storyOf', () => {
  it('mixes joins, leaves and game events, newest first', () => {
    // GIVEN a session that timed out, a death and a raid
    const snapshot = snapshotWith({
      sessions: [sessionWith({ endUtc: '2026-10-29T11:00:00.000Z', endReason: 'timedOut' })],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar' },
        { type: 'raidStarted', timeUtc: '2026-10-29T10:20:00.000Z', raid: 'army_eikthyr' },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN every line reads plainly, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['left', 'Ragnar lost connection'],
      ['raid', 'A raid started: army eikthyr'],
      ['died', 'Ragnar died'],
      ['joined', 'Ragnar joined'],
    ]);
  });

  it('tells building in one line per stretch, naming the most common pieces', () => {
    // GIVEN Ragnar built five kinds of pieces, then one of his pieces and one of an unknown builder were destroyed
    const snapshot = snapshotWith({
      builds: [
        {
          builder: 'Ragnar',
          isDestroyed: false,
          startUtc: '2026-10-29T10:00:00.000Z',
          endUtc: '2026-10-29T10:05:00.000Z',
          pieces: { wood_fence: 8, wood_floor_1x1: 14, piece_groundtorch_wood: 3, stake_wall: 2, wood_stair: 1 },
        },
        {
          builder: 'Ragnar',
          isDestroyed: true,
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          pieces: { wood_fence: 1 },
        },
        {
          builder: null,
          isDestroyed: true,
          startUtc: '2026-10-29T10:07:00.000Z',
          endUtc: '2026-10-29T10:07:00.000Z',
          pieces: { stake_wall: 2 },
        },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each stretch reads plainly, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['wrecked', '2 pieces were destroyed: 2 stake wall'],
      ['wrecked', '1 piece Ragnar built was destroyed: 1 wood fence'],
      ['built', 'Ragnar built 28 pieces: 14 wood floor 1x1, 8 wood fence, 3 groundtorch wood and more'],
    ]);
  });
});

describe('daySummary', () => {
  it('counts players, deaths and raids in the last 24 hours only', () => {
    // GIVEN one player today, one two days ago, a death today and an old raid
    const snapshot = snapshotWith({
      sessions: [
        sessionWith({ steamId: 'Steam_1', endUtc: '2026-10-29T11:00:00.000Z' }),
        sessionWith({ character: 'Astrid', startUtc: '2026-10-27T09:00:00.000Z', endUtc: '2026-10-27T10:00:00.000Z' }),
      ],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar' },
        { type: 'raidStarted', timeUtc: '2026-10-27T09:30:00.000Z', raid: 'army_eikthyr' },
      ],
    });

    // WHEN the summary is made at noon
    const summary = daySummary(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only today counts
    expect(summary).toBe('1 player in the last 24 hours · 1 death · 0 raids');
  });

  it('adds the pieces built in the last 24 hours when there are any', () => {
    // GIVEN Ragnar played and built three pieces today, and a piece of his was destroyed
    const snapshot = snapshotWith({
      sessions: [sessionWith({ endUtc: '2026-10-29T11:00:00.000Z' })],
      builds: [
        {
          builder: 'Ragnar',
          isDestroyed: false,
          startUtc: '2026-10-29T10:00:00.000Z',
          endUtc: '2026-10-29T10:05:00.000Z',
          pieces: { wood_floor_1x1: 3 },
        },
        {
          builder: 'Ragnar',
          isDestroyed: true,
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          pieces: { wood_floor_1x1: 1 },
        },
      ],
    });

    // WHEN the summary is made at noon
    const summary = daySummary(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only built pieces count
    expect(summary).toBe('1 player in the last 24 hours · 0 deaths · 0 raids · 3 pieces built');
  });

  it('says when nobody played', () => {
    // GIVEN no sessions
    // WHEN / THEN the summary says so
    expect(daySummary(snapshotWith({}), 0)).toBe('Nobody played in the last 24 hours');
  });
});
